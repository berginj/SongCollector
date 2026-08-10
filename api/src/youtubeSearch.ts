export interface YouTubeCandidate {
  videoId: string;
  title: string;
  channelTitle: string;
  url: string;
  thumbnailUrl?: string;
}

export interface YouTubeSearchResult {
  configured: boolean;
  query: string;
  candidates: YouTubeCandidate[];
}

export interface YouTubeSearchProvider {
  search(title: string, artist: string): Promise<YouTubeSearchResult>;
}

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export class YouTubeDataApiSearchProvider implements YouTubeSearchProvider {
  constructor(private readonly apiKey = process.env.YOUTUBE_API_KEY) {}

  async search(title: string, artist: string): Promise<YouTubeSearchResult> {
    const query = `${title.trim()} ${artist.trim()}`.trim();
    if (!this.apiKey) return { configured: false, query, candidates: [] };
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet'); url.searchParams.set('type', 'video'); url.searchParams.set('videoCategoryId', '10');
    url.searchParams.set('maxResults', '5'); url.searchParams.set('q', query); url.searchParams.set('key', this.apiKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`YouTube search failed (${response.status}).`);
    const payload = await response.json() as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } } }> };
    const candidates = (payload.items ?? []).flatMap((item) => {
      const videoId = item.id?.videoId ?? '';
      if (!videoIdPattern.test(videoId)) return [];
      return [{ videoId, title: item.snippet?.title ?? 'Untitled video', channelTitle: item.snippet?.channelTitle ?? 'Unknown channel', url: `https://www.youtube.com/watch?v=${videoId}`, thumbnailUrl: item.snippet?.thumbnails?.medium?.url }];
    });
    return { configured: true, query, candidates };
  }
}

export function createYouTubeSearchProvider(): YouTubeSearchProvider { return new YouTubeDataApiSearchProvider(); }
