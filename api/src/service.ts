import {
  createSelectionSchema,
  createTeamSchema,
  findDuplicateJersey,
  findDuplicateSong,
  GenericCsvExporter,
  parseTimestamp,
  parseYouTubeUrl,
  PlainTextSetupExporter,
  songSchema,
  updateSelectionSchema,
  updateTeamSchema,
  type DuplicateWarning,
  type ExportResult,
  type PlayerSelection,
  type Song,
  type Team,
} from '@songcollector/shared';
import { ZodError } from 'zod';
import type { Repositories } from './repositories.js';

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
  constructor(private readonly repositories: Repositories) {}

  listTeams() { return this.repositories.teams.list(); }
  async getTeam(id: string) { const team = await this.repositories.teams.getById(id); if (!team) throw notFound('Team'); return team; }
  async getTeamBySlug(slug: string) { const team = await this.repositories.teams.getBySlug(slug.trim().toLowerCase()); if (!team) throw notFound('Team'); return team; }
  async listSelections(teamId: string) { await this.getTeam(teamId); return this.repositories.selections.listByTeam(teamId); }
  listSongs() { return this.repositories.songs.list(); }
  async getSong(id: string) { const song = await this.repositories.songs.getById(id); if (!song) throw notFound('Song'); return song; }

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
