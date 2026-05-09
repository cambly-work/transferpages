# next/ — 11ty rebuild (sandbox)

Test-bed for migrating the Morrison Premium Transfer site from hand-edited HTML to a static-site generator. The legacy site at the repo root is **untouched** — you can compare side-by-side, then promote when satisfied.

## What's here

```
next/
  package.json            npm scripts + 11ty + js-yaml
  .eleventy.js            Eleventy config: input src/, output _site/
  src/
    _data/
      site.yml            domain, contacts, GA4 tag, locales — single source of truth
      i18n.yml            UI strings per locale (nav, footer, meta, brand)
      nav.yml             navigation structure (keys → href, labels resolved per locale)
    _includes/
      layouts/base.njk    full page chrome (one file, three languages)
      partials/head.njk   <head>: title, meta, hreflang, canonical, OG, GA
      partials/header.njk site-header with logo, nav, language switch
      partials/footer.njk site-footer
    index.njk             root JS language redirector → /<lang>/
    ru/                   ru.json sets lang+layout for the directory
      index.njk
      contact.njk
    pt/                   same shape as ru/
    en/                   same shape as ru/
    assets/               style.css, script.js, images/ (passthrough copy)
    favicon.svg
  .github/workflows/
    deploy.yml            INACTIVE here. Move to repo-root /.github/workflows/ at cutover.
```

## Run locally

```bash
cd next
npm install
npm run dev      # http://localhost:8080 with live reload
npm run build    # writes _site/
npm run clean    # rm -rf _site
```

Requires Node 18+.

## How edits work

- **Change a contact / GA tag / domain** — edit [src/_data/site.yml](src/_data/site.yml). One place. Rebuilds propagate to every page.
- **Change a UI string** (nav label, footer header, "Skip to content", etc.) — edit [src/_data/i18n.yml](src/_data/i18n.yml) under the right locale. Page-level body copy still lives in the page file.
- **Add a new page** — create `src/<lang>/<slug>.njk` for each of `ru`, `pt`, `en` with frontmatter:
  ```yaml
  ---
  slug: "<slug>"
  permalink: "/<lang>/<slug>/index.html"
  title: "..."
  description: "..."
  ---
  ```
  Then add it to [src/_data/nav.yml](src/_data/nav.yml) if it should appear in nav, and add a label to each locale in `i18n.yml` under `nav.<key>`.
- **Add a new locale** — create `src/<code>/<code>.json` with `{"lang": "<code>", "layout": "layouts/base.njk"}`, add `<code>` to `site.locales`, add a block to `i18n.yml`, and create the page set.

## Promoting `next/` to production

When you are ready to retire the legacy hand-coded site:

1. Migrate the remaining seven pages (`brazil-transfers`, `airport-transfer`, `international`, `partners`, `balneario-camboriu`, `porto-alegre`, `florianopolis`) into `src/<lang>/`. Pattern is the same as `index.njk` and `contact.njk`.
2. From the repo root, delete the legacy files: root-level `*.html` (including `index.html`), `assets/`, `favicon.svg`. Move the `next/` contents up to the root (or set up the workflow to build from `next/`).
3. Move [next/.github/workflows/deploy.yml](.github/workflows/deploy.yml) to `.github/workflows/deploy.yml` at the repo root.
4. In GitHub repo settings → Pages → "Build and deployment" → switch **Source** from "Deploy from a branch" to **"GitHub Actions"**.
5. Push. The workflow builds `_site/` and publishes it to the same custom domain.

If your custom domain is configured via the GitHub Pages UI it persists across the source change. If it's via a `CNAME` file, drop a `CNAME` containing `morrison-transfer.com` into `src/` (it will be copied through to `_site/`).

## What this rebuild fixes vs. the legacy site

- WhatsApp number, Telegram URL, GA4 tag and domain are configured **once** instead of repeated across 36+ HTML files.
- Header, footer and `<head>` meta come from one template — no more drift between languages.
- Adding a fourth locale is a `_data/i18n.yml` block plus a page set, not a tripled copy-paste.
- The legacy root-level Russian duplicates (`/airport-transfer.html` etc.) disappear at cutover — there are only three locale paths.
