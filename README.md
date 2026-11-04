# Personal Portfolio — Technology, Accounting & Business Solutions

A bilingual (Indonesian/English), static-first personal portfolio for software development, enterprise systems, accounting, and business solutions.

**Live domain:** <https://portofolio.homelabchester.my.id>

> **Status: Phase 7 initial deployment complete.**
> The site is live at <https://portofolio.homelabchester.my.id>. Nginx serves the static build and proxies only `/api/v1/contact` to the Go service; runit supervises both Nginx and the portfolio API. GitHub Actions builds and deploys on push to `master` once the required secrets are configured.

## Stack

- Astro 7 (static site generation)
- Preact 11 (small interactive islands)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Self-hosted Inter + Manrope variable fonts via Astro Fonts API
- Go content + contact API with SQLite (`modernc.org/sqlite`, pure Go, ARMv7-friendly)
- Nginx, runit, Cloudflare Tunnel (deployment phase)

Content management moved from Pages CMS to the Go API in Phase 5; `.pages.yml` no longer exists.

## Getting started

Requirements: Node.js `>=22.23.4`, npm, and Go (tested with 1.27).

```bash
# 1. Seed the content database once from the Markdown in content/
cd backend
go run ./cmd/import -db data/portfolio.db -dir ../content

# 2. Run the content API on localhost (token only needed for admin writes)
PORTFOLIO_ADMIN_TOKEN=change-me go run ./cmd/server

# 3. In another terminal, run the frontend
cd ../frontend
npm ci
npm run dev
```

Open <http://localhost:4321/>. The root redirects to `/id/`; English lives at `/en/`.

```bash
npm run sync:content  # pull content from the Go API into .generated/
npm run check         # sync, then Astro + TypeScript strict validation
npm run build         # sync, validate, and build to frontend/dist/
npm run test         # run static HTML checks
npm run test:static  # static checks without browser
npm run test:e2e     # browser E2E (requires Go and Playwright Chromium)
npm run test:all     # both static and browser checks
```

The dev, check, and build scripts sync content automatically. If the API is
unreachable, the sync reuses the last generated content and prints a warning;
with no cached content it fails with instructions. `CONTENT_SYNC=off` skips the
network entirely, and `CONTENT_API_URL` overrides the API origin.

For the contact form in local development, copy `frontend/.env.example` to
`frontend/.env` so the browser calls `http://127.0.0.1:8080/api/v1/contact`,
and start the backend with `PORTFOLIO_CONTACT_ORIGINS=http://localhost:4321`.
In production the form defaults to the same-origin `/api/v1/contact`, which
Nginx will proxy in Phase 7.

## Structure

```text
frontend/            Astro app (only static output is deployed)
  src/components/    Astro UI + Preact islands
  src/i18n/          Locale config, routes, centralized copy
  src/layouts/       Document shell, SEO metadata, JSON-LD
  src/pages/         Localized routes (/id/... and /en/...)
  src/styles/        Tailwind v4 theme and design tokens
  scripts/           Build-time content sync
  .generated/        Synced Markdown (gitignored build artifact)
  public/            favicon, robots.txt
content/             Markdown seed for the importer (backup, not read by the build)
backend/             Go content API + SQLite (see backend/README.md)
deploy/              Nginx/runit — Phase 7
```

## Content

**SQLite is the source of truth.** The flow is:

```text
content/ (Markdown seed) --cmd/import--> SQLite --API--> sync:content
    --> frontend/.generated/content/ --> Astro collections --> static HTML
```

- Projects and articles are edited through the admin API, not by editing files.
  See `backend/README.md` for endpoints and examples.
- `content/` keeps the original Markdown as an import source and backup. It is
  **not** read by the build; editing it changes nothing until you re-import.
- `frontend/.generated/` is produced by `npm run sync:content` and is
  gitignored. It also works as a Markdown export of the current API content.
- Both language versions of one item share the same `translationKey`, which
  drives hreflang and the language switcher. Slugs may differ per locale.
- Frontmatter is validated twice: by the Go API on write, and by
  `frontend/src/content.config.ts` on build. Keep the two schemas in sync.
- Only published articles (`draft: false`) reach listings, the sitemap, and RSS.

A content change goes live only after a rebuild and deploy. Deployment
automation is Phase 7.

## Contact form

The contact page uses a small Preact island (`client:idle`) with localized
validation, status messages, and a no-JavaScript email fallback. `POST
/api/v1/contact` stores messages privately in SQLite; it does not send email or
claim that a message has been read. The API enforces field validation, a
honeypot, a 5/hour submission limit, a 16 KiB body cap, and same-origin/CORS
checks. See `backend/README.md` for the payload and configuration.

## Personalization

Before launch, confirm or replace:

- `frontend/src/i18n/ui.ts` — identity, navigation, footer, and page metadata.
- `frontend/src/i18n/home.ts`, `about.ts`, `expertise.ts`, `projects.ts`, `blog.ts`, `contact.ts` — page copy.
- `frontend/src/data/site.ts` — contact email, social links, default OG image.
- Content — managed through the Go admin API; `content/` is the Markdown seed.
- `frontend/src/content.config.ts` and `backend/internal/content/models.go` — the two content schemas. Change them together.
- Add a real Open Graph image (1200×630) and a downloadable CV only when supplied.

Do not add fabricated experience, projects, or achievements.

## Design

Minimal editorial system with light and dark palettes: warm off-white or deep slate canvas, charcoal or near-white type, restrained blue accent, generous whitespace, Manrope headings, Inter body text. Visitors can switch themes from the header; the choice is stored locally and defaults to the system preference. Tokens live in `frontend/src/styles/global.css`.

## Deployment

The live host is an Android/Termux ARMv7 device. Production runs only static
files and the Go contact service; no Node.js process runs on the host.

- Frontend artifact: `frontend/dist/` is published to
  `/data/data/com.termux/files/home/homelab/sites/portfolio/public`.
- Go artifact: `backend/portfolio-api` and `backend/portfolio-import` (ARMv7)
  run from `/data/data/com.termux/files/home/homelab/apps/portfolio`.
- Database: `/data/data/com.termux/files/home/homelab/apps/portfolio/data/portfolio.db`
  is persistent and must never be deleted during deploys.
- Nginx: `/data/data/com.termux/files/usr/etc/nginx/conf.d/portfolio.conf`
  serves the site on port 8080 and proxies only `/api/` to `127.0.0.1:8090`.
- Runit: `/data/data/com.termux/files/usr/var/service/portfolio-api` supervises
  the Go service and starts on boot through `homelab/scripts/boot-start.sh`.
- Tunnel: the existing Cloudflare Tunnel already forwards
  `portofolio.homelabchester.my.id` to Nginx on port 8080. Its config was not
  changed.

GitHub Actions (`.github/workflows/deploy.yml`) builds both artifacts on
`ubuntu-latest`, imports the Markdown seed into a temporary SQLite database,
starts the API for the frontend build, then deploys over SSH. Required
repository secrets:

- `SSH_HOST`
- `SSH_USER`
- `SSH_PORT` (optional, defaults to 22)
- `SSH_PRIVATE_KEY`

The target's admin token is generated on the host and stored in
`portfolio-api.env` (mode 0600). It is not a GitHub secret and is not used by
CI. Content edits made through the admin API require an export/commit step
before CI can publish them; otherwise build locally and run the deploy script.

Manual deploy from this machine:

```bash
cd backend
GOOS=linux GOARCH=arm GOARM=7 go build -o /tmp/portfolio-api ./cmd/server
GOOS=linux GOARCH=arm GOARM=7 go build -o /tmp/portfolio-import ./cmd/import
cd ../frontend
npm run build
# then copy frontend/dist, the binaries, and content/ to the target and run
# deploy/scripts/remote-deploy.sh
```

Before changing the target Nginx config again, validate it with
`nginx -t` on a copy.

## Security headers

A strict Content Security Policy is required, but it is **not** enabled in `astro.config.mjs` yet. Astro's `security.csp` emits a `<meta http-equiv>` policy, which cannot express `frame-ancestors`, `report-uri`, or enforce itself for the whole document as reliably as a response header. The policy will be issued as an Nginx response header in Phase 7, with hashes generated from the built output at that point. That phase must verify the policy in a real browser (Astro CSP is inert in `astro dev`).

## Repository rules

Read `AGENTS.md` before making changes. Content lives in SQLite behind the Go API; generated files are build artifacts; secrets belong in environment variables.
