# Wanaka Discourse Theme

A full (non-component) Discourse theme that puts a Wanaka dark brand skin on a
self-hosted Discourse forum and turns pasted Wanaka game-share links
(`https://<host>/g/<id>`) into "Play" cards that run the game in an in-post iframe.

- **Brand accent:** `#C0F000` (Wanaka brand primary / `--color-cta`), used as the
  Discourse `tertiary` color → links and primary buttons.
- **Background:** `#141F25`, matching the Wanaka game play page.

## Contents

| File | Purpose |
|---|---|
| `about.json` | Full theme (`"component": false`) + the `Wanaka Dark` color scheme. |
| `settings.yml` | Theme settings (game-share host + brand link URLs). No host is hard-coded elsewhere. |
| `locales/en.yml` | English metadata + setting descriptions. |
| `common/common.scss` | Dark brand SCSS (buttons, links, brand bar, footer, game card). |
| `common/header.html` | Wanaka brand bar (logo + Studio / Games nav). |
| `common/footer.html` | Wanaka footer (main site / Studio / Community Guidelines). |
| `javascripts/discourse/api-initializers/wanaka-game-onebox.js` | Game onebox → "Play" button + in-post iframe. |
| `javascripts/discourse/api-initializers/wanaka-branding.js` | Fills header/footer link hrefs from theme settings. |
| `assets/wanaka-logo.svg` | Placeholder wordmark (replace with the official logo). |

## Install

### From a git repository (production)

1. Push this directory to its own git repo (one theme per repo — Discourse's
   "Install from a git repository" reads `about.json` at the repo root).
2. In Discourse: **Admin ▸ Customize ▸ Themes ▸ Install ▸ From a git repository**,
   paste the repo URL. Private repos: configure a deploy key first
   (see meta.discourse.org topic 82584).
3. Open the installed theme and click **Set as default**.
4. **Admin ▸ Customize ▸ Colors**: make sure the `Wanaka Dark` scheme is the
   default so anonymous + logged-in users get the dark skin.
5. Discourse checks the repo for updates daily; or click **Check for Updates ▸
   Update to Latest**. Bump `theme_version` in `about.json` on each change.

### Local development (hot reload)

```bash
gem install discourse_theme
discourse_theme watch /Users/bowie/discourse-wanaka-theme
```

First run prompts for the Discourse URL and an API key
(**Admin ▸ API ▸ New Key**, all-users/global). Saving a file hot-syncs it; refresh
the browser to see the change. `discourse_theme new` / `push` / `pull` are also
available.

## Configure (theme settings)

**Admin ▸ Customize ▸ Themes ▸ Wanaka ▸ Settings:**

| Setting | Default | Notes |
|---|---|---|
| `game_share_host` | `play.wanaka.app` | Host (no scheme) serving `/g/<id>`. **Set per environment** (`play.dev.wanaka.app` / `play.staging.wanaka.app` / `play.wanaka.app`). The onebox only enhances links whose host matches exactly. |
| `studio_url` | `https://studio.wanaka.app` | Brand-bar / footer "Studio" link. |
| `games_url` | `https://wanaka.app/games` | Brand-bar "Games" link. |
| `main_site_url` | `https://wanaka.app` | Logo / footer link. |
| `guidelines_url` | `/guidelines` | Footer "Community Guidelines" link (forum's built-in page by default). |

## Change the brand color

The palette is single-sourced in the `Wanaka Dark` color scheme in `about.json`
(hex values, no `#`). SCSS in `common/common.scss` reads the derived variables
(`$tertiary`, `$secondary`, `$primary-medium`, …) rather than repeating hex, so:

- Change the accent → edit `tertiary` (and `quaternary`) in `about.json`.
- Change the background → edit `secondary`.

The only hard-coded brand hex is inside `assets/wanaka-logo.svg` and the inline
SVG in `common/header.html` (SVG can't reference SCSS variables) — update those
if you re-brand. After editing `about.json`, re-import / re-sync the theme.

## Game onebox → in-post play (how it works)

1. A user pastes `https://<game_share_host>/g/<id>` **on its own line**.
2. Discourse server-side oneboxes it from the `/g` page's OpenGraph tags
   (`og:title` / `og:description` / `og:image`), rendering an `<aside class="onebox">`
   card — no backend plugin needed.
3. `wanaka-game-onebox.js` adds a **▶ 试玩** button to that card. Clicking it
   mounts a 16:9 iframe pointing at the `/g` link; the `/g` page's meta refresh
   navigates the iframe on to `play.html`, so the studio origin never has to be
   derived. Esc or ✕ closes it. The iframe is created only on click (never
   auto-mounted).

The client-injected iframe is not part of cooked HTML, so `allowed_iframes` is
not involved, and Discourse's default CSP has no `frame-src` restriction — no
site-setting changes are required for the recommended path.

## Caveats / needs confirmation on the running instance

These come from the source plan (`docs/snapshots/plans/2026-07-06-discourse-plan-c-theme-onebox.md`);
verify against your Discourse version + real cross-origin setup:

- **onebox canonical gotcha.** `/g` sets `<link rel="canonical">` to `play.html`.
  onebox prefers canonical, so the card may pull empty/generic OG. Fix is a
  one-line core-api change (`<meta property="og:ignore_canonical" content="true">`
  in `renderGameShareHtml`). This theme does not include that change (frontend
  only). Without it, cards may degrade (missing cover/description).
- **Cross-origin iframe (hard gate).** No `X-Frame-Options` / `frame-ancestors`
  was found on the play/studio pages, and the web-consumer already cross-origin
  embeds games, so embedding is expected to work — but `forum.<zone>` ↔
  `play.<zone>` is cross-origin and MUST be tested on a real instance (watch for
  `Refused to display … in a frame`). If blocked, add the forum origin to the
  studio/play `frame-ancestors` allowlist (a studio-stack change, out of scope
  for this theme).
- **API surface.** `api.decorateCookedElement` / `api.onPageChange` /
  `apiInitializer` are used per the plan; the `apiInitializer` version string
  (`1.8.0`) and the `decorateCookedElement` options (`{ id, onlyStream }`) should
  be confirmed against the installed Discourse version.
- **onebox reachability.** onebox fetches server-side; the Discourse host must be
  able to reach `game_share_host` on the public internet, or the card silently
  falls back to a bare link.
- **`#C0F000` contrast.** Bright lime needs a dark label on button fills (handled)
  and should be spot-checked for WCAG AA.
- **`minimum_discourse_version`** is `null` (no floor). Pin it, or add a
  `.discourse-compatibility` file, if you need to lock the theme to a Discourse
  version range.
- **Logo** in `assets/wanaka-logo.svg` and `common/header.html` is a placeholder
  wordmark — replace with the official Wanaka logo.

## 0.2.0 (2026-07-09)

- Palette re-sourced from ui-kit tokens (single source shared with studio / wanaka.app / storefront): warm-black `#140E10` base, full 12-field scheme incl. `hover`/`selected`, `love=#FFC300`, `success=#45D9A1`.
- Brand DNA: self-hosted Poppins (assets/fonts), hard-bottom-shadow buttons with pressed sink, 14px card surfaces, lime focus ring.
- Removed the custom brand bar (`common/header.html`) — it stacked a second header above Discourse's own. Logo goes through site settings (`logo` / `logo_small`); external links go to the sidebar.
- Game onebox: "▶ Play" now localized via `locales/en.yml` (was hard-coded Chinese), ✕ has an aria-label, Esc closes only the most recently opened frame, and a 12s load timeout shows an "open in a new tab" fallback.
- Added LICENSE (MIT), `minimum_discourse_version: 3.5.0`, `about_url`/`license_url`.
