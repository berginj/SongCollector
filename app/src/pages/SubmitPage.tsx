import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { formatTimestamp, type Song, type Team } from '@songcollector/shared';
import { api, ApiError } from '../api';
import { ErrorMessage, Loading } from '../components/Status';
import { YouTubePreview } from '../components/YouTubePreview';

interface FormValue { playerName: string; jerseyNumber: string; songTitle: string; artist: string; youtubeUrl: string; startTime: string }
const empty: FormValue = { playerName: '', jerseyNumber: '', songTitle: '', artist: '', youtubeUrl: '', startTime: '' };

export function SubmitPage() {
  const { slug = '' } = useParams(); const [search] = useSearchParams(); const songId = search.get('songId') ?? undefined;
  const [team, setTeam] = useState<Team>(); const [song, setSong] = useState<Song>(); const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({}); const [jerseyConflict, setJerseyConflict] = useState(false);
  const [confirmation, setConfirmation] = useState<{ player: string; warning?: string }>();

  useEffect(() => {
    let active = true;
    Promise.all([api.teamBySlug(slug), songId ? api.song(songId) : Promise.resolve(undefined)]).then(([teamValue, songValue]) => {
      if (!active) return; setTeam(teamValue); setSong(songValue);
      if (songValue) setForm((value) => ({ ...value, songTitle: songValue.title, artist: songValue.artist, youtubeUrl: songValue.youtubeUrl, startTime: formatTimestamp(songValue.recommendedStartSeconds) }));
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not open the form.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, songId]);

  const update = (field: keyof FormValue, value: string) => { setForm((current) => ({ ...current, [field]: value })); setFieldErrors((current) => ({ ...current, [field]: [] })); };
  async function submit(event?: FormEvent, allowDuplicateJersey = false) {
    event?.preventDefault(); if (!team) return; setSubmitting(true); setError(''); setJerseyConflict(false);
    try {
      const result = await api.createSelection(team.id, { ...form, songId, allowDuplicateJersey });
      setConfirmation({ player: result.selection.playerName, warning: result.warnings[0]?.message });
    } catch (reason) {
      if (reason instanceof ApiError) { setFieldErrors(reason.fieldErrors ?? {}); if (reason.code === 'DUPLICATE_JERSEY') setJerseyConflict(true); else setError(reason.message); }
      else setError('Could not submit your selection. Please try again.');
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="page"><Loading label="Preparing the form…" /></div>;
  if (error && !team) return <div className="page narrow"><ErrorMessage message={error} /></div>;
  if (confirmation && team) return <div className="page narrow"><section className="confirmation" role="status"><span className="check" aria-hidden="true">✓</span><div className="eyebrow">Selection received</div><h1>You're in the lineup, {confirmation.player}.</h1><p>Your coach can now review the song and start time.</p>{confirmation.warning && <div className="alert warning">Heads up: {confirmation.warning} Your selection was still saved.</div>}<div className="hero-actions"><Link className="button primary" to={`/teams/${team.slug}`}>Back to Team</Link><Link className="button ghost" to={`/teams/${team.slug}/discover`}>Choose Another Song</Link></div></section></div>;

  return <div className="page narrow">
    <Link className="back-link" to={`/teams/${slug}`}>← Back to team</Link>
    <div className="section-heading"><div><div className="eyebrow">{team?.name}</div><h1>Submit your walk-up song</h1><p>Use a YouTube link and optional start time. Your coach will review every entry.</p></div></div>
    {song && <div className="chosen-song card"><div><span className="tag">Catalog choice</span><h2>{song.title}</h2><p>{song.artist}</p></div><YouTubePreview title={song.title} videoId={song.youtubeVideoId} url={song.youtubeUrl} startSeconds={song.recommendedStartSeconds} /></div>}
    {error && <ErrorMessage message={error} />}
    {jerseyConflict && <div className="alert warning" role="alert"><strong>That jersey already has a song.</strong><p>If two players legitimately use this number, you can submit it anyway.</p><button className="button secondary" type="button" disabled={submitting} onClick={() => void submit(undefined, true)}>Submit duplicate jersey</button></div>}
    <form className="form card" onSubmit={submit} noValidate>
      <div className="form-row"><Field label="Player name" name="playerName" value={form.playerName} error={fieldErrors.playerName?.[0]} onChange={update} autoComplete="name" /><Field label="Jersey number" name="jerseyNumber" value={form.jerseyNumber} error={fieldErrors.jerseyNumber?.[0]} onChange={update} inputMode="numeric" /></div>
      <Field label="Song title" name="songTitle" value={form.songTitle} error={fieldErrors.songTitle?.[0]} onChange={update} readOnly={Boolean(song)} />
      <Field label="Artist" name="artist" value={form.artist} error={fieldErrors.artist?.[0]} onChange={update} readOnly={Boolean(song)} />
      <Field label="YouTube URL" name="youtubeUrl" value={form.youtubeUrl} error={fieldErrors.youtubeUrl?.[0]} onChange={update} type="url" readOnly={Boolean(song)} hint="Watch, youtu.be, Shorts, and embed links are accepted." />
      <Field label="Suggested start time" name="startTime" value={form.startTime} error={fieldErrors.startTime?.[0]} onChange={update} placeholder="0:30" inputMode="numeric" hint="Optional. Use minutes:seconds, such as 0:30." />
      <button className="button primary wide" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit selection'}</button>
    </form>
  </div>;
}

interface FieldProps { label: string; name: keyof FormValue; value: string; error?: string; hint?: string; onChange: (name: keyof FormValue, value: string) => void; type?: string; placeholder?: string; inputMode?: 'numeric'; autoComplete?: string; readOnly?: boolean }
function Field({ label, name, value, error, hint, onChange, ...props }: FieldProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} value={value} onChange={(event) => onChange(name, event.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} />{error ? <span className="field-error" id={`${name}-error`}>{error}</span> : hint ? <span className="hint" id={`${name}-hint`}>{hint}</span> : null}</div>;
}
