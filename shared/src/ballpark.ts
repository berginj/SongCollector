import { parseTimestamp } from './time.js';

export interface BallparkDjCsvRow {
  rowId: string;
  lineNumber: number;
  jerseyNumber: string;
  firstName: string;
  lastName: string;
  playerName: string;
  songTitle: string;
  startTimeSeconds?: number;
  songLength?: string;
  songOverlap?: string;
  issues: string[];
}

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsvRecords(input: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"' && cell.length === 0) quoted = true;
    else if (character === ',') { row.push(cell); cell = ''; }
    else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim() !== '')) records.push(row);
      row = [];
    } else cell += character;
  }
  if (quoted) throw new Error('The BallparkDJ CSV contains an unfinished quoted field.');
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) records.push(row);
  }
  return records;
}

function parseStart(value: string): { seconds?: number; issue?: string } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (/^\d+$/.test(trimmed)) return { seconds: Number(trimmed) };
  try { return { seconds: parseTimestamp(trimmed) }; }
  catch { return { issue: 'SongStart must be m:ss or a whole number of seconds.' }; }
}

export function parseBallparkDjCsv(input: string): BallparkDjCsvRow[] {
  const records = parseCsvRecords(input.trim());
  if (records.length < 2) throw new Error('Paste a BallparkDJ CSV with a header row and at least one player.');
  const headers = (records[0] ?? []).map(normalizeHeader);
  const column = (name: string, ...aliases: string[]) => {
    const index = [name, ...aliases].map(normalizeHeader).map((value) => headers.indexOf(value)).find((value) => value >= 0);
    return index === undefined ? -1 : index;
  };
  const numberColumn = column('number', 'jersey', 'jerseynumber');
  const firstNameColumn = column('firstname', 'first');
  const lastNameColumn = column('lastname', 'last');
  const songColumn = column('songname', 'song', 'title');
  const startColumn = column('songstart', 'start', 'starttime');
  if (numberColumn < 0 || songColumn < 0 || startColumn < 0) {
    throw new Error('Expected BallparkDJ columns Number, SongName, and SongStart.');
  }
  const valueAt = (record: string[], index: number) => index < 0 ? '' : (record[index] ?? '').trim();
  const lengthColumn = column('songlength', 'length');
  const overlapColumn = column('songoverlap', 'overlap');
  return records.slice(1).map((record, index) => {
    const jerseyNumber = valueAt(record, numberColumn).replace(/^#/, '').trim();
    const firstName = valueAt(record, firstNameColumn);
    const lastName = valueAt(record, lastNameColumn);
    const playerName = `${firstName} ${lastName}`.trim();
    const songTitle = valueAt(record, songColumn);
    const start = parseStart(valueAt(record, startColumn));
    const issues = [...(start.issue ? [start.issue] : [])];
    if (!jerseyNumber) issues.push('A jersey number is required.');
    if (!playerName) issues.push('A first or last name is required.');
    if (!songTitle) issues.push('A song title is required.');
    return {
      rowId: `ballpark-row-${index + 1}`,
      lineNumber: index + 2,
      jerseyNumber,
      firstName,
      lastName,
      playerName,
      songTitle,
      startTimeSeconds: start.seconds,
      songLength: valueAt(record, lengthColumn) || undefined,
      songOverlap: valueAt(record, overlapColumn) || undefined,
      issues,
    };
  });
}

export function normalizeImportText(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function normalizePlayerName(value: string): string {
  return normalizeImportText(value);
}
