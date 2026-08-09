import type { ApiDataBody, ApiErrorBody, PlayerSelection, Song, Team } from '@songcollector/shared';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly fieldErrors?: Record<string, string[]>, public readonly details?: unknown) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}, adminToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  if (adminToken) headers.set('x-admin-token', adminToken);
  const response = await fetch(`/api${path}`, { ...init, headers });
  if (!response.ok) {
    let payload: ApiErrorBody | undefined;
    try { payload = await response.json() as ApiErrorBody; } catch { /* non-JSON upstream error */ }
    throw new ApiError(response.status, payload?.error.code ?? 'REQUEST_FAILED', payload?.error.message ?? `Request failed (${response.status}).`, payload?.error.fieldErrors, payload?.error.details);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json() as ApiDataBody<T>).data;
}

export const api = {
  teamBySlug: (slug: string) => request<Team>(`/teams/slug/${encodeURIComponent(slug)}`),
  team: (id: string) => request<Team>(`/teams/${encodeURIComponent(id)}`),
  teams: (token: string) => request<Team[]>('/teams', {}, token),
  createTeam: (value: { name: string; slug: string; ageDivision?: string }, token: string) => request<Team>('/teams', { method: 'POST', body: JSON.stringify(value) }, token),
  updateTeam: (id: string, value: Partial<Pick<Team, 'name' | 'slug' | 'ageDivision'>>, token: string) => request<Team>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(value) }, token),
  selections: (teamId: string) => request<PlayerSelection[]>(`/teams/${teamId}/selections`),
  createSelection: (teamId: string, value: Record<string, unknown>) => request<{ selection: PlayerSelection; warnings: Array<{ code: string; message: string }> }>(`/teams/${teamId}/selections`, { method: 'POST', body: JSON.stringify(value) }),
  updateSelection: (id: string, value: Record<string, unknown>, token: string) => request<{ selection: PlayerSelection; warnings: Array<{ code: string; message: string }> }>(`/selections/${id}`, { method: 'PATCH', body: JSON.stringify(value) }, token),
  deleteSelection: (id: string, token: string) => request<void>(`/selections/${id}`, { method: 'DELETE' }, token),
  songs: () => request<Song[]>('/songs'),
  song: (id: string) => request<Song>(`/songs/${encodeURIComponent(id)}`),
  async download(teamId: string, extension: 'csv' | 'txt', token: string) {
    const response = await fetch(`/api/teams/${teamId}/export.${extension}`, { headers: { 'x-admin-token': token } });
    if (!response.ok) {
      const payload = await response.json().catch(() => undefined) as ApiErrorBody | undefined;
      throw new ApiError(response.status, payload?.error.code ?? 'REQUEST_FAILED', payload?.error.message ?? 'Download failed.');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    const filename = /filename="([^"]+)"/.exec(disposition ?? '')?.[1] ?? `song-selections.${extension}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
  },
};
