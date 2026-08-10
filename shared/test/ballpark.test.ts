import { describe, expect, it } from 'vitest';
import { normalizeImportText, parseBallparkDjCsv } from '../src/ballpark';

describe('BallparkDJ CSV parser', () => {
  it('handles official columns, quoted commas, and timestamps', () => {
    const rows = parseBallparkDjCsv('Number,FirstName,LastName,SongName,SongStart,SongLength,SongOverlap\n07,Taylor,Swift,"We Are, Young",0:08,30,5');
    expect(rows[0]).toMatchObject({ jerseyNumber: '07', playerName: 'Taylor Swift', songTitle: 'We Are, Young', startTimeSeconds: 8, songLength: '30', songOverlap: '5' });
  });

  it('reports missing values and invalid starts instead of silently dropping rows', () => {
    const rows = parseBallparkDjCsv('Number,FirstName,LastName,SongName,SongStart\n,,,"",1:60');
    expect(rows[0]?.issues).toEqual(expect.arrayContaining(['A jersey number is required.', 'A first or last name is required.', 'A song title is required.', 'SongStart must be m:ss or a whole number of seconds.']));
  });

  it('normalizes accents and punctuation for matching', () => {
    expect(normalizeImportText('Beyoncé — Halo & More')).toBe('beyonce halo and more');
  });
});
