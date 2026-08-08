const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);

export interface YouTubeVideo { videoId: string; url: string }

export function parseYouTubeUrl(value: string): YouTubeVideo {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Enter a valid YouTube URL.'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Enter an HTTP(S) YouTube URL.');
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!ALLOWED_HOSTS.has(hostname)) throw new Error('Only genuine YouTube URLs are supported.');

  let videoId: string | null = null;
  if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (url.pathname === '/watch') {
    videoId = url.searchParams.get('v');
  } else {
    const match = /^\/(?:shorts|embed)\/([^/?#]+)/.exec(url.pathname);
    videoId = match?.[1] ?? null;
  }
  if (!videoId || !VIDEO_ID.test(videoId)) throw new Error('The YouTube URL must contain a valid 11-character video ID.');
  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}
