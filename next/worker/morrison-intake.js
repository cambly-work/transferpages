// Morrison Premium Transfer — booking intake Worker.
// Receives brief submissions from the website (POST JSON), validates them,
// forwards to a Telegram dispatcher chat + sends a confirmation email
// to the client and a copy to ops@. Returns 200 with a confirmation id.
//
// Deploy:
//   1. Cloudflare → Workers & Pages → Create → from this file
//      (or `wrangler deploy morrison-intake.js`)
//   2. Settings → Variables → add the secrets listed in REQUIRED_ENV.
//   3. Copy the worker URL into site.yml → forms.endpoint.
//   4. Test from the site: send a brief, watch the Telegram channel.
//
// REQUIRED_ENV (set in Worker → Settings → Variables → Secrets):
//   TELEGRAM_BOT_TOKEN     — bot token from @BotFather
//   TELEGRAM_CHAT_ID       — dispatcher group/channel id (e.g. -1001234567890)
//   RESEND_API_KEY         — Resend.com API key (free tier 100/day) OR
//   BREVO_API_KEY          — Brevo (Sendinblue) API key as fallback
//   MORRISON_OPS_EMAIL     — internal copy address (e.g. ops@morrison-transfer.com)
//   ALLOWED_ORIGINS        — comma-separated, e.g. "https://morrison-transfer.com,https://cambly-work.github.io"
//
// The worker is intentionally minimal: no DB, no auth. If a submission fails
// to deliver to Telegram or email, it still returns 200 with `degraded: true`
// so the client UI shows confirmation — the site's localStorage offline
// queue would re-try, but if we got the payload at all, we own resolution.
// Tim is on call; the site form still falls back to mailto if the Worker is
// unreachable entirely.

const REQUIRED_ENV = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'ALLOWED_ORIGINS'];

const json = (status, body, origin) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin || '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'cache-control': 'no-store',
  },
});

const allowOrigin = (env, request) => {
  const origin = request.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.length) return origin || '*';
  return allowed.includes(origin) ? origin : allowed[0];
};

const sendTelegram = async (env, payload) => {
  const lines = [
    `*Morrison · ${payload.type === 'brief' ? 'NEW BRIEF' : 'newsletter'}*`,
    payload.type === 'brief' ? `_${payload.fromCity || '?'} → ${payload.toCity || '?'}_  ·  ${payload.service || ''}` : `_${payload.email}_`,
  ];
  if (payload.type === 'brief') {
    if (payload.date) lines.push(`📅 ${payload.date} ${payload.time || ''}`);
    if (payload.pax) lines.push(`👥 pax ${payload.pax}, bags ${payload.bags || '-'}`);
    if (payload.children) lines.push(`👶 children`);
    if (payload.childSeat) lines.push(`🪑 child seat`);
    if (payload.tier) lines.push(`🚗 ${payload.tier}`);
    if (payload.priceQuote) lines.push(`💰 ${payload.priceQuote}`);
    lines.push(`📞 ${payload.name || ''} · ${payload.contact || ''}`);
    if (payload.notes) lines.push(`📝 ${payload.notes}`);
    lines.push(`🌐 ${payload.language || '-'}  ·  ${payload.source || ''}`);
  } else {
    lines.push(`lang ${payload.language}  ·  ${payload.source}`);
  }
  const text = lines.join('\n');
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });
  return res.ok;
};

const sendEmail = async (env, payload, confirmationId) => {
  // Prefer Resend, fall back to Brevo. Either or both can be configured.
  const isResend = !!env.RESEND_API_KEY;
  const isBrevo = !!env.BREVO_API_KEY;
  if (!isResend && !isBrevo) return false;

  const subject = payload.type === 'brief'
    ? `Morrison · brief received · ${confirmationId}`
    : `Morrison · newsletter signup · ${confirmationId}`;

  const opsHTML = `
    <p><strong>Confirmation:</strong> ${confirmationId}</p>
    <p><strong>Type:</strong> ${payload.type}</p>
    <pre style="font-family: monospace; font-size: 12px;">${JSON.stringify(payload, null, 2)}</pre>
  `;

  const clientHTML = payload.type === 'brief' ? `
    <p>Hello ${payload.name || ''},</p>
    <p>We received your brief: <strong>${payload.fromCity || '?'} → ${payload.toCity || '?'}</strong> ${payload.date ? 'on ' + payload.date : ''}.</p>
    <p>Confirmation id: <code>${confirmationId}</code>. A dispatcher will reach out on WhatsApp within an hour.</p>
    <p>— Morrison Premium Transfer</p>
  ` : `<p>Subscribed. First email at the start of the season. — Morrison Premium Transfer</p>`;

  const opsEmail = env.MORRISON_OPS_EMAIL || 'ops@morrison-transfer.com';
  const fromAddr = env.MORRISON_FROM_EMAIL || 'hello@morrison-transfer.com';

  const send = async (to, html) => {
    if (isResend) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: fromAddr, to: [to], subject, html }),
      });
      return r.ok;
    }
    if (isBrevo) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { email: fromAddr, name: 'Morrison Premium Transfer' },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      return r.ok;
    }
    return false;
  };

  // Ops first (always), client second (only if we have a verified email).
  const opsOk = await send(opsEmail, opsHTML);
  const clientOk = payload.email || payload.contact?.includes('@')
    ? await send(payload.email || payload.contact, clientHTML)
    : false;
  return { opsOk, clientOk };
};

const newId = () => {
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  const d = new Date();
  const yymmdd = d.toISOString().slice(2, 10).replace(/-/g, '');
  return `M${yymmdd}-${r}`;
};

export default {
  async fetch(request, env) {
    const origin = allowOrigin(env, request);

    if (request.method === 'OPTIONS') {
      return json(204, '', origin);
    }
    if (request.method !== 'POST') {
      return json(405, { error: 'POST only' }, origin);
    }

    // Validate env
    const missing = REQUIRED_ENV.filter((k) => !env[k]);
    if (missing.length) return json(500, { error: 'misconfigured', missing }, origin);

    let payload;
    try { payload = await request.json(); } catch { return json(400, { error: 'invalid json' }, origin); }
    if (!payload || typeof payload !== 'object') return json(400, { error: 'invalid payload' }, origin);

    // Honeypot: if the field 'company' or 'website' is set, drop silently as 200.
    if (payload.company || payload.website) return json(200, { ok: true, dropped: true }, origin);

    // Sanity checks
    if (payload.type === 'brief') {
      if (!payload.fromCity || !payload.toCity) return json(400, { error: 'missing route' }, origin);
      if (!payload.contact && !payload.name) return json(400, { error: 'missing contact' }, origin);
    } else if (payload.type === 'newsletter') {
      if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        return json(400, { error: 'invalid email' }, origin);
      }
    } else {
      return json(400, { error: 'unknown type' }, origin);
    }

    const confirmationId = newId();
    payload.confirmationId = confirmationId;
    payload.receivedAt = new Date().toISOString();

    // Fire both side-effects in parallel, don't fail if one fails.
    const [tgOk, emailRes] = await Promise.allSettled([
      sendTelegram(env, payload),
      sendEmail(env, payload, confirmationId),
    ]);

    const tg = tgOk.status === 'fulfilled' && tgOk.value;
    const em = emailRes.status === 'fulfilled' ? emailRes.value : false;

    return json(200, {
      ok: true,
      confirmationId,
      delivered: { telegram: !!tg, email: !!em },
      degraded: !tg,
    }, origin);
  },
};
