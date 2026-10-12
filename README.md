# MedAtlas

Cross-database biomedical research discovery. One query, eleven public-source search adapters; traceable pagination and source-level failures, plus official links for non-aggregated resources.

## Status

- Node.js 22 / TypeScript / Fastify REST API
- Search providers: PubMed, Europe PMC, Crossref, ClinicalTrials.gov, openFDA, DailyMed, OpenAlex, OpenAlex dissertations, PubMed-indexed guidelines, DataCite datasets and dissertations. Three licensed Wanfang adapters are also available when authorized.
- Source-by-source totals and page cursors; exact DOI / PMID / PMCID deduplication
- Static frontend under `public/`; can be hosted by GitHub Pages **after Pages is enabled**
- PostgreSQL search audits, source observations and recurring watch configuration
- Docker Compose example; GitHub CI builds and tests
- Backend is **not hosted by GitHub Pages**. For live public search, deploy API and PostgreSQL separately and set the repository Actions variable `API_BASE_URL`.

## Local setup

Node.js 22+, npm. From repository root:

```sh
npm install
npm run build
npm test
npm run dev
```

Open http://localhost:3000 and verify http://localhost:3000/api/health. Without DATABASE_URL the API operates without persistent history; do not enable recurring watches.

For PostgreSQL:

```sh
cp .env.example .env
# Set POSTGRES_PASSWORD, ADMIN_TOKEN (strong random value) and CORS_ORIGIN
docker compose --env-file .env up --build
```

Use environment variables on production providers, not secrets committed to GitHub. For the Compose file configure POSTGRES_PASSWORD and ADMIN_TOKEN. The app migrates tables during startup.

## API endpoints

- `GET /api/health`: liveness; the `database` property only means configured, not an exhaustive upstream health check
- `GET /api/sources`: all supported automated and manual sources with authorization flags
- `GET /api/search?q=lung%20cancer&limit=15&sources=pubmed,europepmc`: unified paged search; optional `strict=true` refuses non-equivalent Boolean syntax
- `GET /api/search/stream?...same query parameters...`: server-sent events: source results arrive independently, followed by a completeness summary
- `GET /api/admin/changes`, `GET /api/admin/source-health`: authenticated record-level change evidence and last source query status
- `GET /api/admin/watches`, `POST /api/admin/watches`, `DELETE /api/admin/watches/:id`: requires `Authorization: Bearer <ADMIN_TOKEN>`

For source capabilities and incomplete coverage, see [COVERAGE.md](COVERAGE.md). The search API includes `queryCapabilities` and warns when Boolean operations may not be preserved by an adapter. Crossref and OpenAlex use cursors for deep pagination.

For pagination, base64url-encode a JSON mapping of source IDs to the individual `next` cursors and pass as `cursors`. Errors must never be interpreted as zero matches.

## Deploy

GitHub Pages: the repository is currently configured to deploy `main /docs`. All canonical frontend files live in `public/`, mirrored into `docs/` for Pages. CI verifies these copies match. A separate manual Actions-based Pages workflow also exists but is not needed when deploying from `/docs`. For a private repo, check whether your GitHub plan supports Pages.

Deploy the Dockerfile to a Node-compatible host and use managed PostgreSQL (or Compose on a server). Configure `DATABASE_URL`, `ADMIN_TOKEN`, `CORS_ORIGIN` set to the actual Pages origin, and optionally `ENABLE_SYNC_WORKER=true`. In GitHub repository Settings → Secrets and variables → Actions → Variables, set `API_BASE_URL` to the HTTPS root of the deployed backend; re-run the Pages workflow.

## Caveats

- No claim of zero omissions in upstream databases. Only fetched pages are represented.
- The polling worker saves watch results, totals and metadata snapshots for explicitly permitted sources; it detects changes in records actually revisited, not a complete license-safe corpus mirror.
- API access terms, quotas, country connectivity, and provider changes need routine review.
- No user-account or per-user API-key management yet. Admin watch endpoints are intended for an operator only.
- Do not store full text or redistribute licensed datasets without permission.

## Domestic coverage and policy

For the currently verified Chinese resource access pathways, licensed Wanfang adapter specifics, and registry-level limitations, read [COVERAGE.md](COVERAGE.md). Do not upload keys or licensed credentials into GitHub. Some guideline services, including NICE syndication, require separate agreements and licences. WHO ICTRP redistribution has additional terms including prohibitions on commercial uses of downloaded datasets; do not automatically ingest that material into a commercial project without permission.
