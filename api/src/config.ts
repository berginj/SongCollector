import { createCosmosRepositories } from './cosmosRepositories.js';
import { createLocalRepositories } from './localRepositories.js';
import type { Repositories } from './repositories.js';

export class ConfigurationError extends Error { constructor(message: string) { super(message); this.name = 'ConfigurationError'; } }

export async function createConfiguredRepositories(environment: NodeJS.ProcessEnv = process.env): Promise<Repositories> {
  const backend = (environment.STORAGE_BACKEND || 'local').toLowerCase();
  if (backend === 'local') return createLocalRepositories(environment.SONGCOLLECTOR_DATA_DIR);
  if (backend !== 'cosmos') throw new ConfigurationError(`Unsupported STORAGE_BACKEND: ${backend}`);
  const values = {
    endpoint: environment.COSMOS_ENDPOINT,
    key: environment.COSMOS_KEY,
    database: environment.COSMOS_DATABASE,
    container: environment.COSMOS_CONTAINER,
  };
  const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new ConfigurationError(`Cosmos storage is selected but these settings are missing: ${missing.join(', ')}`);
  return createCosmosRepositories(values as Record<keyof typeof values, string>);
}
