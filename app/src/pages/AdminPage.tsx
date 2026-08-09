import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Team } from '@songcollector/shared';
import { api } from '../api';
import { useAdmin } from '../AdminContext';
import { ErrorMessage, Loading } from '../components/Status';

export function AdminPage() {
  const admin = useAdmin(); const [candidate, setCandidate] = useState(''); const [teams, setTeams] = useState<Team[]>(); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [ageDivision, setAgeDivision] = useState('');
  useEffect(() => {
    if (!admin.token) return;
    let active = true; setLoading(true); setError('');
    api.teams(admin.token).then((value) => { if (active) setTeams(value); }).catch((reason: Error) => { if (active) { setError(reason.message); admin.clearToken(); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin]);
  const unlock = (event: FormEvent) => { event.preventDefault(); admin.setToken(candidate.replace(/\s+/g, '')); };
  const create = async (event: FormEvent) => { event.preventDefault(); setError(''); try { const team = await api.createTeam({ name, slug, ageDivision: ageDivision || undefined }, admin.token); setTeams((current) => [...(current ?? []), team]); setName(''); setSlug(''); setAgeDivision(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create team.'); } };
  if (!admin.token || !teams) return <div className="page narrow"><section className="admin-lock card"><div className="lock-icon" aria-hidden="true">◆</div><div className="eyebrow">Coach access</div><h1>Open team administration</h1><p>Enter the admin token configured by the operator. It stays only in this browser tab's memory.</p>{error && <ErrorMessage message={error} />}<form onSubmit={unlock}><label htmlFor="admin-token">Admin token</label><input id="admin-token" type="password" value={candidate} onChange={(event) => setCandidate(event.target.value)} autoComplete="off" required /><span className="hint">Leading or trailing spaces are ignored.</span><button className="button primary wide" disabled={loading}>{loading ? 'Checking…' : 'Continue'}</button></form></section></div>;
  return <div className="page"><section className="section-heading"><div><div className="eyebrow">Coach admin</div><h1>Teams</h1><p>Create a collection link or open an existing lineup.</p></div><button className="button ghost" onClick={() => { admin.clearToken(); setTeams(undefined); setCandidate(''); }}>Lock admin</button></section>{error && <ErrorMessage message={error} />}<div className="admin-grid"><section><h2>Your teams</h2><div className="team-list">{teams.map((team) => <Link className="team-list-item" to={`/admin/teams/${team.id}`} key={team.id}><div><strong>{team.name}</strong><span>/{team.slug}</span></div><span aria-hidden="true">→</span></Link>)}{teams.length === 0 && <div className="empty card">No teams yet.</div>}</div></section><section className="card"><h2>Create a team</h2><form className="form compact" onSubmit={create}><label htmlFor="new-name">Team name</label><input id="new-name" value={name} onChange={(event) => { setName(event.target.value); if (!slug) setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} required /><label htmlFor="new-slug">Link short name</label><input id="new-slug" value={slug} onChange={(event) => setSlug(event.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /><label htmlFor="new-age">Age / division <span>(optional)</span></label><input id="new-age" value={ageDivision} onChange={(event) => setAgeDivision(event.target.value)} /><button className="button primary">Create team</button></form></section></div></div>;
}

export function AdminLoading() { return <div className="page"><Loading /></div>; }
