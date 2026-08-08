import type { PlayerSelection, Song, Team } from '@songcollector/shared';

export interface TeamRepository {
  list(): Promise<Team[]>;
  getById(id: string): Promise<Team | undefined>;
  getBySlug(slug: string): Promise<Team | undefined>;
  create(team: Team): Promise<Team>;
  update(team: Team): Promise<Team>;
}

export interface PlayerSelectionRepository {
  listByTeam(teamId: string): Promise<PlayerSelection[]>;
  getById(id: string): Promise<PlayerSelection | undefined>;
  create(selection: PlayerSelection): Promise<PlayerSelection>;
  update(selection: PlayerSelection): Promise<PlayerSelection>;
  delete(id: string): Promise<boolean>;
}

export interface SongRepository {
  list(): Promise<Song[]>;
  getById(id: string): Promise<Song | undefined>;
  upsert(song: Song): Promise<Song>;
}

export interface Repositories {
  teams: TeamRepository;
  selections: PlayerSelectionRepository;
  songs: SongRepository;
}
