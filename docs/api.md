# HTTP API

The base path is `/api`. JSON success responses are `{ "data": value }`; JSON errors are `{ "error": { "code", "message", "fieldErrors?", "details?" } }`.

## Public routes

| Method | Route | Result |
| --- | --- | --- |
| `GET` | `/teams/slug/:slug` | Team by public slug |
| `GET` | `/teams/:teamId` | Team by ID |
| `GET` | `/teams/:teamId/selections` | That team's selections only |
| `POST` | `/teams/:teamId/selections` | Created selection and warnings |
| `GET` | `/songs` | Curated catalog |
| `GET` | `/songs/:songId` | Catalog song |

BallparkDJ import and YouTube lookup are admin-protected:

| Method | Route | Result |
| --- | --- | --- |
| `POST` | `/teams/:teamId/import/ballparkdj/preview` | Parse CSV, match catalog titles, identify conflicts, and return row-level actions |
| `POST` | `/teams/:teamId/import/ballparkdj/confirm` | Apply explicitly selected create/update/skip actions |
| `GET` | `/youtube/search?title=…&artist=…` | Return up to five coach-selectable YouTube candidates |

The preview accepts `Number, FirstName, LastName, SongName, SongStart, SongLength, SongOverlap`. Unmatched rows require a coach-entered artist and URL. Import never uses a player name or jersey number as record identity, and jersey collisions require an explicit override. YouTube lookup is server-side and optional: set `YOUTUBE_API_KEY` to use the official Data API; without it, curated matches and manual URLs continue to work.

Create-selection body:

```json
{
  "playerName": "Taylor",
  "jerseyNumber": "07",
  "songTitle": "Happy",
  "artist": "Pharrell Williams",
  "youtubeUrl": "https://youtu.be/ZbZSe6N_BXs",
  "startTime": "0:08",
  "songId": "happy",
  "allowDuplicateJersey": false
}
```

`startTime` and `songId` are optional. When `songId` is present, the server resolves catalog metadata and recommended start time rather than trusting duplicated catalog fields. A successful duplicate song looks like:

```json
{
  "data": {
    "selection": { "id": "..." },
    "warnings": [{ "code": "DUPLICATE_SONG", "message": "Jordan already selected this song.", "selectionId": "...", "playerName": "Jordan" }]
  }
}
```

A jersey collision returns `409` with code `DUPLICATE_JERSEY` and `details.existingSelection`. Retry the same request with `allowDuplicateJersey: true` only after an explicit user choice.

## Admin routes

Send `X-Admin-Token: value` on every request. Wrong or absent credentials return `401 UNAUTHORIZED`. When the server has no `ADMIN_TOKEN`, admin routes return `503 STORAGE_CONFIGURATION_ERROR`.

| Method | Route | Result |
| --- | --- | --- |
| `GET` | `/teams` | All teams |
| `POST` | `/teams` | Create a team |
| `PATCH` | `/teams/:teamId` | Update name, slug, or division |
| `PATCH` | `/selections/:selectionId` | Correct selection fields |
| `DELETE` | `/selections/:selectionId` | Delete; returns `204` |
| `GET` | `/teams/:teamId/export.csv` | UTF-8 CSV attachment |
| `GET` | `/teams/:teamId/export.txt` | Plain-text setup attachment |

Create team accepts `name`, `slug`, and optional `ageDivision`. Update bodies are partial but must contain at least one editable field. Selection update accepts partial create fields; it follows the same URL, timestamp, catalog, duplicate-song, and duplicate-jersey rules.

## Error codes

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_JSON` | Body was not valid JSON |
| 400 | `VALIDATION_ERROR` | Schema, YouTube URL, or timestamp failed validation |
| 401 | `UNAUTHORIZED` | Admin token missing or incorrect |
| 404 | `NOT_FOUND` | Team, song, or selection does not exist |
| 409 | `SLUG_CONFLICT` | Team slug is already used |
| 409 | `DUPLICATE_JERSEY` | Explicit override is required |
| 503 | `STORAGE_CONFIGURATION_ERROR` | Admin token/storage configuration is incomplete |
| 500 | `INTERNAL_ERROR` | Safe unexpected-error response |
