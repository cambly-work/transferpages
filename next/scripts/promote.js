#!/usr/bin/env node
// Promote next/_site/ → repo root with full /transferpages/ prefix-pass.
// Idempotent — already-prefixed paths are not touched twice.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SITE_DIR = path.join(REPO_ROOT, 'next', '_site');
const PREFIX = '/transferpages';

if (!fs.existsSync(SITE_DIR)) {
  console.error(`ERROR: ${SITE_DIR} not found. Run \`npm run build\` in next/ first.`);
  process.exit(1);
}

// 1. Wipe old top-level build artifacts (preserve .git, next/, CLAUDE.md, README.md, .github, .claude)
const KEEP = new Set(['.git', '.github', '.claude', 'next', 'CLAUDE.md', 'README.md', 'node_modules']);
console.log('→ Wiping old build artifacts at repo root');
for (const entry of fs.readdirSync(REPO_ROOT)) {
  if (KEEP.has(entry)) continue;
  const p = path.join(REPO_ROOT, entry);
  fs.rmSync(p, { recursive: true, force: true });
}

// 2. Copy fresh build
console.log('→ Copying fresh build from next/_site/');
execSync(`cp -R "${SITE_DIR}/." "${REPO_ROOT}/"`);

// 3. Walk + prefix-pass
console.log('→ Applying prefix-pass');

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (KEEP.has(entry.name) && dir === REPO_ROOT) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

const files = walk(REPO_ROOT);

// Match a root-absolute path that is NOT protocol-relative (//) and NOT already prefixed (/transferpages/...)
// Used as the path token inside a larger pattern.
const PATH_TOKEN = `/(?!/)(?!transferpages(?:/|"|'|\\)|\\s))`;

const HTML_ATTRS_RE = new RegExp(
  `(\\b(?:href|src|srcset|action|formaction|poster|data-src|data-srcset)\\s*=\\s*")${PATH_TOKEN}`,
  'g'
);
// Picture/source srcset can have comma-separated entries — handle that too.
// For srcset specifically, paths after commas need prefixing.
const SRCSET_INNER_RE = new RegExp(`(,\\s*)${PATH_TOKEN}`, 'g');

const CSS_URL_RE = new RegExp(`url\\(\\s*(['"]?)${PATH_TOKEN}`, 'g');

const MANIFEST_START_URL_RE = /"start_url"\s*:\s*"\/"/g;
const MANIFEST_SCOPE_RE = /"scope"\s*:\s*"\/"/g;
const MANIFEST_SRC_RE = new RegExp(`("(?:src|url)"\\s*:\\s*")${PATH_TOKEN}`, 'g');

let touched = 0;
for (const f of files) {
  const ext = path.extname(f);
  if (!['.html', '.css', '.js', '.webmanifest', '.xml', '.json', '.txt'].includes(ext)) continue;

  const orig = fs.readFileSync(f, 'utf8');
  let out = orig;

  if (ext === '.html' || ext === '.js' || ext === '.xml') {
    out = out.replace(HTML_ATTRS_RE, `$1${PREFIX}/`);
    // For srcset attributes specifically, handle internal commas
    out = out.replace(/srcset\s*=\s*"([^"]+)"/g, (m, val) => {
      const fixed = val.replace(/(^|,\s*)\/(?!\/)(?!transferpages\/)/g, `$1${PREFIX}/`);
      return `srcset="${fixed}"`;
    });
  }

  if (ext === '.css') {
    out = out.replace(CSS_URL_RE, `url($1${PREFIX}/`);
  }

  if (ext === '.webmanifest' || (ext === '.json' && f.endsWith('manifest.webmanifest'))) {
    out = out.replace(MANIFEST_START_URL_RE, `"start_url": "${PREFIX}/"`);
    out = out.replace(MANIFEST_SCOPE_RE, `"scope": "${PREFIX}/"`);
    out = out.replace(MANIFEST_SRC_RE, `$1${PREFIX}/`);
  }

  if (out !== orig) {
    fs.writeFileSync(f, out);
    touched++;
  }
}

console.log(`→ Rewrote ${touched} files`);

// 4. Sanity checks
const check = (label, file, needle) => {
  const p = path.join(REPO_ROOT, file);
  if (!fs.existsSync(p)) return console.log(`  ✗ ${label} (file missing)`);
  const has = fs.readFileSync(p, 'utf8').includes(needle);
  console.log(`  ${has ? '✓' : '✗'} ${label}`);
};

console.log('→ Verify:');
check('en/index.html has prefixed CSS', 'en/index.html', '/transferpages/assets/style.css');
check('manifest start_url prefixed', 'manifest.webmanifest', '"start_url": "/transferpages/"');
check('manifest scope prefixed', 'manifest.webmanifest', '"scope": "/transferpages/"');
check('manifest icon prefixed', 'manifest.webmanifest', '"/transferpages/favicon.svg"');
check('CSS url() prefixed', 'assets/style.css', "url('/transferpages/assets/images/");
check('about srcset prefixed', 'en/about/index.html', 'srcset="/transferpages/assets/images/');

console.log('\nDone. Review with: git status && git diff --stat');
