import { Link, useParams } from 'react-router-dom';
import { formatTimestamp, type PlayerSelection, type Team } from '@songcollector/shared';
import { api } from '../api';
import { ErrorMessage, Loading } from '../components/Status';
import { useLoad } from '../hooks';

export function TeamPage() {
  const { slug = '' } = useParams();
  const state = useLoad(async () => { const team = await api.teamBySlug(slug); const selections = await api.selections(team.id); return { team, selections }; }, [slug]);
  if (state.loading) return <div className="page"><Loading label="Opening team…" /></div>;
  if (state.error || !state.data) return <div className="page narrow"><ErrorMessage message={state.error || 'Team not found.'} /><Link to="/">Back home</Link></div>;
  const { team, selections } = state.data as { team: Team; selections: PlayerSelection[] };
  return <div className="page">
    <section className="team-banner"><div><div className="eyebrow">Team song board</div><h1>{team.name}</h1>{team.ageDivision && <p>{team.ageDivision}</p>}</div><div className="hero-actions"><Link className="button primary" to={`/teams/${team.slug}/submit`}>Submit my song</Link><Link className="button ghost light" to={`/teams/${team.slug}/discover`}>Find a song</Link></div></section>
    <section className="section-heading"><div><h2>Player selections</h2><p>{selections.length ? `${selections.length} ${selections.length === 1 ? 'choice' : 'choices'} collected` : 'Be the first to add a choice.'}</p></div></section>
    {selections.length === 0 ? <div className="empty card"><h3>The lineup is waiting</h3><p>Submit a song to get this team started.</p></div> : <div className="selection-grid">{selections.map((item) => <article className="selection-card" key={item.id}><div className="jersey">#{item.jerseyNumber}</div><div><h3>{item.playerName}</h3><strong>{item.songTitle}</strong><p>{item.artist}</p>{item.startTimeSeconds !== undefined && <span className="tag">Starts {formatTimestamp(item.startTimeSeconds)}</span>}</div></article>)}</div>}
  </div>;
}
