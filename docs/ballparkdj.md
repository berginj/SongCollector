# BallparkDJ setup exports

SongCollector provides two coach-oriented exports:

- CSV: UTF-8 with a byte-order mark, CRLF rows, RFC-style quoting, and columns `Player Name`, `Jersey Number`, `Song Title`, `Artist`, `Start Time`, and `YouTube URL`.
- Plain text: one readable player block at a time, followed by an explicit review notice.

These outputs are setup aids. Although BallparkDJ publicly lists CSV-related columns in its [release information](https://www.ballparkdj.com/new), its public documentation does not define enough field semantics or an import contract to claim that SongCollector's file is directly importable. Do not represent it as a verified import file.

Recommended coach workflow:

1. Download the setup text or CSV from the team admin page.
2. Review the full version of every song and confirm the intended clean edit.
3. Verify the timestamp against the exact version available to the coach.
4. Enter or import data using the current BallparkDJ workflow, checking every row.
5. Test playback, device volume, offline availability, and lineup order before game day.

Embedding availability cannot be detected reliably across origins. A failed embedded preview does not establish that a video is unavailable; use the external YouTube link.

SongCollector stores links and metadata only. It does not download, proxy, cache, edit, or redistribute audio. Product names belong to their respective owners, and this project is not affiliated with or endorsed by BallparkDJ or YouTube.
