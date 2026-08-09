import { describe, expect, it } from 'vitest';
import { findDuplicateJersey, findDuplicateSong, type PlayerSelection } from '../src';

const selection: PlayerSelection = { id: 'cf926987-8192-469d-9812-9d71e44ea70e', teamId: '977a5108-1976-4261-b47a-1bd25920e7d7', playerName: 'Taylor', jerseyNumber: '07', songTitle: '  Happy ', artist: 'Pharrell  Williams', youtubeUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs', youtubeVideoId: 'ZbZSe6N_BXs', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

describe('duplicate matching', () => {
  it('matches a song by normalized metadata or video ID', () => {
    expect(findDuplicateSong([selection], { songTitle: 'happy', artist: 'pharrell williams', youtubeVideoId: 'different00' })?.id).toBe(selection.id);
    expect(findDuplicateSong([selection], { songTitle: 'other', artist: 'other', youtubeVideoId: selection.youtubeVideoId })?.id).toBe(selection.id);
  });
  it('matches jerseys as strings without using names as identity', () => {
    expect(findDuplicateJersey([selection], '07')?.playerName).toBe('Taylor');
    expect(findDuplicateJersey([selection], '7')).toBeUndefined();
    expect(findDuplicateJersey([selection], '07', selection.id)).toBeUndefined();
  });
});
