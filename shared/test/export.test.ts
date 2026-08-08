import { describe, expect, it } from 'vitest';
import { escapeCsv, GenericCsvExporter, PlainTextSetupExporter, type PlayerSelection, type Team } from '../src';

const team: Team = { id: '977a5108-1976-4261-b47a-1bd25920e7d7', name: 'Sage', slug: 'sage', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
const selection: PlayerSelection = { id: 'cf926987-8192-469d-9812-9d71e44ea70e', teamId: team.id, playerName: 'O’Neil, Zoë', jerseyNumber: '07', songTitle: 'Say "Hello"\nAgain', artist: "Guns N' Roses", youtubeUrl: 'https://www.youtube.com/watch?v=ru0K8uYEZWw', youtubeVideoId: 'ru0K8uYEZWw', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

describe('exports', () => {
  it('escapes commas, quotes, newlines, apostrophes, Unicode, and empty values', () => {
    expect(escapeCsv('one,two')).toBe('"one,two"');
    expect(escapeCsv('Say "hi"')).toBe('"Say ""hi"""');
    expect(escapeCsv('one\ntwo')).toBe('"one\ntwo"');
    expect(escapeCsv("O'Neil")).toBe("O'Neil");
    expect(escapeCsv('Zoë')).toBe('Zoë');
    expect(escapeCsv(undefined)).toBe('');
  });
  it('produces UTF-8 RFC-style CSV', () => {
    const result = new GenericCsvExporter().export(team, [selection]);
    expect(result.content.startsWith('\uFEFFPlayer Name')).toBe(true);
    expect(result.content).toContain('"O’Neil, Zoë"');
    expect(result.content).toContain('"Say ""Hello""\nAgain"');
    expect(result.content).toContain(",Guns N' Roses,,https://");
  });
  it('produces coach-friendly text with a limitation notice', () => {
    const result = new PlainTextSetupExporter().export(team, [selection]);
    expect(result.content).toContain('O’Neil, Zoë (#07)');
    expect(result.content).toContain('Start: not specified');
    expect(result.content).toContain('not a verified direct-import format');
  });
});
