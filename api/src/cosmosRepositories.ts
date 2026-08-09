import { CosmosClient, type Container } from '@azure/cosmos';
import type { PlayerSelection, Song, Team } from '@songcollector/shared';
import type { PlayerSelectionRepository, Repositories, SongRepository, TeamRepository } from './repositories.js';

type ItemDocument = ({ kind: 'team' } & Team & { partitionKey: string }) |
  ({ kind: 'selection' } & PlayerSelection & { partitionKey: string }) |
  ({ kind: 'song' } & Song & { partitionKey: 'catalog' });
const teamPartition = (teamId: string) => `team:${teamId}`;
const strip = <T extends { partitionKey: string; kind: string }>(document: T): Omit<T, 'partitionKey' | 'kind'> => {
  const { partitionKey: _partitionKey, kind: _kind, ...value } = document;
  void _partitionKey; void _kind;
  return value;
};

class CosmosTeamRepository implements TeamRepository {
  constructor(private readonly container: Container) {}
  async list() { const { resources } = await this.container.items.query<ItemDocument>({ query: "SELECT * FROM c WHERE c.kind = 'team'" }).fetchAll(); return resources.map((item) => strip(item as ItemDocument & { kind: 'team' }) as Team).sort((a, b) => a.name.localeCompare(b.name)); }
  async getById(id: string) { try { const { resource } = await this.container.item(id, teamPartition(id)).read<ItemDocument>(); return resource ? strip(resource as ItemDocument & { kind: 'team' }) as Team : undefined; } catch (error) { if ((error as { code?: number }).code === 404) return undefined; throw error; } }
  async getBySlug(slug: string) { const { resources } = await this.container.items.query<ItemDocument>({ query: "SELECT * FROM c WHERE c.kind = 'team' AND c.slug = @slug", parameters: [{ name: '@slug', value: slug }] }).fetchAll(); const item = resources[0]; return item ? strip(item as ItemDocument & { kind: 'team' }) as Team : undefined; }
  async create(item: Team) { await this.container.items.create({ ...item, id: item.id, kind: 'team', partitionKey: teamPartition(item.id) }); return item; }
  async update(item: Team) { await this.container.item(item.id, teamPartition(item.id)).replace({ ...item, kind: 'team', partitionKey: teamPartition(item.id) }); return item; }
}

class CosmosSelectionRepository implements PlayerSelectionRepository {
  constructor(private readonly container: Container) {}
  async listByTeam(teamId: string) { const { resources } = await this.container.items.query<ItemDocument>({ query: "SELECT * FROM c WHERE c.kind = 'selection'" }, { partitionKey: teamPartition(teamId) }).fetchAll(); return resources.map((item) => strip(item as ItemDocument & { kind: 'selection' }) as PlayerSelection).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
  async getById(id: string) { const { resources } = await this.container.items.query<ItemDocument>({ query: "SELECT * FROM c WHERE c.kind = 'selection' AND c.id = @id", parameters: [{ name: '@id', value: id }] }).fetchAll(); const item = resources[0]; return item ? strip(item as ItemDocument & { kind: 'selection' }) as PlayerSelection : undefined; }
  async create(item: PlayerSelection) { await this.container.items.create({ ...item, kind: 'selection', partitionKey: teamPartition(item.teamId) }); return item; }
  async update(item: PlayerSelection) { await this.container.item(item.id, teamPartition(item.teamId)).replace({ ...item, kind: 'selection', partitionKey: teamPartition(item.teamId) }); return item; }
  async delete(id: string) { const item = await this.getById(id); if (!item) return false; await this.container.item(id, teamPartition(item.teamId)).delete(); return true; }
}

class CosmosSongRepository implements SongRepository {
  constructor(private readonly container: Container) {}
  async list() { const { resources } = await this.container.items.query<ItemDocument>({ query: "SELECT * FROM c WHERE c.kind = 'song'" }, { partitionKey: 'catalog' }).fetchAll(); return resources.map((item) => strip(item as ItemDocument & { kind: 'song' }) as Song).sort((a, b) => a.title.localeCompare(b.title)); }
  async getById(id: string) { try { const { resource } = await this.container.item(id, 'catalog').read<ItemDocument>(); return resource ? strip(resource as ItemDocument & { kind: 'song' }) as Song : undefined; } catch (error) { if ((error as { code?: number }).code === 404) return undefined; throw error; } }
  async upsert(item: Song) { await this.container.items.upsert({ ...item, kind: 'song', partitionKey: 'catalog' }); return item; }
}

export interface CosmosSettings { endpoint: string; key: string; database: string; container: string }
export async function createCosmosRepositories(settings: CosmosSettings): Promise<Repositories> {
  const client = new CosmosClient({ endpoint: settings.endpoint, key: settings.key });
  const { database } = await client.databases.createIfNotExists({ id: settings.database });
  const { container } = await database.containers.createIfNotExists({ id: settings.container, partitionKey: { paths: ['/partitionKey'] } });
  return { teams: new CosmosTeamRepository(container), selections: new CosmosSelectionRepository(container), songs: new CosmosSongRepository(container) };
}
