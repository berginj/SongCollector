import { useState } from 'react';
import { formatTimestamp } from '@songcollector/shared';

export function YouTubePreview({ videoId, url, startSeconds, title }: { videoId: string; url: string; startSeconds?: number; title: string }) {
  const [playing, setPlaying] = useState(false);
  const embed = `https://www.youtube-nocookie.com/embed/${videoId}${startSeconds ? `?start=${startSeconds}` : ''}`;
  return <div className="preview">
    {playing
      ? <iframe src={embed} title={`YouTube preview: ${title}`} loading="lazy" allowFullScreen allow="encrypted-media; picture-in-picture" />
      : <button type="button" className="preview-button" onClick={() => setPlaying(true)}><span aria-hidden="true">▶</span> Play preview{startSeconds !== undefined ? ` from ${formatTimestamp(startSeconds)}` : ''}</button>}
    <a href={url} target="_blank" rel="noreferrer">Open on YouTube <span className="sr-only">(opens in a new tab)</span></a>
  </div>;
}
