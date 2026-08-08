import songs from '../../data/songs.json';
import { createConfiguredRepositories } from './config.js';
import { SongCollectorService } from './service.js';

const result = await new SongCollectorService(await createConfiguredRepositories()).seed(songs as unknown[]);
console.log(`Seeded ${result.songs} catalog songs. Team: ${result.team?.name ?? 'not requested'}.`);
