# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Static marketing site for Morrison Premium Transfer (private transfers across Brazil and Mercosur). No build step, no framework, no package manager — plain HTML/CSS/JS served as files. Designed for GitHub Pages on a custom domain (`morrison-transfer.com`).

## Local development

Open any `.html` directly, or serve the repo root over HTTP so the language redirect works:

```bash
python3 -m http.server 8000   # then http://localhost:8000
```

There is no lint, no test suite, no formatter. After edits, do a manual smoke test in the browser at small (≤480), tablet (≤1024) and desktop widths — most layout regressions surface only at breakpoints.

## Site architecture

### URL layout

- `/` — root [index.html](index.html) is a **JS language redirector**: detects `localStorage.preferredLanguage` first, then `navigator.languages`, then falls back to `en`, and `window.location.replace`s to `/<lang>/`. The `<noscript>` fallback links to the EN version.
- `/<lang>/` — full localized site, one directory per language: `ru/`, `pt/`, `en/`. Each contains the same nine pages: `index.html`, `brazil-transfers.html`, `airport-transfer.html`, `international.html`, `partners.html`, `contact.html` plus three local SEO pages `balneario-camboriu.html`, `porto-alegre.html`, `florianopolis.html`.
- `/<page>.html` at the root (everything except `index.html`) — these are **legacy Russian-language copies** (`<html lang="ru">`, `href="assets/..."` not `../assets/...`). They duplicate `/ru/<page>.html` and exist for old inbound URLs. When updating content, treat root-level pages as a third Russian copy and keep them in sync — or, preferred, replace each with a redirect to `/ru/<page>.html`. **Do not** create new pages at the root.
- `/assets/style.css`, `/assets/script.js`, `/assets/images/*` — single shared asset bundle for all pages. Localized pages link via `../assets/...`; root-level legacy pages link via `assets/...`.

### Page anatomy

Every localized page follows the same skeleton — header (`.site-header` with `.logo`, `.site-nav`, `.lang-switch`), `<main>`, footer (`.site-footer` with four-column `.footer-grid`). Section building blocks are CSS-only and reused across pages: `.hero` + `.hero-grid`, `.section`, `.panel`/`.card`/`.metric`/`.cta-band`/`.trust-strip`/`.highlight` (all share the same border + gradient + shadow rule), `.grid-2`/`.grid-3`/`.grid-4`, `.geo-layout`, `.route-map`, `.process-timeline`, `.scenario-grid`. Adding a new section means composing existing classes — avoid bespoke styles.

### JS: [assets/script.js](assets/script.js)

Single IIFE that runs on every page. Read it before adding behavior — most things you might want already exist:

- **Mobile nav** — toggles `.site-nav.open`, builds `.nav-overlay`, locks body scroll on `≤768px`, computes localized `aria-label` for the close button from `document.documentElement.lang`.
- **Active nav highlighting** — compares normalized pathname to each `.nav-list a` href.
- **Language switcher tracking** — writes `preferredLanguage` to `localStorage` and fires a GA4 `language_switch` event.
- **Telegram URL rewrite** — *every* `t.me/...` link in HTML is replaced at runtime with the `TELEGRAM_URL` constant at the top of the file. To change the Telegram channel, edit only that constant; HTML hrefs are essentially decorative for Telegram.
- **WhatsApp number** — hardcoded as `5513996532915` in HTML across 36+ files **and** again in the mobile sticky CTA template inside this script. Search both when changing it.
- **Mobile sticky CTA** — at `≤768px`, dynamically appends `.mobile-sticky-cta` (WhatsApp + Telegram buttons), measures its height, and writes it to the `--mobile-cta-height` CSS variable so `body.has-mobile-cta` can pad the bottom. Resync hooks: `ResizeObserver`, `orientationchange`, `visualViewport.resize`. Tear-down on resize back above 768.
- **Interactive route picker** (`[data-route-target]` ↔ `[data-route-line]` ↔ `[data-route-field]`) — used on pages that show a route map with selectable legs.
- **`[data-step-trigger]`** — accordion-style toggle that activates one `.process-step` or `.scenario-card` within its parent.
- **`.reveal` IntersectionObserver** — adds `.is-visible` to fade sections in on scroll.
- **GA4 click tracking** — auto-tags every `a[href]` with `data-track` based on URL (`click_whatsapp`, `click_telegram`, or `booking_cta_click` for `.btn-primary`/contact links), and a delegated click handler dispatches `gtag('event', ...)` with link metadata.

### CSS: [assets/style.css](assets/style.css)

Single stylesheet, dark theme, custom-property design tokens at `:root` (`--brand: #c9a36b` is the only accent — keep it). Two CSS variables are JS-driven: `--header-height` (declared per breakpoint, used to offset `padding-top` on `body` since the header is `position: fixed`) and `--mobile-cta-height` (written by `script.js`). Three breakpoints: `1024px`, `768px`, `480px`. Mobile menu, sticky CTA and grid collapse all happen at `768px`.

## Cross-cutting concerns

### Multilingual edits

Any content change must propagate to **four places**: `/ru/<page>`, `/pt/<page>`, `/en/<page>`, and the legacy root `/<page>` (Russian). Verify with:

```bash
rg "<phrase>" *.html ru/ pt/ en/
```

Each page has its own `<title>`, `<meta name="description">`, `<link rel="canonical">` and full set of `<link rel="alternate" hreflang="...">` (`ru`, `pt-BR`, `en`, `x-default`) plus OG/Twitter meta. When adding a new page, add it to all three language directories and wire up canonicals + hreflangs symmetrically.

### Contacts

- WhatsApp: `https://wa.me/5513996532915` — hardcoded in every HTML and inside `script.js`.
- Telegram: `https://t.me/premium_transfer_latam` — authoritative value lives in `TELEGRAM_URL` in `script.js`; HTML hrefs are overwritten at runtime.

### Analytics

Google Analytics 4 (`G-ZMBK0S18RL`) is loaded inline on every page and additionally inside the root `index.html` redirector. Custom events fired from `script.js`: `language_switch`, `click_whatsapp`, `click_telegram`, `booking_cta_click`. New CTAs that should be tracked either need `class="btn-primary"`, an href ending in `contact.html`, or an explicit `data-track="..."` attribute.

### SEO

- Canonicals point at `https://morrison-transfer.com/<lang>/<page>` for localized pages and `https://morrison-transfer.com/` for the root redirector.
- All localized pages cross-link via `<link rel="alternate" hreflang="...">`.
- No `sitemap.xml`, `robots.txt`, or `CNAME` file in the repo — the custom domain is configured in the GitHub Pages settings, not via `CNAME`. If a deploy ever drops the custom domain, that's the first thing to check.

### Accessibility

`.skip-link` at top of each page, `aria-expanded`/`aria-controls`/`aria-label` on the nav toggle, `aria-current="page"` on the active link, focus-visible styling for all interactive elements. Don't strip these when refactoring sections.

## Deployment

Pushes to `main` on `github.com/cambly-work/transferpages` publish to GitHub Pages, which serves the custom domain `morrison-transfer.com`. There is no CI, no deploy script, no preview environment — `main` is production.
