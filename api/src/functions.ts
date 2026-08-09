import { app } from '@azure/functions';
import { configured } from './http.js';

app.http('getTeamBySlug', { methods: ['GET'], authLevel: 'anonymous', route: 'teams/slug/{slug}', handler: configured('getTeamBySlug') });
app.http('getTeam', { methods: ['GET'], authLevel: 'anonymous', route: 'teams/{teamId}', handler: configured('getTeam') });
app.http('getSelections', { methods: ['GET'], authLevel: 'anonymous', route: 'teams/{teamId}/selections', handler: configured('getSelections') });
app.http('createSelection', { methods: ['POST'], authLevel: 'anonymous', route: 'teams/{teamId}/selections', handler: configured('createSelection') });
app.http('getSongs', { methods: ['GET'], authLevel: 'anonymous', route: 'songs', handler: configured('getSongs') });
app.http('getSong', { methods: ['GET'], authLevel: 'anonymous', route: 'songs/{songId}', handler: configured('getSong') });
app.http('getTeams', { methods: ['GET'], authLevel: 'anonymous', route: 'teams', handler: configured('getTeams') });
app.http('createTeam', { methods: ['POST'], authLevel: 'anonymous', route: 'teams', handler: configured('createTeam') });
app.http('updateTeam', { methods: ['PATCH'], authLevel: 'anonymous', route: 'teams/{teamId}', handler: configured('updateTeam') });
app.http('updateSelection', { methods: ['PATCH'], authLevel: 'anonymous', route: 'selections/{selectionId}', handler: configured('updateSelection') });
app.http('deleteSelection', { methods: ['DELETE'], authLevel: 'anonymous', route: 'selections/{selectionId}', handler: configured('deleteSelection') });
app.http('exportCsv', { methods: ['GET'], authLevel: 'anonymous', route: 'teams/{teamId}/export.csv', handler: configured('exportCsv') });
app.http('exportText', { methods: ['GET'], authLevel: 'anonymous', route: 'teams/{teamId}/export.txt', handler: configured('exportText') });
