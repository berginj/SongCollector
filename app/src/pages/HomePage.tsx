import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function HomePage() {
  const [slug, setSlug] = useState(''); const navigate = useNavigate();
  const openTeam = (event: FormEvent) => { event.preventDefault(); const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); if (normalized) navigate(`/teams/${normalized}`); };
  return <>
    <section className="hero"><div className="eyebrow">Walk-up music, organized</div><h1>Every player. One clean lineup.</h1><p>Collect walk-up song choices, spot mix-ups, and hand coaches a game-day-ready setup sheet.</p><div className="hero-actions"><Link className="button primary" to="/discover">Explore song ideas</Link><a className="button ghost" href="#find-team">Find my team</a></div></section>
    <section className="home-grid" id="find-team">
      <article className="card feature-card"><span className="step">01</span><h2>Open your team</h2><p>Use the team link from your coach, or enter its short name.</p><form onSubmit={openTeam}><label htmlFor="team-slug">Team short name</label><div className="inline-form"><input id="team-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="arlington-sage-12u-purple" required /><button className="button primary">Go</button></div></form></article>
      <article className="card feature-card"><span className="step">02</span><h2>Need inspiration?</h2><p>Browse a modest starter catalog by genre, era, or game-day vibe. Every choice still needs review.</p><Link className="text-link" to="/discover">Browse the catalog →</Link></article>
      <article className="card feature-card"><span className="step">Coach</span><h2>Manage the lineup</h2><p>Create teams, correct entries, copy setup details, and export the complete list.</p><Link className="text-link" to="/admin">Open coach admin →</Link></article>
    </section>
  </>;
}
