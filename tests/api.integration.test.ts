import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayerSelection, Team } from '@songcollector/shared';
import { createApiHandlers } from '../api/src/http';
import { createLocalRepositories } from '../api/src/localRepositories';
import { SongCollectorService } from '../api/src/service';

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const context = { error: vi.fn() } as unknown as InvocationContext;

function request(method: string, params: Record<string, string> = {}, value?: unknown, token?: string) {
  return new HttpRequest({ method, url: 'http://localhost/api/test', params, headers: token ? { 'x-admin-token': token } : {}, ...(value !== undefined && { body: { string: JSON.stringify(value) } }) });
}
const data = <T>(response: HttpResponseInit) => (response.jsonBody as { data: T }).data;
const error = (response: HttpResponseInit) => (response.jsonBody as { error: { code: string; message: string } }).error;

describe('API integration with local persistence', () => {
  it('creates, persists, reads, exports, corrects, validates, authenticates, and deletes a selection', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'songcollector-api-')); directories.push(directory);
    const repositories = createLocalRepositories(directory);
    const handlers = createApiHandlers(new SongCollectorService(repositories), 'test-admin-token');

    const unauthorized = await handlers.getTeams(request('GET'), context);
    expect(unauthorized.status).toBe(401); expect(error(unauthorized).code).toBe('UNAUTHORIZED');

    const createdTeam = await handlers.createTeam(request('POST', {}, { name: 'Arlington Sage 12U Purple', slug: 'arlington-sage-12u-purple', ageDivision: '12U' }, 'test-admin-token'), context);
    expect(createdTeam.status).toBe(201);
    const team = data<Team>(createdTeam);

    const invalid = await handlers.createSelection(request('POST', { teamId: team.id }, { playerName: '', jerseyNumber: '7' }), context);
    expect(invalid.status).toBe(400); expect(error(invalid).code).toBe('VALIDATION_ERROR');

    const missing = await handlers.getTeam(request('GET', { teamId: crypto.randomUUID() }), context);
    expect(missing.status).toBe(404); expect(error(missing).code).toBe('NOT_FOUND');

    const submitted = await handlers.createSelection(request('POST', { teamId: team.id }, {
      playerName: 'Taylor', jerseyNumber: '07', songTitle: 'Happy', artist: 'Pharrell Williams',
      youtubeUrl: 'https://youtu.be/ZbZSe6N_BXs', startTime: '0:08',
    }), context);
    expect(submitted.status).toBe(201);
    const selection = data<{ selection: PlayerSelection; warnings: unknown[] }>(submitted).selection;
    expect(selection.youtubeUrl).toBe('https://www.youtube.com/watch?v=ZbZSe6N_BXs');

    const duplicateJersey = await handlers.createSelection(request('POST', { teamId: team.id }, {
      playerName: 'Jordan', jerseyNumber: '07', songTitle: 'Thunder', artist: 'Imagine Dragons', youtubeUrl: 'https://youtu.be/fKopy74weus',
    }), context);
    expect(duplicateJersey.status).toBe(409); expect(error(duplicateJersey).code).toBe('DUPLICATE_JERSEY');

    const duplicateSong = await handlers.createSelection(request('POST', { teamId: team.id }, {
      playerName: 'Morgan', jerseyNumber: '8', songTitle: ' happy ', artist: 'PHARRELL WILLIAMS', youtubeUrl: 'https://youtu.be/ZbZSe6N_BXs', allowDuplicateJersey: false,
    }), context);
    expect(data<{ warnings: Array<{ code: string }> }>(duplicateSong).warnings[0]?.code).toBe('DUPLICATE_SONG');

    const reopened = createLocalRepositories(directory);
    expect(await reopened.selections.listByTeam(team.id)).toHaveLength(2);
    expect((await reopened.teams.getBySlug(team.slug))?.name).toBe(team.name);

    const list = await handlers.getTeams(request('GET', {}, undefined, 'test-admin-token'), context);
    expect(data<Team[]>(list)).toHaveLength(1);
    const selections = await handlers.getSelections(request('GET', { teamId: team.id }), context);
    expect(data<PlayerSelection[]>(selections).map((item) => item.playerName)).toEqual(['Taylor', 'Morgan']);

    const csv = await handlers.exportCsv(request('GET', { teamId: team.id }, undefined, 'test-admin-token'), context);
    expect(csv.headers?.['content-type']).toContain('text/csv'); expect(csv.body).toContain('Taylor'); expect(csv.body).toContain('0:08');
    const plain = await handlers.exportText(request('GET', { teamId: team.id }, undefined, 'test-admin-token'), context);
    expect(plain.body).toContain('Taylor (#07)'); expect(plain.body).toContain('setup aid');

    const corrected = await handlers.updateSelection(request('PATCH', { selectionId: selection.id }, { playerName: 'Taylor B', jerseyNumber: '9' }, 'test-admin-token'), context);
    expect(data<{ selection: PlayerSelection }>(corrected).selection.playerName).toBe('Taylor B');
    const deleted = await handlers.deleteSelection(request('DELETE', { selectionId: selection.id }, undefined, 'test-admin-token'), context);
    expect(deleted.status).toBe(204);
    const deletedAgain = await handlers.deleteSelection(request('DELETE', { selectionId: selection.id }, undefined, 'test-admin-token'), context);
    expect(deletedAgain.status).toBe(404);
  });

  it('disables admin endpoints when ADMIN_TOKEN is absent', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'songcollector-api-')); directories.push(directory);
    const handlers = createApiHandlers(new SongCollectorService(createLocalRepositories(directory)), undefined);
    const response = await handlers.getTeams(request('GET'), context);
    expect(response.status).toBe(503); expect(error(response).code).toBe('STORAGE_CONFIGURATION_ERROR');
  });

  it('previews and commits a BallparkDJ import with catalog matching', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'songcollector-api-')); directories.push(directory);
    const repositories = createLocalRepositories(directory); const service = new SongCollectorService(repositories); const handlers = createApiHandlers(service, 'test-admin-token');
    const team = data<Team>(await handlers.createTeam(request('POST', {}, { name: 'Import Team', slug: 'import-team' }, 'test-admin-token'), context));
    await service.seed([{ id: 'catalog-song', title: 'Catalog Import Song', artist: 'Import Artist', youtubeUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs', youtubeVideoId: 'ZbZSe6N_BXs', recommendedStartSeconds: 8, genres: [], eras: [], vibes: [], requiresReview: true }], false);
    const preview = await handlers.previewBallparkImport(request('POST', { teamId: team.id }, { csv: 'Number,FirstName,LastName,SongName,SongStart\n07,Taylor,,Catalog Import Song,0:08' }, 'test-admin-token'), context);
    expect(preview.status).toBe(200); const value = data<{ rows: Array<{ action: string; songId?: string }>; matched: number }>(preview); expect(value.matched).toBe(1); expect(value.rows[0]?.action).toBe('create'); expect(value.rows[0]?.songId).toBe('catalog-song');
    const committed = await handlers.confirmBallparkImport(request('POST', { teamId: team.id }, { rows: [{ rowId: 'ballpark-row-1', action: 'create', playerName: 'Taylor', jerseyNumber: '07', songTitle: 'Catalog Import Song', artist: 'Import Artist', youtubeUrl: 'https://youtu.be/ZbZSe6N_BXs', startTime: '0:08', songId: 'catalog-song' }] }, 'test-admin-token'), context);
    expect(committed.status).toBe(200); expect(data<{ created: number }>(committed).created).toBe(1); expect(await repositories.selections.listByTeam(team.id)).toHaveLength(1);
  });
});
