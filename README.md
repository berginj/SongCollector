# SongCollector

SongCollector is a production-shaped MVP for collecting youth-team walk-up song choices. Players can open a team link, browse a curated starter catalog, submit a YouTube-backed choice, and see the public lineup. Coaches can create teams, correct or remove submissions, copy setup details, and download CSV or text setup aids.

The repository is a TypeScript npm-workspace monorepo:

- `app` — responsive React 19/Vite frontend
- `api` — Azure Functions v4 API using code-based `app.http()` registration
- `shared` — Zod contracts, timestamp/YouTube helpers, duplicate matching, and exporters
- `data` — structurally validated starter catalog
- `docs` — architecture, API, deployment, and BallparkDJ notes

## Requirements

- Node.js 22
- npm 10 or newer
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local) for `npm run dev`

## Local setup

```powershell
npm install
Copy-Item api/local.settings.example.json api/local.settings.json
```

Edit `api/local.settings.json` and replace `ADMIN_TOKEN` with a long random value. Then initialize the sample team and catalog:

```powershell
$env:ADMIN_TOKEN='the-same-local-token'
npm run seed
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to Functions on `http://localhost:7071`. The local repository writes `.local-data/songcollector.json` atomically; this directory is ignored by Git.

The root commands are:

```text
npm install       Install all workspace dependencies
npm run dev       Start Vite and Azure Functions together
npm run seed      Idempotently load songs and create the sample team
npm run lint      Run ESLint
npm run typecheck Type-check every workspace
npm run test      Run unit, API integration, repository, and React tests
npm run build     Build the frontend, Functions bundle, and shared package
```

`npm run seed` reads `data/songs.json`. Local storage already initializes its catalog from that file; seeding remains useful because it also creates `Arlington Sage 12U Purple`. With Cosmos selected, the command upserts the catalog into Cosmos and creates the sample team only when absent.

## Configuration

Copy `.env.example` as a reference; Azure Functions reads values from `api/local.settings.json` locally and application settings in Azure.

| Setting | Required | Purpose |
| --- | --- | --- |
| `ADMIN_TOKEN` | For admin APIs | Shared MVP coach token. Missing means admin endpoints return a configuration error. |
| `STORAGE_BACKEND` | No | `local` (default) or `cosmos`. |
| `SONGCOLLECTOR_DATA_DIR` | Local only | Directory containing `songcollector.json`; defaults to `.local-data` relative to the process. |
| `COSMOS_ENDPOINT` | Cosmos | Cosmos account endpoint. |
| `COSMOS_KEY` | Cosmos | Cosmos account key. |
| `COSMOS_DATABASE` | Cosmos | Database name. |
| `COSMOS_CONTAINER` | Cosmos | Shared container name. |

Selecting `cosmos` with any missing Cosmos setting fails explicitly. The application never silently falls back to local disk.

## Production direction

The production deployment uses Azure Static Web Apps for `app` and its managed Functions API, with Node.js 22 configured by `app/public/staticwebapp.config.json`. The live site is `https://calm-flower-078db380f.7.azurestaticapps.net` in resource group `songcollector-prod-rg`; the Static Web App and Cosmos account are both named `songcollector527176`. Cosmos is serverless, single-region East US 2, and uses database `SongCollector`, container `items`, and partition key `/partitionKey`. The six application settings above are configured in the Static Web App/Functions environment, and the catalog/team seed has been loaded into Cosmos.

The checked-in workflow at `.github/workflows/azure-static-web-apps-calm-flower-078db380f.yml` deploys on pushes to `main` with `app_location: app`, `api_location: api`, and `output_location: dist`. The API build produces an ESM `api/dist/functions.js` bundle for the Node 22 Functions runtime; the app production TypeScript config excludes test files so Oryx can build the frontend in isolation.

The deployment workflow is created by Azure Static Web Apps source integration and uses the repository's GitHub Actions secret for the Static Web Apps deployment token. Keep that secret and all Azure app settings out of source control.

### Production monitoring

Application Insights (`songcollector527176-ai`) is connected to the 30-day, 0.023-GB/day quota Log Analytics workspace `songcollector527176-law`. Sampling is set to 25% through `APPINSIGHTS_SAMPLING_PERCENTAGE`. The `songcollector-alerts` action group emails the signed-in subscription owner when any of these rules fire: more than five failed API requests in five minutes, average API latency above two seconds, or any Cosmos DB HTTP 429 throttling. The subscription also has the `songcollector-15-monthly` Cost Management budget scoped to the production resource group.

## Product and security notes

- The admin token is sent only in `X-Admin-Token`. The UI holds it in React memory: never source code, URLs, local storage, cookies, or application records.
- The shared token is an MVP control. Replace it with Microsoft Entra ID or Static Web Apps authentication before wider multi-coach use.
- Local JSON is for one local API process. Use Cosmos for concurrent production writes.
- YouTube previews create a `youtube-nocookie.com` iframe only after Play is pressed, do not autoplay, and retain an external YouTube link.
- Song examples are starting points, not rankings, release claims, or content-safety certifications. Review every full track and timing before use.
- SongCollector never downloads, proxies, caches, modifies, or redistributes audio.
- CSV and text files are coach setup aids, not claimed to be verified BallparkDJ direct-import files. See [docs/ballparkdj.md](docs/ballparkdj.md).

## Troubleshooting

- **`func` is not recognized:** install Azure Functions Core Tools v4, then restart the terminal.
- **Admin returns 503:** set `ADMIN_TOKEN`; for Cosmos also confirm every `COSMOS_*` value.
- **Admin returns 401:** enter the exact runtime token. Refreshing the page intentionally clears the UI token.
- **Team or catalog is empty:** run `npm run seed` with the same storage environment used by the API.
- **Cosmos partition errors:** recreate or migrate the container with partition key path `/partitionKey`; the path cannot be changed in place.
- **A preview will not play:** embedding can be disabled by the uploader. Use the always-visible external YouTube link.

See [docs/api.md](docs/api.md) for the HTTP contract and [docs/architecture.md](docs/architecture.md) for persistence and operations.
