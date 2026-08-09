import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubmitPage } from './SubmitPage';

const team = { id: '977a5108-1976-4261-b47a-1bd25920e7d7', name: 'Arlington Sage', slug: 'sage', ageDivision: '12U', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
const song = { id: 'happy', title: 'Happy', artist: 'Pharrell Williams', youtubeUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs', youtubeVideoId: 'ZbZSe6N_BXs', recommendedStartSeconds: 8, genres: ['Pop'], eras: ['2010s'], vibes: ['Fun'], requiresReview: true };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function response(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })); }
function renderForm(path = '/teams/sage/submit?songId=happy') { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/teams/:slug/submit" element={<SubmitPage />} /><Route path="/teams/:slug" element={<div>Team page</div>} /><Route path="/teams/:slug/discover" element={<div>Discovery</div>} /></Routes></MemoryRouter>); }

describe('submission form', () => {
  it('pre-populates catalog data and renders an accessible confirmation with a duplicate-song warning', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response({ data: team }))
      .mockImplementationOnce(() => response({ data: song }))
      .mockImplementationOnce(() => response({ data: { selection: { ...song, id: crypto.randomUUID(), playerName: 'Taylor' }, warnings: [{ code: 'DUPLICATE_SONG', message: 'Jordan already selected this song.' }] } }, 201));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup(); renderForm();
    expect(await screen.findByDisplayValue('Happy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pharrell Williams')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0:08')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Player name'), 'Taylor'); await user.type(screen.getByLabelText('Jersey number'), '7');
    await user.click(screen.getByRole('button', { name: 'Submit selection' }));
    const confirmation = await screen.findByRole('status');
    expect(confirmation).toHaveTextContent("You're in the lineup, Taylor.");
    expect(confirmation).toHaveTextContent('Jordan already selected this song.');
    expect(screen.getByRole('link', { name: 'Back to Team' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choose Another Song' })).toBeInTheDocument();
  });

  it('shows API field errors and supports the explicit duplicate-jersey override', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response({ data: team }))
      .mockImplementationOnce(() => response({ error: { code: 'VALIDATION_ERROR', message: 'Check the submitted fields.', fieldErrors: { youtubeUrl: ['Only genuine YouTube URLs are supported.'] } } }, 400))
      .mockImplementationOnce(() => response({ error: { code: 'DUPLICATE_JERSEY', message: 'Jersey #7 already has a selection.' } }, 409))
      .mockImplementationOnce(() => response({ data: { selection: { id: crypto.randomUUID(), playerName: 'Taylor' }, warnings: [] } }, 201));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup(); renderForm('/teams/sage/submit');
    await screen.findByText('Submit your walk-up song');
    await user.type(screen.getByLabelText('Player name'), 'Taylor'); await user.type(screen.getByLabelText('Jersey number'), '7'); await user.type(screen.getByLabelText('Song title'), 'A Song'); await user.type(screen.getByLabelText('Artist'), 'An Artist'); await user.type(screen.getByLabelText('YouTube URL'), 'https://example.com/video');
    await user.click(screen.getByRole('button', { name: 'Submit selection' }));
    expect(await screen.findByText('Only genuine YouTube URLs are supported.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit selection' }));
    expect(await screen.findByText('That jersey already has a song.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit duplicate jersey' }));
    await waitFor(() => expect(screen.getByText(/You're in the lineup/)).toBeInTheDocument());
    const submittedBody = JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string) as { allowDuplicateJersey: boolean };
    expect(submittedBody.allowDuplicateJersey).toBe(true);
  });

  it('shows loading failures as an alert', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ error: { code: 'NOT_FOUND', message: 'Team was not found.' } }, 404)));
    renderForm('/teams/missing/submit');
    expect(await screen.findByRole('alert')).toHaveTextContent('Team was not found.');
  });
});
