import { describe, expect, it } from 'vitest';
import { parseYouTubeUrl } from '../src';

describe('YouTube URLs', () => {
  it.each([
    'https://www.youtube.com/watch?v=ru0K8uYEZWw&t=2s',
    'http://youtube.com/watch?v=ru0K8uYEZWw',
    'https://youtu.be/ru0K8uYEZWw?si=abc',
    'https://www.youtube.com/shorts/ru0K8uYEZWw',
    'https://m.youtube.com/embed/ru0K8uYEZWw',
  ])('normalizes %s', (value) => expect(parseYouTubeUrl(value)).toEqual({ videoId: 'ru0K8uYEZWw', url: 'https://www.youtube.com/watch?v=ru0K8uYEZWw' }));
  it.each([
    'https://youtube.com.evil.example/watch?v=ru0K8uYEZWw',
    'https://notyoutube.com/watch?v=ru0K8uYEZWw',
    'https://www.youtube.com/watch?v=too-short',
    'https://www.youtube.com/channel/ru0K8uYEZWw',
    'javascript:alert(1)',
    'not a url',
  ])('rejects %s', (value) => expect(() => parseYouTubeUrl(value)).toThrow());
});
