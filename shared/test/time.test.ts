import { describe, expect, it } from 'vitest';
import { formatTimestamp, parseTimestamp } from '../src';

describe('timestamps', () => {
  it.each([['0:00', 0], ['0:59', 59], ['12:05', 725], [' 2:30 ', 150]])('parses %s', (value, expected) => expect(parseTimestamp(value)).toBe(expected));
  it.each(['1:60', '1:5', '-1:20', '01:20', 'abc', '1.20'])('rejects %s', (value) => expect(() => parseTimestamp(value)).toThrow(/m:ss/));
  it('normalizes absent values', () => { expect(parseTimestamp('')).toBeUndefined(); expect(parseTimestamp(undefined)).toBeUndefined(); });
  it('formats seconds', () => { expect(formatTimestamp(0)).toBe('0:00'); expect(formatTimestamp(125)).toBe('2:05'); expect(formatTimestamp(undefined)).toBe(''); });
  it.each([-1, 1.5, Number.NaN])('rejects invalid seconds %s', (value) => expect(() => formatTimestamp(value)).toThrow());
});
