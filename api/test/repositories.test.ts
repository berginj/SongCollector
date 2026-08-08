import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { PlayerSelection, Team } from '@songcollector/shared';
import { createLocalRepositories } from '../src/localRepositories';
import { createMemoryRepositories } from '../src/memoryRepositories';

const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const teams: Team[] = [
  { id: '977a5108-1976-4261-b47a-1bd25920e7d7', name: 'Alpha', slug: 'alpha', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: '4b5d2a6a-98bf-4c89-9463-aa1d69f2d4e1', name: 'Beta', slug: 'beta', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];
const selection: PlayerSelection = { id: 'cf926987-8192-469d-9812-9d71e44ea70e', teamId: teams[0]!.id, playerName: 'Taylor', jerseyNumber: '7', songTitle: 'Happy', artist: 'Pharrell Williams', youtubeUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs', youtubeVideoId: 'ZbZSe6N_BXs', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

describe('repositories', () => {
  it('supports CRUD and strict team isolation in memory', async () => {
    const repositories = createMemoryRepositories({ teams });
    await repositories.selections.create(selection);
    expect(await repositories.selections.listByTeam(teams[0]!.id)).toEqual([selection]);
    expect(await repositories.selections.listByTeam(teams[1]!.id)).toEqual([]);
    await repositories.selections.update({ ...selection, playerName: 'Taylor B' });
    expect((await repositories.selections.getById(selection.id))?.playerName).toBe('Taylor B');
    expect(await repositories.selections.delete(selection.id)).toBe(true);
    expect(await repositories.selections.delete(selection.id)).toBe(false);
  });
  it('persists atomic local writes and can be reopened', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'songcollector-repo-')); temporary.push(directory);
    const first = createLocalRepositories(directory);
    await first.teams.create(teams[0]!); await first.selections.create(selection);
    const onDisk = JSON.parse(await readFile(first.filePath, 'utf8')) as { teams: Team[] };
    expect(onDisk.teams[0]?.slug).toBe('alpha');
    const reopened = createLocalRepositories(directory);
    expect((await reopened.teams.getBySlug('alpha'))?.id).toBe(teams[0]!.id);
    expect(await reopened.selections.listByTeam(teams[0]!.id)).toHaveLength(1);
    expect(await reopened.selections.listByTeam(teams[1]!.id)).toHaveLength(0);
  });
});
