# Portfolio API (Go + SQLite)

The backend service for the portfolio. It stores projects, articles, and private
contact submissions in SQLite. The Astro frontend reads content **at build time
only** (`npm run sync:content`), so the deployed site is still static HTML and
no Node.js process runs in production. Only the contact endpoint is intended
for browser requests at runtime.

Pages CMS is no longer used; this service replaces it.

## Layout

```text
cmd/server/          HTTP server
cmd/import/          Markdown → SQLite importer (idempotent)
internal/content/    Content/contact models, validation, Markdown, SQLite store
internal/api/        HTTP handlers, bearer auth, CORS, rate limiting
internal/api/admin/  Embedded browser admin UI (HTML/CSS/vanilla JS)
data/                SQLite database (gitignored, created on demand)
```

## Run locally

```bash
# One-time seed from the Markdown files in ../content (safe to re-run)
go run ./cmd/import -db data/portfolio.db -dir ../content

# Start the API on localhost
PORTFOLIO_ADMIN_TOKEN=change-me go run ./cmd/server

# Open the browser admin UI to create, edit, and delete localized content
# URL: http://127.0.0.1:8080/admin/

# In another terminal: build the frontend from the API
cd ../frontend && npm run build
```

Without `PORTFOLIO_ADMIN_TOKEN` the read API works but every admin endpoint
answers `503 admin API is disabled`.

## Browser admin UI

Open `http://127.0.0.1:8080/admin/` and enter the configured admin token. The UI
supports the complete project and article lifecycle for both locales: list,
create, read/edit, and delete. It includes every frontmatter field, Markdown
bodies, article drafts, and delete confirmation. The token is held in tab-scoped
`sessionStorage`, never in the URL or persistent local storage.

The UI is embedded in the Go binary and uses only same-origin HTML, CSS, and
JavaScript; it adds no runtime dependencies to the static frontend. Keep it on
localhost. For remote administration, use an SSH local port forward rather than
exposing `/admin/` or `/api/v1/admin/` through Nginx or the tunnel.

Content changes are saved immediately in SQLite, but the public site changes
only after `cd ../frontend && npm run build` and deployment.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORTFOLIO_ADDR` | `127.0.0.1:8080` | Listen address. Keep it on localhost. |
| `PORTFOLIO_DB` | `data/portfolio.db` | SQLite file path. |
| `PORTFOLIO_ADMIN_TOKEN` | empty | Bearer token for admin endpoints. Required for writes. |
| `PORTFOLIO_CONTACT_ORIGINS` | empty | Comma-separated additional browser origins for the contact form, e.g. `http://localhost:4321`. Same-origin requests are always allowed. |

The frontend reads `CONTENT_API_URL` (default `http://127.0.0.1:8080`) and
`CONTENT_SYNC=off` to skip syncing and reuse the last generated content. The
contact form reads `PUBLIC_CONTACT_API_URL`; it defaults to the same-origin
`/api/v1/contact`. For local development, set it to
`http://127.0.0.1:8080/api/v1/contact` (see `frontend/.env.example`) and set
`PORTFOLIO_CONTACT_ORIGINS=http://localhost:4321` on the backend.

## API

Entries have the shape `{ kind, locale, slug, data, body }`, where `data` is the
frontmatter object the frontend expects and `body` is Markdown.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/healthz` | none | Liveness probe. |
| GET | `/admin/` | none | Local browser UI; all content API calls still require bearer auth. |
| POST | `/api/v1/contact` | public | Validate and store a contact message. |
| OPTIONS | `/api/v1/contact` | public | CORS preflight for allowed browser origins. |
| GET | `/api/v1/projects?locale=id` | none | Projects sorted by `order`. |
| GET | `/api/v1/articles?locale=id` | none | Published articles, newest first. |
| GET | `/api/v1/admin/projects?locale=id` | bearer | Same, including drafts. |
| POST | `/api/v1/admin/projects` | bearer | Create. `409` if the slug exists. |
| GET | `/api/v1/admin/projects/{locale}/{slug}` | bearer | Read one entry. |
| PUT | `/api/v1/admin/projects/{locale}/{slug}` | bearer | Replace `data` and `body`. |
| DELETE | `/api/v1/admin/projects/{locale}/{slug}` | bearer | Delete. `204` on success. |

`articles` works the same way. `locale` is `id` or `en`; slugs are lowercase
letters, numbers, and hyphens. `PUT` cannot rename a slug — delete and recreate.

### Example: create a project

```bash
curl -X POST http://127.0.0.1:8080/api/v1/admin/projects \
  -H "Authorization: Bearer $PORTFOLIO_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "locale": "id",
    "slug": "proyek-baru",
    "body": "Catatan pembuka dalam Markdown.",
    "data": {
      "translationKey": "proyek-baru",
      "title": "Proyek Baru",
      "summary": "Ringkasan untuk daftar proyek.",
      "category": "Otomasi",
      "focus": "Otomasi",
      "status": "Berjalan",
      "order": 3,
      "overview": "Penjelasan singkat proyek."
    }
  }'
```

Then rebuild the site: `cd ../frontend && npm run build`.

### Content rules

- `translationKey` links the Indonesian and English versions of one item.
  Keep it identical in both; the language switcher and hreflang depend on it.
- Unknown fields are rejected, as are missing required fields. Field names
  match `frontend/src/content.config.ts`.
- `publishedAt` / `updatedAt` accept `YYYY-MM-DD` (RFC3339 is normalized).
- `draft: true` hides an article from the public list, and therefore from the
  blog, sitemap, and RSS after the next build.
- `repo` must be a full `http(s)` URL when present.

## Contact submissions

`POST /api/v1/contact` accepts JSON with `name`, `email`, `subject`, `message`,
`locale`, and the honeypot field `website`:

```bash
curl -X POST http://127.0.0.1:8080/api/v1/contact \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Example Sender",
    "email": "sender@example.com",
    "subject": "Project question",
    "message": "A message with at least twenty characters.",
    "locale": "en",
    "website": ""
  }'
```

A valid submission returns `201` with a random reference such as
`{"id":"msg_…","status":"received"}`. The message itself is never echoed.
Validation failures return `400` with a `fields` object. Limits:

- name 2–100 characters; valid email up to 254 bytes; optional subject up to
  150 characters; message 20–5000 characters; locale `id` or `en`.
- 5 submissions/hour per client IP, 16 KiB request body, JSON only.
- A filled `website` honeypot receives a normal response but is not stored.
- Messages go into `contact_submissions` with status `new`. There is no public
  read API for them; query the database locally to review messages.
- Same-origin browser requests are allowed automatically. Additional origins
  require `PORTFOLIO_CONTACT_ORIGINS`; unknown origins receive `403`.

In production, Nginx should proxy only this exact public endpoint to the Go
service and set `X-Forwarded-For`. Forwarding headers are trusted only when the
direct peer is loopback, preventing clients from spoofing rate-limit identity.

## Security

- Binds to `127.0.0.1` by default; do not expose `/admin/` or the admin API
  through the tunnel or Nginx. They are for local browser, curl, and script use.
- Bearer token compared in constant time; tokens come from the environment and
  are never logged or committed.
- 120 requests/minute per client globally; contact submissions additionally
  allow 5/hour. Admin bodies are capped at 1 MiB and contact bodies at 16 KiB.
  Responses are JSON with `Cache-Control: no-store`. CORS is restricted to
  same-origin and explicitly configured contact-form origins.
- SQL is always parameterized. Content is stored and returned as data; the
  frontend renders it as Markdown, never as raw HTML. Contact submissions are
  private data and have no public read endpoint.

## Tests and target build

```bash
gofmt -l .
go vet ./...
go test ./...

# Termux/ARMv7 target used in production
GOOS=linux GOARCH=arm GOARM=7 go build ./...
```

Deployment (Nginx, runit, backups of the SQLite file) is Phase 7. Never delete
`data/` during a deploy; it holds the live content and contact submissions.
