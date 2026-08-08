import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import writeFileAtomic from 'write-file-atomic';
import { playerSelectionSchema, songSchema, teamSchema, type PlayerSelection, type Song, type Team } from '@songcollector/shared';
import seedSongData from '../../data/songs.json';
import type { PlayerSelectionRepository, Repositories, SongRepository, TeamRepository } from './repositories.js';

interface Database { teams: Team[]; selections: PlayerSelection[]; songs: Song[] }

class LocalJsonStore {
  private database: Database | undefined;
  private writeQueue: Promise<void> = Promise.resolve();
  readonly filePath: string;

  constructor(dataDirectory: string) {
    this.filePath = path.join(path.resolve(dataDirectory), 'songcollector.json');
  }

  async read(): Promise<Database> {
    if (!this.database) this.database = await this.load();
    return structuredClone(this.database);
  }

  async mutate<T>(operation: (database: Database) => T): Promise<T> {
    let result!: T;
    this.writeQueue = this.writeQueue.then(async () => {
      if (!this.database) this.database = await this.load();
      result = operation(this.database);
      await this.persist(this.database);
    });
    await this.writeQueue;
    return structuredClone(result);
  }

  private async load(): Promise<Database> {
    try {
      const raw = JSON.parse(await readFile(this.filePath, 'utf8')) as Database;
      return {
        teams: raw.teams.map((item) => teamSchema.parse(item)),
        selections: raw.selections.map((item) => playerSelectionSchema.parse(item)),
        songs: raw.songs.map((item) => songSchema.parse(item)),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const songs = songSchema.array().parse(seedSongData);
      const database: Database = { teams: [], selections: [], songs };
      await this.persist(database);
      return database;
    }
  }

  private async persist(database: Database): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFileAtomic(this.filePath, JSON.stringify(database, null, 2) + '\n', { encoding: 'utf8' });
  }
}

class LocalTeamRepository implements TeamRepository {
  constructor(private readonly store: LocalJsonStore) {}
  async list() { return (await this.store.read()).teams.sort((a, b) => a.name.localeCompare(b.name)); }
  async getById(id: string) { return (await this.store.read()).teams.find((item) => item.id === id); }
  async getBySlug(slug: string) { return (await this.store.read()).teams.find((item) => item.slug === slug); }
  async create(item: Team) { return this.store.mutate((db) => { db.teams.push(item); return item; }); }
  async update(item: Team) { return this.store.mutate((db) => { const index = db.teams.findIndex((value) => value.id === item.id); if (index < 0) throw new Error('Team disappeared during update.'); db.teams[index] = item; return item; }); }
}

class LocalSelectionRepository implements PlayerSelectionRepository {
  constructor(private readonly store: LocalJsonStore) {}
  async listByTeam(teamId: string) { return (await this.store.read()).selections.filter((item) => item.teamId === teamId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
  async getById(id: string) { return (await this.store.read()).selections.find((item) => item.id === id); }
  async create(item: PlayerSelection) { return this.store.mutate((db) => { db.selections.push(item); return item; }); }
  async update(item: PlayerSelection) { return this.store.mutate((db) => { const index = db.selections.findIndex((value) => value.id === item.id); if (index < 0) throw new Error('Selection disappeared during update.'); db.selections[index] = item; return item; }); }
  async delete(id: string) { return this.store.mutate((db) => { const index = db.selections.findIndex((item) => item.id === id); if (index < 0) return false; db.selections.splice(index, 1); return true; }); }
}

class LocalSongRepository implements SongRepository {
  constructor(private readonly store: LocalJsonStore) {}
  async list() { return (await this.store.read()).songs.sort((a, b) => a.title.localeCompare(b.title)); }
  async getById(id: string) { return (await this.store.read()).songs.find((item) => item.id === id); }
  async upsert(item: Song) { return this.store.mutate((db) => { const index = db.songs.findIndex((value) => value.id === item.id); if (index < 0) db.songs.push(item); else db.songs[index] = item; return item; }); }
}

export function createLocalRepositories(dataDirectory = process.env.SONGCOLLECTOR_DATA_DIR || path.resolve(process.cwd(), '.local-data')): Repositories & { filePath: string } {
  const store = new LocalJsonStore(dataDirectory);
  return {
    teams: new LocalTeamRepository(store),
    selections: new LocalSelectionRepository(store),
    songs: new LocalSongRepository(store),
    filePath: store.filePath,
  };
}
