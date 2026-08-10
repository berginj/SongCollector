import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZodError } from 'zod';
import { ConfigurationError, createConfiguredRepositories } from './config.js';
import { AppError, fieldErrors, SongCollectorService } from './service.js';

type Handler = (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;
type Params = Record<string, string | undefined>;

const json = (status: number, data: unknown): HttpResponseInit => ({ status, jsonBody: data, headers: { 'content-type': 'application/json; charset=utf-8' } });

async function body(request: HttpRequest): Promise<unknown> {
  try { return await request.json(); } catch { throw new AppError(400, 'INVALID_JSON', 'Request body must be valid JSON.'); }
}

function required(params: Params, name: string): string {
  const value = params[name];
  if (!value) throw new AppError(400, 'MISSING_ROUTE_PARAMETER', `Missing route parameter: ${name}`);
  return value;
}

function protect(request: HttpRequest, adminToken: string | undefined): void {
  if (!adminToken) throw new ConfigurationError('ADMIN_TOKEN is not configured; administrative endpoints are disabled.');
  if (request.headers.get('x-admin-token') !== adminToken) throw new AppError(401, 'UNAUTHORIZED', 'A valid X-Admin-Token header is required.');
}

function safe(operation: (request: HttpRequest) => Promise<HttpResponseInit>): Handler {
  return async (request, context) => {
    try { return await operation(request); }
    catch (error) {
      if (error instanceof ZodError) return json(400, { error: { code: 'VALIDATION_ERROR', message: 'Check the submitted fields.', fieldErrors: fieldErrors(error) } });
      if (error instanceof AppError) return json(error.status, { error: { code: error.code, message: error.message, ...(error.fieldErrors && { fieldErrors: error.fieldErrors }), ...(error.details !== undefined && { details: error.details }) } });
      if (error instanceof ConfigurationError) return json(503, { error: { code: 'STORAGE_CONFIGURATION_ERROR', message: error.message } });
      context.error('Unhandled API error', error);
      return json(500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
    }
  };
}

export function createApiHandlers(service: SongCollectorService, adminToken = process.env.ADMIN_TOKEN) {
  return {
    getTeamBySlug: safe(async (request) => json(200, { data: await service.getTeamBySlug(required(request.params, 'slug')) })),
    getTeam: safe(async (request) => json(200, { data: await service.getTeam(required(request.params, 'teamId')) })),
    getSelections: safe(async (request) => json(200, { data: await service.listSelections(required(request.params, 'teamId')) })),
    createSelection: safe(async (request) => json(201, { data: await service.createSelection(required(request.params, 'teamId'), await body(request)) })),
    getSongs: safe(async () => json(200, { data: await service.listSongs() })),
    getSong: safe(async (request) => json(200, { data: await service.getSong(required(request.params, 'songId')) })),
    searchYouTube: safe(async (request) => { protect(request, adminToken); return json(200, { data: await service.searchYouTube(request.query.get('title') ?? '', request.query.get('artist') ?? '') }); }),
    getTeams: safe(async (request) => { protect(request, adminToken); return json(200, { data: await service.listTeams() }); }),
    createTeam: safe(async (request) => { protect(request, adminToken); return json(201, { data: await service.createTeam(await body(request)) }); }),
    updateTeam: safe(async (request) => { protect(request, adminToken); return json(200, { data: await service.updateTeam(required(request.params, 'teamId'), await body(request)) }); }),
    updateSelection: safe(async (request) => { protect(request, adminToken); return json(200, { data: await service.updateSelection(required(request.params, 'selectionId'), await body(request)) }); }),
    deleteSelection: safe(async (request) => { protect(request, adminToken); await service.deleteSelection(required(request.params, 'selectionId')); return { status: 204 }; }),
    previewBallparkImport: safe(async (request) => { protect(request, adminToken); return json(200, { data: await service.previewBallparkDjImport(required(request.params, 'teamId'), await body(request)) }); }),
    confirmBallparkImport: safe(async (request) => { protect(request, adminToken); return json(200, { data: await service.commitBallparkDjImport(required(request.params, 'teamId'), await body(request)) }); }),
    exportCsv: safe(async (request) => { protect(request, adminToken); const result = await service.exportTeam(required(request.params, 'teamId'), 'csv'); return { status: 200, body: result.content, headers: { 'content-type': result.mediaType, 'content-disposition': `attachment; filename="${result.filename}"` } }; }),
    exportText: safe(async (request) => { protect(request, adminToken); const result = await service.exportTeam(required(request.params, 'teamId'), 'txt'); return { status: 200, body: result.content, headers: { 'content-type': result.mediaType, 'content-disposition': `attachment; filename="${result.filename}"` } }; }),
  };
}

let defaultHandlers: ReturnType<typeof createApiHandlers> | undefined;
export async function getDefaultHandlers() {
  if (!defaultHandlers) defaultHandlers = createApiHandlers(new SongCollectorService(await createConfiguredRepositories()));
  return defaultHandlers;
}

export function configured(name: keyof ReturnType<typeof createApiHandlers>): Handler {
  return safe(async (request) => (await getDefaultHandlers())[name](request, { error: () => undefined } as unknown as InvocationContext));
}
