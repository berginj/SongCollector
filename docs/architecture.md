# Architecture and operations

## Request flow

The Vite single-page app calls same-origin `/api` endpoints. Azure Functions v4 registers each route in code and delegates to `SongCollectorService`. The service owns validation, canonical YouTube data, timestamps, duplicate behavior, identifiers, and timestamps. Repository and exporter interfaces keep infrastructure out of business logic.

```text
React/Vite → HTTP envelope + X-Admin-Token → Functions handlers
          → SongCollectorService → Team / Selection / Song repositories
                                 → local JSON or Cosmos DB
                                 → CSV / plain-text exporters
```

All success payloads use `{ "data": ... }`. All handled failures use `{ "error": { "code", "message", "fieldErrors?", "details?" } }`. Unexpected failures are logged by Functions and return a generic message without internal details.

## BallparkDJ import and YouTube enrichment

Coaches can paste or upload a BallparkDJ CSV in the team admin page. The API parses quoted fields, preserves jersey strings such as `07`, normalizes names and titles for matching, and returns a preview before any write. Exact catalog matches supply canonical artist, URL, video ID, and recommended start. Unmatched rows require coach-entered metadata; duplicate jerseys and ambiguous matches are shown as conflicts. The confirm request carries explicit row IDs and `create`, `update`, or `skip` actions.

The API exposes a `YouTubeSearchProvider` boundary backed by the official YouTube Data API v3 when `YOUTUBE_API_KEY` is present. It searches `title + artist`, limits results to music videos, returns five candidates, and lets the coach choose the canonical HTTPS watch URL. Add caching, rate limiting, and review heuristics before broad use. Never scrape pages or auto-approve a candidate based only on a title match.

## Data rules

- IDs are server-generated UUIDs except stable catalog song IDs.
- Timestamps are server-generated ISO 8601 UTC strings.
- Team slugs are unique, lowercase kebab case.
- Jersey numbers remain strings, preserving values such as `07`.
- Empty optional inputs normalize to `undefined`.
- Start times use non-negative `m:ss`, with seconds limited to `00`–`59`.
- Supported YouTube watch, short-link, Shorts, and embed URLs normalize to `https://www.youtube.com/watch?v=VIDEO_ID`; only exact supported YouTube hosts and 11-character IDs are accepted.
- A catalog `songId` causes the API to resolve and store canonical title, artist, URL, video ID, and default start time.

Selections are always identified by UUID. Player name and jersey number are never used as record identity. Duplicate songs are allowed with a warning. A duplicate jersey returns `409 DUPLICATE_JERSEY` until the client intentionally retries with `allowDuplicateJersey: true`.

## Local persistence

`createLocalRepositories` shares one in-process store across repository adapters. It serializes mutation promises and uses an atomic-file writer so readers never observe partially written JSON. Missing storage initializes from `data/songs.json`. It is deliberately scoped to one API process and is unsuitable for scaled-out or concurrent production hosts.

Set `SONGCOLLECTOR_DATA_DIR` to control the location. Do not commit `.local-data`.

## Cosmos DB

Provision a Cosmos DB for NoSQL serverless account and a container partitioned on `/partitionKey`. All entities use one container:

| Entity | `partitionKey` | Item `id` |
| --- | --- | --- |
| Team | `team:{teamId}` | Team UUID |
| Player selection | `team:{teamId}` | Selection UUID |
| Catalog song | `catalog` | Stable song ID |

This co-locates a team and all of its selections. Catalog reads remain in one separate logical partition. Slug lookup and admin team listing are cross-partition queries; team-lineup and catalog queries specify their partition.

Set `STORAGE_BACKEND=cosmos`, `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE`, and `COSMOS_CONTAINER`. The app calls create-if-not-exists for database/container convenience, but production infrastructure should provision and lock them down first. Incomplete Cosmos settings result in `STORAGE_CONFIGURATION_ERROR`; they never trigger local fallback.

For production, prefer managed identity and scoped data-plane roles over a long-lived account key when the hosting arrangement supports it. The current key configuration is an MVP deployment path.

## Security boundary

Public reads and player submission are anonymous by product design. Coach routes require the exact `X-Admin-Token` value. Missing server configuration disables them. The browser retains a user-entered token in component memory only; a reload clears it. Avoid logging headers and never include the token in query strings.

The single shared token is a temporary control. Before broader use, add Entra ID or Static Web Apps authentication, role-based team access, token rotation, rate limiting, an audit trail, and abuse monitoring.

## Azure deployment status

The production MVP is deployed in subscription resource group `songcollector-prod-rg`:

| Resource | Configuration |
| --- | --- |
| Static Web Apps | `songcollector527176`, Free SKU, `calm-flower-078db380f.7.azurestaticapps.net` |
| Managed Functions API | Node 22, code-based v4 registration, same-origin `/api` routes |
| Cosmos DB | `songcollector527176`, NoSQL Serverless, East US 2, Session consistency, local periodic backup redundancy |
| Cosmos data | Database `SongCollector`, container `items`, partition key `/partitionKey` |
| Application Insights | `songcollector527176-ai`, workspace-based, 25% request sampling |
| Log Analytics | `songcollector527176-law`, 30-day retention, 0.023 GB/day ingestion quota |
| Cost budget | `songcollector-15-monthly`, $15/month, production resource-group filter |

The checked-in workflow `.github/workflows/azure-static-web-apps-calm-flower-078db380f.yml` deploys `main` with `app_location: app`, `api_location: api`, and `output_location: dist`. It runs through Azure Static Web Apps source integration and requires the generated GitHub Actions deployment secret.

The deployment has been smoke-tested against the public catalog and seeded team. Repository CI-equivalent checks (`npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`) pass.

Remaining operator hardening includes replacing the shared admin token with Entra ID or Static Web Apps authentication, moving Cosmos from account keys to managed identity/data-plane RBAC, adding a custom domain and staging environment, and documenting backup/restore and token-rotation procedures.

## Monitoring and alerts

The `songcollector-alerts` action group emails the signed-in Azure subscription owner. Metric alerts are configured for:

- more than five failed Application Insights requests in five minutes;
- average Application Insights request duration above two seconds; and
- any Cosmos DB request with HTTP status 429.

The Log Analytics daily quota is intentionally small for this MVP. Review the Azure Monitor and Cost Management blades periodically; a budget alert is not a hard spending cap.
