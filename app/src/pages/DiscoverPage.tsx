import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Song } from '@songcollector/shared';
import { api } from '../api';
import { ErrorMessage, Loading } from '../components/Status';
import { YouTubePreview } from '../components/YouTubePreview';
import { useLoad } from '../hooks';

const categories = ['genres', 'eras', 'vibes'] as const;

export function DiscoverPage() {
  const { slug } = useParams(); const navigate = useNavigate(); const state = useLoad(() => api.songs(), []);
  const [query, setQuery] = useState(''); const [genre, setGenre] = useState(''); const [era, setEra] = useState(''); const [vibe, setVibe] = useState('');
  const [teamSlug, setTeamSlug] = useState(''); const [choosing, setChoosing] = useState<Song>();
  const songs = useMemo(() => state.data ?? [], [state.data]);
  const facets = useMemo(() => Object.fromEntries(categories.map((category) => [category, [...new Set(songs.flatMap((song) => song[category]))].sort()])), [songs]) as Record<typeof categories[number], string[]>;
  const filtered = songs.filter((song) => {
    const text = `${song.title} ${song.artist}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (!genre || song.genres.includes(genre)) && (!era || song.eras.includes(era)) && (!vibe || song.vibes.includes(vibe));
  });
  const selectSong = (song: Song) => { if (slug) navigate(`/teams/${slug}/submit?songId=${encodeURIComponent(song.id)}`); else setChoosing(song); };
  const continueToTeam = () => { const normalized = teamSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); if (choosing && normalized) navigate(`/teams/${normalized}/submit?songId=${encodeURIComponent(choosing.id)}`); };
  return <div className="page">
    <section className="discover-heading"><div><div className="eyebrow">Curated starting points</div><h1>Find your game-day sound</h1><p>Search a modest set of ideas. Preview and review the full track with a coach or guardian before choosing.</p></div>{slug && <Link className="button ghost light" to={`/teams/${slug}`}>Back to team</Link>}</section>
    <section className="filters" aria-label="Song filters"><div className="field search"><label htmlFor="song-search">Search title or artist</label><input id="song-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “Queen” or “Happy”" /></div><Filter label="Genre" value={genre} setValue={setGenre} options={facets.genres} /><Filter label="Era" value={era} setValue={setEra} options={facets.eras} /><Filter label="Vibe" value={vibe} setValue={setVibe} options={facets.vibes} /></section>
    {state.loading ? <Loading label="Loading songs…" /> : state.error ? <ErrorMessage message={state.error} /> : <><div className="results-bar"><strong>{filtered.length} songs</strong>{(query || genre || era || vibe) && <button className="text-button" onClick={() => { setQuery(''); setGenre(''); setEra(''); setVibe(''); }}>Clear filters</button>}</div><div className="song-grid">{filtered.map((song) => <article className="song-card" key={song.id}><div className="song-card-body"><div className="tag-row">{song.vibes.slice(0, 2).map((item) => <span className="tag" key={item}>{item}</span>)}</div><h2>{song.title}</h2><p className="artist">{song.artist}</p><p className="review-note">Review required before game day</p><YouTubePreview title={song.title} videoId={song.youtubeVideoId} url={song.youtubeUrl} startSeconds={song.recommendedStartSeconds} /></div><button className="button primary wide" onClick={() => selectSong(song)}>Use This Song</button></article>)}</div>{filtered.length === 0 && <div className="empty card"><h2>No exact matches</h2><p>Clear a filter or try another title or artist.</p></div>}</>}
    {choosing && <div className="modal-backdrop" role="presentation" onMouseDown={() => setChoosing(undefined)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="choose-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={() => setChoosing(undefined)}>×</button><div className="eyebrow">Use “{choosing.title}”</div><h2 id="choose-title">Which team are you on?</h2><p>Enter the short name from your coach's team link.</p><label htmlFor="choose-team">Team short name</label><input id="choose-team" autoFocus value={teamSlug} onChange={(event) => setTeamSlug(event.target.value)} placeholder="arlington-sage-12u-purple" /><button className="button primary wide" onClick={continueToTeam} disabled={!teamSlug.trim()}>Continue</button></section></div>}
  </div>;
}

function Filter({ label, value, setValue, options }: { label: string; value: string; setValue: (value: string) => void; options: string[] }) {
  return <div className="field"><label htmlFor={`filter-${label}`}>{label}</label><select id={`filter-${label}`} value={value} onChange={(event) => setValue(event.target.value)}><option value="">All</option>{options.map((item) => <option key={item}>{item}</option>)}</select></div>;
}
