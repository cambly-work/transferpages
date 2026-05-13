# Morrison Intake Worker

A 200-line Cloudflare Worker that accepts brief submissions from the website,
sends them to a Telegram dispatcher chat, and emails ops + the client.

## What it does

1. Receives `POST /` with JSON: `{ type: "brief", fromCity, toCity, ... }`
   or `{ type: "newsletter", email, ... }`.
2. Validates payload, generates a `confirmationId` (`M250513-AB12XY`).
3. Sends a formatted message to your Telegram dispatcher chat.
4. Sends an email copy to your ops inbox + the client (if an address is in
   the payload).
5. Returns `200 { ok: true, confirmationId, delivered: {...} }`.

If Telegram is down, the worker still returns 200 with `degraded: true` —
the client UI shows confirmation. If the Worker URL is unreachable, the
website falls back to mailto (existing behaviour).

## One-time setup

```bash
# 1. Install Wrangler if you don't have it
npm install -g wrangler

# 2. Log in
wrangler login

# 3. Deploy from next/worker/
cd next/worker
wrangler deploy

# 4. Set secrets (these don't appear in source — Wrangler stores them encrypted)
wrangler secret put TELEGRAM_BOT_TOKEN
# Paste the bot token from @BotFather

wrangler secret put TELEGRAM_CHAT_ID
# Paste your dispatcher group chat id (e.g. -1001234567890)
# To get it: add the bot to your group, send any msg, then
# curl https://api.telegram.org/bot<TOKEN>/getUpdates

# Optional: email channels (use Resend OR Brevo, either works)
wrangler secret put RESEND_API_KEY    # https://resend.com (free 100/day)
# or
wrangler secret put BREVO_API_KEY     # https://brevo.com (free 300/day)
```

After `wrangler deploy`, you get a URL like
`https://morrison-intake.<your-subdomain>.workers.dev`.

## Wire to the site

Edit `next/src/_data/site.yml`:

```yaml
forms:
  endpoint: "https://morrison-intake.<your-subdomain>.workers.dev"
```

Rebuild and promote. The brief form will now POST there; on success
the user sees a real confirmation with the `confirmationId`. WhatsApp open
still happens in parallel so the dispatcher gets pinged two ways.

## Telegram bot setup (one-time)

1. Open Telegram → `@BotFather` → `/newbot` → follow prompts.
2. Note the bot token (`123456:ABC…`).
3. Create a private group "Morrison Dispatch", add the bot.
4. Send `/start` in the group, then any message.
5. `curl https://api.telegram.org/bot<TOKEN>/getUpdates` — look for
   `"chat":{"id":-100...}`. Use that as `TELEGRAM_CHAT_ID`.

## Testing the worker

```bash
curl -X POST https://morrison-intake.<your-subdomain>.workers.dev \
  -H 'content-type: application/json' \
  -d '{
    "type": "brief",
    "fromCity": "Florianópolis",
    "toCity": "Balneário Camboriú",
    "date": "2026-06-15",
    "pax": "2",
    "name": "Test",
    "contact": "+55 13 99653 2915",
    "language": "en",
    "source": "manual-test"
  }'
```

You should see a message in the Telegram group + a 200 response with a
confirmation id.

## Cost

Cloudflare Workers free tier: 100k requests/day. The Morrison form will
not come close to this. Resend free tier: 100 emails/day, Brevo free
tier: 300/day — also way above expected volume.

## Failure modes covered

- Worker unreachable → site falls back to `mailto:` (existing behavior).
- Worker reachable but Telegram fails → 200 with `degraded: true`, ops
  email still goes through.
- Worker reachable but email fails → 200, Telegram still works.
- Both fail → 200 (we got the payload, can resolve manually); but
  this is extremely rare unless secrets are misconfigured.
- Honeypot fields `company` or `website` set → silent 200 drop (anti-spam).

## Source

`morrison-intake.js` — the Worker.
`wrangler.toml` — config (only public vars; secrets via `wrangler secret put`).
