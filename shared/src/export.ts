import type { ExportResult, PlayerSelection, Team } from './models.js';
import { formatTimestamp } from './time.js';

export interface TeamExporter { export(team: Team, selections: PlayerSelection[]): ExportResult }

export function escapeCsv(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const csvRows = (selections: PlayerSelection[]) => [
  ['Player Name', 'Jersey Number', 'Song Title', 'Artist', 'Start Time', 'YouTube URL'],
  ...selections.map((item) => [item.playerName, item.jerseyNumber, item.songTitle, item.artist, formatTimestamp(item.startTimeSeconds), item.youtubeUrl]),
];

export class GenericCsvExporter implements TeamExporter {
  export(team: Team, selections: PlayerSelection[]): ExportResult {
    return {
      filename: `${team.slug}-song-selections.csv`,
      mediaType: 'text/csv; charset=utf-8',
      content: '\uFEFF' + csvRows(selections).map((row) => row.map(escapeCsv).join(',')).join('\r\n') + '\r\n',
    };
  }
}

export class BallparkDjSetupExporter extends GenericCsvExporter {}

export function formatSetupText(team: Team, selections: PlayerSelection[]): string {
  const entries = selections.map((item) => [
    `${item.playerName} (#${item.jerseyNumber})`,
    `${item.songTitle} — ${item.artist}`,
    `Start: ${formatTimestamp(item.startTimeSeconds) || 'not specified'}`,
    `YouTube: ${item.youtubeUrl}`,
  ].join('\n'));
  return [`${team.name} — BallparkDJ Setup Aid`, '', ...entries.flatMap((entry, index) => index ? ['---', entry] : [entry]), '', 'Review every selection and timing before game day. This file is a setup aid, not a verified direct-import format.'].join('\n');
}

export class PlainTextSetupExporter implements TeamExporter {
  export(team: Team, selections: PlayerSelection[]): ExportResult {
    return { filename: `${team.slug}-setup.txt`, mediaType: 'text/plain; charset=utf-8', content: formatSetupText(team, selections) };
  }
}
