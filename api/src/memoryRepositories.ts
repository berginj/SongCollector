import type { PlayerSelection, Song, Team } from '@songcollector/shared';
import type { PlayerSelectionRepository, Repositories, SongRepository, TeamRepository } from './repositories.js';

const copy = <T>(value: T): T => structuredClone(value);

export class MemoryTeamRepository implements TeamRepository {
  private readonly items = new Map<string, Team>();
  constructor(items: Team[] = []) { items.forEach((item) => this.items.set(item.id, copy(item))); }
  async list() { return [...this.items.values()].map(copy).sort((a, b) => a.name.localeCompare(b.name)); }
  async getById(id: string) { const item = this.items.get(id); return item && copy(item); }
  async getBySlug(slug: string) { const item = [...this.items.values()].find((team) => team.slug === slug); return item && copy(item); }
  async create(team: Team) { this.items.set(team.id, copy(team)); return copy(team); }
  async update(team: Team) { this.items.set(team.id, copy(team)); return copy(team); }
}

export class MemorySelectionRepository implements PlayerSelectionRepository {
  private readonly items = new Map<string, PlayerSelection>();
  constructor(items: PlayerSelection[] = []) { items.forEach((item) => this.items.set(item.id, copy(item))); }
  async listByTeam(teamId: string) { return [...this.items.values()].filter((item) => item.teamId === teamId).map(copy).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
  async getById(id: string) { const item = this.items.get(id); return item && copy(item); }
  async create(item: PlayerSelection) { this.items.set(item.id, copy(item)); return copy(item); }
  async update(item: PlayerSelection) { this.items.set(item.id, copy(item)); return copy(item); }
  async delete(id: string) { return this.items.delete(id); }
}

export class MemorySongRepository implements SongRepository {
  private readonly items = new Map<string, Song>();
  constructor(items: Song[] = []) { items.forEach((item) => this.items.set(item.id, copy(item))); }
  async list() { return [...this.items.values()].map(copy).sort((a, b) => a.title.localeCompare(b.title)); }
  async getById(id: string) { const item = this.items.get(id); return item && copy(item); }
  async upsert(item: Song) { this.items.set(item.id, copy(item)); return copy(item); }
}

export function createMemoryRepositories(initial: { teams?: Team[]; selections?: PlayerSelection[]; songs?: Song[] } = {}): Repositories {
  return {
    teams: new MemoryTeamRepository(initial.teams),
    selections: new MemorySelectionRepository(initial.selections),
    songs: new MemorySongRepository(initial.songs),
  };
}
