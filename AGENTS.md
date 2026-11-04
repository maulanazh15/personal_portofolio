# AGENTS.md — Portfolio

Project-specific guidance for AI agents and contributors working in this repository.

## 1. Project identity

- Public URL: `https://portofolio.homelabchester.my.id`
- Purpose: a bilingual personal portfolio covering technology, accounting, and business solutions: software development, enterprise systems, financial processes, data work, and automation.
- Current stage: **Phase 7 initial deployment complete**. The site is live through the existing Cloudflare Tunnel, Nginx serves the static build, and runit supervises Nginx plus the portfolio API. GitHub Actions builds and deploys on push to `master`. Contact submissions are stored privately on the target.
- Do not invent the owner's identity, employment history, education, certifications, clients, achievements, project results, availability, or social links. Use clearly marked placeholders until real data is supplied.

## 2. Mandatory stack

| Concern | Technology |
| --- | --- |
| Frontend | Astro 7 (static output) |
| Interactive UI | Preact 11 (islands only) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` |
| Content management | Go admin API (localhost, bearer token) |
| API | Go standard library HTTP server |
| Persistence | SQLite via `modernc.org/sqlite` (pure Go, no cgo) |
| Web server | Nginx |
| Supervision | runit |
| Ingress | Existing Cloudflare Tunnel |
| CI/CD | GitHub Actions |
| Host monitoring | Existing independent Go Monitoring API |

Do not swap frameworks or add a second CMS without explicit approval. Pages CMS was replaced by the Go content API at the owner's request in Phase 5; do not recreate `.pages.yml`.

## 3. Repository layout

```text
.
├── frontend/            Astro application (the only deployable frontend artifact)
│   ├── public/          Static passthrough files
│   ├── scripts/         Build-time content sync from the Go API
│   ├── .generated/      Synced Markdown (gitignored build artifact)
│   ├── src/
│   │   ├── assets/      Fonts/design assets
│   │   ├── components/  Astro components + Preact islands
│   │   ├── data/        Language-neutral site config
│   │   ├── i18n/        Locale config, UI strings, route table
│   │   ├── layouts/     Base document shell
│   │   ├── pages/       Localized route files
│   │   └── styles/      Tailwind theme + global styles
│   └── astro.config.mjs
├── content/             Markdown seed for the importer (backup; not read by builds)
├── backend/             Go content API + SQLite + embedded localhost admin UI (cmd/, internal/, data/ gitignored)
├── deploy/              Nginx/runit artifacts (Phase 7)
└── .github/workflows/   CI/CD (Phase 7)
```

Keep frontend, backend, content, and deployment concerns separate.

## 4. Commands

Run from `frontend/` unless noted:

```bash
npm ci                  # clean install from lockfile
npm run dev             # sync content, then Astro dev server
npm run check           # sync content, then Astro + TypeScript validation
npm run build           # sync, check, then production static build
npm run preview         # preview dist/
npm run sync:content    # pull content from the Go API into .generated/
```

Node.js `>=22.23.4` is required. Production must never run a Node server: only built static files are deployed.

The frontend expects the content API on `http://127.0.0.1:8080` (override with
`CONTENT_API_URL`; skip with `CONTENT_SYNC=off`). Backend commands:

```bash
cd backend
go run ./cmd/import -db data/portfolio.db -dir ../content   # seed, idempotent
PORTFOLIO_ADMIN_TOKEN=... go run ./cmd/server               # localhost API + /admin/ browser UI
gofmt -l . && go vet ./... && go test ./...
GOOS=linux GOARCH=arm GOARM=7 go build ./...                # target compile check
```

## 5. Architecture rules

1. **Static-first.** Pages are generated at build time. Do not add an SSR adapter unless a real requirement is approved.
2. **Astro by default.** Use `.astro` components for layout and static UI. Use Preact only when client-side interaction is genuinely required.
3. **Island discipline.** Hydrate with the least eager directive that works (`client:idle`, `client:visible`). Never hydrate whole pages. Keep islands small and dependency-free.
4. **i18n is centralized.**
   - Locale list, localized paths, and the route table live in `src/i18n/config.ts`.
   - Shared UI copy lives in `src/i18n/ui.ts`; page copy lives in `src/i18n/{about,expertise,projects,blog,contact,home}.ts`.
   - Repeatable content (projects, articles) is served by the Go API and paired by `translationKey`; `frontend/.generated/` is its synced Markdown form.
   - Every visible string must exist in both `id` and `en`. Do not mix languages in one view.
   - Use `localizedHref()` instead of hard-coded internal paths; detail pages use `projectPath()` / `articlePath()` from `src/lib/content.ts`.
   - Internal URLs use trailing slashes (`/id/proyek/`, `/id/proyek/<slug>/`).
   - New pages must supply `routeKey` (or explicit `alternatePaths`) so canonical/hreflang metadata stays correct.
5. **Design tokens first.** Colors, radii, shadows, and easing live in the `@theme` block of `src/styles/global.css`. Prefer semantic utilities (`text-muted`, `border-line`, `bg-accent-soft`) over arbitrary values. Reuse `.container-page`, `.section`, `.surface-card`, `.btn*`, `.tag`, and `.eyebrow` before inventing new patterns.
6. **Content lives behind the Go API.** Projects and articles are stored in SQLite and edited through the admin API (`backend/README.md`). `content/` is only the Markdown import seed/backup, and `frontend/.generated/` is a disposable build artifact. Never edit generated files or the seed expecting the site to change. The Go schema in `backend/internal/content/models.go` and the Astro schema in `frontend/src/content.config.ts` must change together. Singleton page copy (About, Expertise, Contact, Home) still lives in `src/i18n/*.ts`.
7. **No broken affordances.** Do not render links or buttons to pages/endpoints that do not exist. Mark unfinished areas clearly and keep them `noindex` until real content exists.
8. **Accessibility is a requirement.** Preserve skip links, landmarks, heading order, visible focus, keyboard support, `prefers-reduced-motion` handling, and 44px-ish mobile targets. Test the mobile menu with keyboard only.
9. **SEO foundation.** BaseLayout owns titles, descriptions, canonical URLs, hreflang, Open Graph, Twitter cards, and JSON-LD. Keep `robots.txt` and the sitemap accurate as routes are added. `noindex` placeholders must not be promoted as finished content.
10. **Performance.** No third-party scripts by default. Self-host fonts through Astro's Fonts API. Optimize images through `astro:assets` when images are introduced. Keep client JS near zero.

## 6. Personalization placeholders

Before launch, replace or confirm:

- `src/i18n/ui.ts` → identity details and page metadata (currently filled with the owner's verified information).
- `src/i18n/home.ts`, `about.ts`, `expertise.ts`, `projects.ts`, `blog.ts`, `contact.ts` → wording and scope, if the owner's voice differs.
- `src/data/site.ts` → contact email, social links, default OG image.
- Content → managed through the Go admin API; `content/` is only the Markdown seed. Keep both locales paired by `translationKey`.
- `backend/internal/content/models.go` + `frontend/src/content.config.ts` → the two content schemas. Change them together.
- Add a real Open Graph image (PNG/JPEG, 1200×630) and a downloadable CV only when supplied.

Never replace placeholders with guessed personal facts.

## 7. Security rules

- Secrets come from environment variables or GitHub Secrets; never commit keys, tokens, private emails, or database files.
- The Go API must bind to `127.0.0.1` in production and be reached only through Nginx.
- The admin API requires `PORTFOLIO_ADMIN_TOKEN` and is for local use only. Never expose admin endpoints, the token, content-read endpoints, or the SQLite file through Nginx or the tunnel. An empty token disables writes; keep it that way if you are not editing. Only the exact public `/api/v1/contact` endpoint may be proxied for browsers.
- Contact submissions are private data. Do not add a public list/read endpoint. Keep validation, the honeypot, strict rate limits, body caps, and same-origin/CORS checks intact. Nginx must pass `X-Forwarded-For`; the API trusts it only from loopback.
- Restrict CORS, cap request body size, rate-limit public endpoints, validate all input, and use parameterized SQLite queries.
- Do not expose SQLite files, SSH, admin endpoints, or private monitoring endpoints through the tunnel.
- Keep a strict Content Security Policy; avoid `unsafe-inline`/`unsafe-eval` unless documented and unavoidable.
- Escape user-generated content; contact submissions are data, not HTML.
- Do not weaken existing homelab security for convenience.

## 8. Deployment constraints and safety

Target host: Android/Termux, ARMv7 32-bit, limited RAM/storage. Existing Nginx, cloudflared, runit, SSH, and a separate Go Monitoring API are already running.

- Build the frontend in CI or a development machine; deploy only `frontend/dist/`.
- Cross-compile Go with `GOOS=linux GOARCH=arm GOARM=7`; verify on target.
- **Inspect existing configuration first.** Never overwrite unrelated Nginx virtual hosts, the existing tunnel config, runit services, the monitoring API, or SSH.
- Never restart production services, modify the tunnel, or deploy without explicit confirmation.
- Deployment must preserve SQLite databases and persistent data. No destructive sync/delete commands.
- Use least-privilege deploy credentials and deploy only after checks pass.

## 9. Testing and quality gates

Before handing off a phase:

```bash
cd backend
gofmt -l . && go vet ./... && go test ./...
GOOS=linux GOARCH=arm GOARM=7 go build ./...

cd ../frontend
npm run check
npm run build
npm run test:static
npm run test:e2e     # requires Go, a built API, and Playwright Chromium
```

Also verify manually:

- Both `/id/` and `/en/` render fully in one language.
- Language switcher preserves the current route.
- Canonical, hreflang, title, description, OG/Twitter tags are correct.
- Mobile menu works with mouse, touch, and keyboard (Escape, Tab trap, focus return).
- No console errors, broken links, horizontal scroll, or layout shift at 320/768/1024/1440px.
- Reduced-motion preference disables non-essential animation.
- Content edits made through the admin API appear after a rebuild; drafts never do.
- Contact API validation, persistence, honeypot, CORS, and rate-limit tests pass. Invalid submissions never show success, and no test messages remain in the real database.
- Playwright Chromium is installed locally with `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium`.
- Later: Nginx config test (`nginx -t`) on a copy before touching production.

Fix failures; do not suppress them.

## 10. Phase discipline

Follow the master plan: Phase 1 inspection → Phase 2 foundation → Phase 3 UI → Phase 4 content model → Phase 5 backend → Phase 6 testing → Phase 7 deployment. Phase 4 delivered the content model and Phase 5 replaced Pages CMS with the Go content API at the owner's request. Do not skip ahead or generate the whole application at once. Wait for explicit approval before production-impacting changes.
