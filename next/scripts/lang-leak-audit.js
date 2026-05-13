// Detect non-native words on RU/PT/ES pages. Allowlist covers technical
// jargon, brand names, airport codes etc. that legitimately stay English.
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = 'http://localhost:8766/transferpages';

const PAGES = [
  '', 'about/', 'contact/', 'fleet/', 'partners/', 'portal/', 'testimonials/',
  'team/', 'brazil-transfers/', 'airport-transfer/', 'international/',
  'balneario-camboriu/', 'florianopolis/', 'porto-alegre/', 'curitiba/',
  'punta-del-este/', 'pricing/', 'coverage/', 'embed/', 'track/',
  'compare/', 'cases/', 'glossary/', 'blog/', 'routes/',
  'privacy/', 'terms/', 'cookies/',
];

// Tech jargon, brand names, codes etc. — case-insensitive substring match
const ALLOW = [
  // brand / contacts
  'morrison', 'premium transfer', 'whatsapp', 'telegram', 'email', 'e-mail',
  // financial / legal
  'pix', 'nf-e', 'nfe', 'cnpj', 'cpf', 'cnh', 'ear', 'dpvat', 'lgpd', 'rgpd',
  'antt', 'abla', 'cdc', 'anpd', 'mei', 'iva',
  // airports & roads
  'gru', 'gig', 'sdu', 'cgh', 'fln', 'poa', 'cwb', 'bnu', 'nvt', 'mvd', 'pdp', 'igu', 'joi',
  'br-101', 'br-116', 'br-277', 'br-376', 'sc-401', 'ib-9', 'br-285',
  // country codes & abbrevs
  'br', 'uy', 'py', 'ar', 'vip', 'fbo', 'csv', 'pdf', 'nda', 'sla', 'eta', 'ok', 'demo', 'q1', 'q2', 'q3', 'q4',
  // place names — accepted in any lang
  'mercosur', 'mercosul', 'são paulo', 'rio de janeiro', 'curitiba', 'florianópolis',
  'balneário camboriú', 'porto alegre', 'punta del este', 'foz do iguaçu', 'chuí',
  'joinville', 'navegantes', 'brasília', 'campinas', 'colonia', 'carmelo',
  'montevideo', 'uruguay', 'paraguay', 'argentina', 'brasil', 'brazil',
  'iguazu', 'iguaçu', 'jaguarão', 'ciudad del este', 'asunción', 'la barra',
  'jurerê', 'penha', 'praia', 'janeiro',
  // dates / numbers
  '2024', '2025', '2026', '24/7',
  // intentional brand-tag English on non-EN pages (consultant TZ — premium positioning)
  // These ARE meant to read as English brand chips:
  'private executive mobility', 'service protocol', 'operational capabilities',
  'executive & corporate', 'geography of operation', 'typical journeys',
  'cross-border logistics', 'long-distance routes', 'long-distance overnight',
  'long-distance', 'cross-border',
  'executive long-leg', 'business intercity', 'private pickup', 'multi-day program',
  'executive airport transfers', 'investor & delegation mobility',
  'recurring business routes', 'confidential travel',
  'hotel & residence coordination', 'event transportation',
  'private executive', 'executive transfer', 'private pickup coordination',
  'multilingual support', 'live trip coordination', 'route & security assessment',
  'driver confirmation', 'vehicle preparation', 'arrival & follow-up',
  'request submitted',
  'b2b', 'b2c', 'crm', 'kpi', 'sed', 'app', 'ar',
];

const allowSet = new Set(ALLOW.map(s => s.toLowerCase()));

// Detect Latin (non-Cyrillic) words 4+ chars long on RU pages. Flag if the
// FULL PHRASE around them is also Latin (no surrounding Cyrillic).
const findLatinClusters = (text) => {
  const clusters = [];
  // Match clusters of Latin words: 2+ Latin words separated by spaces/punctuation
  const re = /(?:[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]+(?:\s+[A-Za-zÀ-ÿ'\-]+){2,}[A-Za-zÀ-ÿ'\-]?)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const cluster = m[0].trim();
    if (cluster.length < 12) continue;
    const lc = cluster.toLowerCase();
    // Skip if fully allowed
    if (allowSet.has(lc)) continue;
    // Skip if cluster is mostly allow-list items concatenated
    const words = lc.split(/\s+/);
    const allAllowed = words.every(w => allowSet.has(w) || /^[\d.,/\-:]+$/.test(w));
    if (allAllowed) continue;
    clusters.push(cluster);
  }
  return clusters;
};

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const report = {};

  for (const lang of ['ru', 'pt', 'es']) {
    report[lang] = {};
    for (const slug of PAGES) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.evaluateOnNewDocument(() => {
        try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
      });
      try {
        await page.goto(`${BASE}/${lang}/${slug}`, { waitUntil: 'networkidle2', timeout: 15000 });
      } catch (err) { await page.close(); continue; }
      const text = await page.evaluate(() => document.querySelector('main')?.innerText || '');
      await page.close();

      const clusters = findLatinClusters(text);
      // For RU specifically: extra check — find lines that have 0 Cyrillic but contain >12 chars
      if (lang === 'ru') {
        const lines = text.split(/\n+/);
        for (const line of lines) {
          if (line.length < 12) continue;
          if (/[а-яА-ЯёЁ]/.test(line)) continue;
          // Skip pure tech/numbers
          if (/^[\d\s.,:/\-+%·•—–()A-Z0-9]+$/.test(line)) continue;
          const lc = line.toLowerCase();
          // Skip if the entire line is in allow list
          if (allowSet.has(lc.trim())) continue;
          // Skip if matches a single allowed phrase
          let stripped = lc;
          for (const a of ALLOW) {
            stripped = stripped.split(a).join('');
          }
          if (stripped.replace(/[\s\d.,:/\-+%·•—–()&]/g, '').length > 6) {
            clusters.push('LINE: ' + line.trim().slice(0, 100));
          }
        }
      }

      if (clusters.length) {
        report[lang][slug || '(home)'] = [...new Set(clusters)].slice(0, 20);
      }
    }
  }

  fs.writeFileSync('/tmp/lang-leak.json', JSON.stringify(report, null, 2));
  // Compact terminal output
  for (const lang of ['ru', 'pt', 'es']) {
    const pages = Object.keys(report[lang]);
    console.log(`\n=== ${lang.toUpperCase()} (${pages.length} pages with leaks) ===`);
    for (const p of pages) {
      console.log(`\n  /${lang}/${p}/`);
      for (const c of report[lang][p]) {
        console.log(`    - ${c.slice(0, 110)}`);
      }
    }
  }
  console.log('\nFull JSON: /tmp/lang-leak.json');
  await browser.close();
})();
