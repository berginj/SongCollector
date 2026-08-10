import {
  createSelectionSchema,
  ballparkImportCommitSchema,
  ballparkImportPreviewRequestSchema,
  createTeamSchema,
  findDuplicateJersey,
  findDuplicateSong,
  GenericCsvExporter,
  parseTimestamp,
  parseYouTubeUrl,
  normalizeImportText,
  normalizePlayerName,
  parseBallparkDjCsv,
  PlainTextSetupExporter,
  songSchema,
  updateSelectionSchema,
  updateTeamSchema,
  type DuplicateWarning,
  type BallparkImportCommitResult,
  type BallparkImportPreview,
  type BallparkImportPreviewRow,
  type ExportResult,
  type PlayerSelection,
  type Song,
  type Team,
} from '@songcollector/shared';
import { ZodError } from 'zod';
import type { Repositories } from './repositories.js';
import { createYouTubeSearchProvider, type YouTubeSearchProvider, type YouTubeSearchResult } from './youtubeSearch.js';

export class AppError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown, public readonly fieldErrors?: Record<string, string[]>) { super(message); }
}

const notFound = (resource: string) => new AppError(404, 'NOT_FOUND', `${resource} was not found.`);
const parseVideo = (value: string) => {
  try { return parseYouTubeUrl(value); }
  catch (error) { throw new AppError(400, 'VALIDATION_ERROR', 'Check the submitted fields.', undefined, { youtubeUrl: [error instanceof Error ? error.message : 'Enter a valid YouTube URL.'] }); }
};
const parseStart = (value: string | undefined) => {
  try { return parseTimestamp(value); }
  catch (error) { throw new AppError(400, 'VALIDATION_ERROR', 'Check the submitted fields.', undefined, { startTime: [error instanceof Error ? error.message : 'Enter a valid start time.'] }); }
};

export class SongCollectorService {
  constructor(private readonly repositories: Repositories, private readonly youtubeSearch: YouTubeSearchProvider = createYouTubeSearchProvider()) {}

  listTeams() { return this.repositories.teams.list(); }
  async getTeam(id: string) { const team = await this.repositories.teams.getById(id); if (!team) throw notFound('Team'); return team; }
  async getTeamBySlug(slug: string) { const team = await this.repositories.teams.getBySlug(slug.trim().toLowerCase()); if (!team) throw notFound('Team'); return team; }
  async listSelections(teamId: string) { await this.getTeam(teamId); return this.repositories.selections.listByTeam(teamId); }
  listSongs() { return this.repositories.songs.list(); }
  async getSong(id: string) { const song = await this.repositories.songs.getById(id); if (!song) throw notFound('Song'); return song; }
  async searchYouTube(title: string, artist: string): Promise<YouTubeSearchResult> {
    if (!title.trim() || !artist.trim()) throw new AppError(400, 'VALIDATION_ERROR', 'Song title and artist are required.');
    return this.youtubeSearch.search(title, artist);
  }

  async createTeam(raw: unknown): Promise<Team> {
    const input = createTeamSchema.parse(raw);
    if (await this.repositories.teams.getBySlug(input.slug)) throw new AppError(409, 'SLUG_CONFLICT', 'That team slug is already in use.', { slug: input.slug });
    const now = new Date().toISOString();
    return this.repositories.teams.create({ id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now });
  }

  async updateTeam(id: string, raw: unknown): Promise<Team> {
    const current = await this.getTeam(id);
    const input = updateTeamSchema.parse(raw);
    if (input.slug && input.slug !== current.slug) {
      const conflicting = await this.repositories.teams.getBySlug(input.slug);
      if (conflicting && conflicting.id !== id) throw new AppError(409, 'SLUG_CONFLICT', 'That team slug is already in use.', { slug: input.slug });
    }
    return this.repositories.teams.update({ ...current, ...input, updatedAt: new Date().toISOString() });
  }

  async createSelection(teamId: string, raw: unknown): Promise<{ selection: PlayerSelection; warnings: DuplicateWarning[] }> {
    await this.getTeam(teamId);
    const input = createSelectionSchema.parse(raw);
    let source: Pick<Song, 'id' | 'title' | 'artist' | 'youtubeUrl' | 'youtubeVideoId' | 'recommendedStartSeconds'> | undefined;
    if (input.songId) source = await this.getSong(input.songId);
    const youtube = source ? { url: source.youtubeUrl, videoId: source.youtubeVideoId } : parseVideo(input.youtubeUrl);
    const startTimeSeconds = input.startTime === undefined && source ? source.recommendedStartSeconds : parseStart(input.startTime);
    const selections = await this.repositories.selections.listByTeam(teamId);
    const duplicateJersey = findDuplicateJersey(selections, input.jerseyNumber);
    if (duplicateJersey && !input.allowDuplicateJersey) {
      throw new AppError(409, 'DUPLICATE_JERSEY', `Jersey #${input.jerseyNumber} already has a selection.`, {
        existingSelection: duplicateJersey,
        retryWith: { allowDuplicateJersey: true },
      });
    }
    const now = new Date().toISOString();
    const selection: PlayerSelection = {
      id: crypto.randomUUID(), teamId, playerName: input.playerName, jerseyNumber: input.jerseyNumber,
      songTitle: source?.title ?? input.songTitle, artist: source?.artist ?? input.artist,
      youtubeUrl: youtube.url, youtubeVideoId: youtube.videoId, startTimeSeconds,
      songId: source?.id, createdAt: now, updatedAt: now,
    };
    const duplicateSong = findDuplicateSong(selections, selection);
    const saved = await this.repositories.selections.create(selection);
    return {
      selection: saved,
      warnings: duplicateSong ? [{ code: 'DUPLICATE_SONG', message: `${duplicateSong.playerName} already selected this song.`, selectionId: duplicateSong.id, playerName: duplicateSong.playerName }] : [],
    };
  }

  async updateSelection(id: string, raw: unknown): Promise<{ selection: PlayerSelection; warnings: DuplicateWarning[] }> {
    const current = await this.repositories.selections.getById(id);
    if (!current) throw notFound('Selection');
    const input = updateSelectionSchema.parse(raw);
    let song: Song | undefined;
    if (input.songId) song = await this.getSong(input.songId);
    const next: PlayerSelection = {
      ...current,
      ...(input.playerName !== undefined && { playerName: input.playerName }),
      ...(input.jerseyNumber !== undefined && { jerseyNumber: input.jerseyNumber }),
      ...(input.songTitle !== undefined && { songTitle: input.songTitle }),
      ...(input.artist !== undefined && { artist: input.artist }),
      ...(input.songId !== undefined && { songId: input.songId }),
      updatedAt: new Date().toISOString(),
    };
    if (song) Object.assign(next, { songTitle: song.title, artist: song.artist, youtubeUrl: song.youtubeUrl, youtubeVideoId: song.youtubeVideoId, startTimeSeconds: input.startTime === undefined ? song.recommendedStartSeconds : parseStart(input.startTime) });
    else {
      if (input.youtubeUrl !== undefined) { const youtube = parseVideo(input.youtubeUrl); Object.assign(next, { youtubeUrl: youtube.url, youtubeVideoId: youtube.videoId }); }
      if (Object.prototype.hasOwnProperty.call(input, 'startTime')) next.startTimeSeconds = parseStart(input.startTime);
    }
    const selections = await this.repositories.selections.listByTeam(current.teamId);
    const duplicateJersey = findDuplicateJersey(selections, next.jerseyNumber, id);
    if (duplicateJersey && !input.allowDuplicateJersey) throw new AppError(409, 'DUPLICATE_JERSEY', `Jersey #${next.jerseyNumber} already has a selection.`, { existingSelection: duplicateJersey, retryWith: { allowDuplicateJersey: true } });
    const duplicateSong = findDuplicateSong(selections, next, id);
    const saved = await this.repositories.selections.update(next);
    return { selection: saved, warnings: duplicateSong ? [{ code: 'DUPLICATE_SONG', message: `${duplicateSong.playerName} already selected this song.`, selectionId: duplicateSong.id, playerName: duplicateSong.playerName }] : [] };
  }

  async deleteSelection(id: string): Promise<void> {
    if (!await this.repositories.selections.delete(id)) throw notFound('Selection');
  }

  async exportTeam(teamId: string, format: 'csv' | 'txt'): Promise<ExportResult> {
    const team = await this.getTeam(teamId);
    const selections = await this.repositories.selections.listByTeam(teamId);
    return format === 'csv' ? new GenericCsvExporter().export(team, selections) : new PlainTextSetupExporter().export(team, selections);
  }

  async previewBallparkDjImport(teamId: string, raw: unknown): Promise<BallparkImportPreview> {
    await this.getTeam(teamId);
    const { csv } = ballparkImportPreviewRequestSchema.parse(raw);
    let parsed;
    try { parsed = parseBallparkDjCsv(csv); }
    catch (error) { throw new AppError(400, 'INVALID_BALLPARKDJ_CSV', error instanceof Error ? error.message : 'Could not parse the BallparkDJ CSV.'); }
    const [songs, selections] = await Promise.all([this.repositories.songs.list(), this.repositories.selections.listByTeam(teamId)]);
    const jerseyCounts = new Map<string, number>();
    for (const row of parsed) jerseyCounts.set(row.jerseyNumber, (jerseyCounts.get(row.jerseyNumber) ?? 0) + 1);
    const rows: BallparkImportPreviewRow[] = parsed.map((row) => {
      const issues = [...row.issues];
      const exactSongMatches = songs.filter((song) => normalizeImportText(song.title) === normalizeImportText(row.songTitle));
      const song = exactSongMatches.length === 1 ? exactSongMatches[0] : undefined;
      if (!song) issues.push('No exact catalog title match; provide artist and a YouTube URL before importing.');
      const normalizedPlayer = normalizePlayerName(row.playerName);
      const existingByJersey = selections.find((selection) => selection.jerseyNumber === row.jerseyNumber);
      const existingByName = selections.find((selection) => normalizePlayerName(selection.playerName) === normalizedPlayer);
      const existing = existingByJersey ?? existingByName;
      if (jerseyCounts.get(row.jerseyNumber) && (jerseyCounts.get(row.jerseyNumber) ?? 0) > 1) issues.push('This jersey number appears more than once in the import.');
      if (existingByJersey && normalizePlayerName(existingByJersey.playerName) !== normalizedPlayer) issues.push(`Jersey #${row.jerseyNumber} is currently assigned to ${existingByJersey.playerName}; confirm the update carefully.`);
      const status = row.issues.length > 0 ? 'invalid' : issues.some((issue) => issue.includes('appears more than once') || issue.includes('currently assigned')) ? 'conflict' : song ? 'matched' : 'unmatched';
      return {
        rowId: row.rowId, lineNumber: row.lineNumber, playerName: row.playerName, jerseyNumber: row.jerseyNumber, songTitle: row.songTitle,
        startTimeSeconds: row.startTimeSeconds, songLength: row.songLength, songOverlap: row.songOverlap,
        artist: song?.artist, youtubeUrl: song?.youtubeUrl, songId: song?.id,
        existingSelectionId: existing?.id, existingPlayerName: existing?.playerName,
        status, issues, action: status === 'matched' ? (existing ? 'update' : 'create') : 'skip',
      };
    });
    return {
      rows,
      matched: rows.filter((row) => row.status === 'matched').length,
      unmatched: rows.filter((row) => row.status === 'unmatched').length,
      conflicts: rows.filter((row) => row.status === 'conflict' || row.status === 'invalid').length,
    };
  }

  async commitBallparkDjImport(teamId: string, raw: unknown): Promise<BallparkImportCommitResult> {
    await this.getTeam(teamId);
    const input = ballparkImportCommitSchema.parse(raw);
    const result: BallparkImportCommitResult = { created: 0, updated: 0, skipped: 0, failed: [] };
    for (const row of input.rows) {
      if (row.action === 'skip') { result.skipped += 1; continue; }
      if (!row.artist || !row.youtubeUrl) { result.failed.push({ rowId: row.rowId, message: 'Artist and a YouTube URL are required for this row.' }); continue; }
      try {
        const values = {
          playerName: row.playerName, jerseyNumber: row.jerseyNumber, songTitle: row.songTitle, artist: row.artist,
          youtubeUrl: row.youtubeUrl, startTime: row.startTime, songId: row.songId, allowDuplicateJersey: row.allowDuplicateJersey,
        };
        if (row.action === 'update') {
          if (!row.existingSelectionId) throw new AppError(400, 'IMPORT_ROW_INVALID', 'Choose an existing selection before updating this row.');
          const existing = await this.repositories.selections.getById(row.existingSelectionId);
          if (!existing || existing.teamId !== teamId) throw new AppError(400, 'IMPORT_ROW_INVALID', 'The existing selection no longer belongs to this team.');
          await this.updateSelection(existing.id, values);
          result.updated += 1;
        } else {
          await this.createSelection(teamId, values);
          result.created += 1;
        }
      } catch (error) {
        result.failed.push({ rowId: row.rowId, message: error instanceof Error ? error.message : 'Could not import this row.' });
      }
    }
    return result;
  }

  async seed(songs: unknown[], createSampleTeam = true): Promise<{ songs: number; team: Team | undefined }> {
    const validSongs = songSchema.array().parse(songs);
    for (const song of validSongs) await this.repositories.songs.upsert(song);
    let team = await this.repositories.teams.getBySlug('arlington-sage-12u-purple');
    if (!team && createSampleTeam) team = await this.createTeam({ name: 'Arlington Sage 12U Purple', slug: 'arlington-sage-12u-purple', ageDivision: '12U' });
    return { songs: validSongs.length, team };
  }
}

export function fieldErrors(error: ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((result, issue) => {
    const field = issue.path.join('.') || '_form';
    (result[field] ||= []).push(issue.message);
    return result;
  }, {});
}
