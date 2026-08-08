import { z } from 'zod';

const optionalTrimmed = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().min(1).optional(),
);

export const teamSlugSchema = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens.');

export const teamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  slug: teamSlugSchema,
  ageDivision: optionalTrimmed,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: teamSlugSchema,
  ageDivision: optionalTrimmed,
});

export const updateTeamSchema = createTeamSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Provide at least one field.',
);

export const songSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  artist: z.string().trim().min(1),
  youtubeUrl: z.string().url(),
  youtubeVideoId: z.string().length(11),
  recommendedStartSeconds: z.number().int().nonnegative().optional(),
  genres: z.array(z.string().min(1)).default([]),
  eras: z.array(z.string().min(1)).default([]),
  vibes: z.array(z.string().min(1)).default([]),
  requiresReview: z.boolean().default(true),
});

export const playerSelectionSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  playerName: z.string().trim().min(1).max(100),
  jerseyNumber: z.string().trim().min(1).max(12),
  songTitle: z.string().trim().min(1).max(160),
  artist: z.string().trim().min(1).max(160),
  youtubeUrl: z.string().url(),
  youtubeVideoId: z.string().length(11),
  startTimeSeconds: z.number().int().nonnegative().optional(),
  songId: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createSelectionSchema = z.object({
  playerName: z.string().trim().min(1).max(100),
  jerseyNumber: z.string().trim().min(1).max(12),
  songTitle: z.string().trim().min(1).max(160),
  artist: z.string().trim().min(1).max(160),
  youtubeUrl: z.string().trim().url(),
  startTime: optionalTrimmed,
  songId: optionalTrimmed,
  allowDuplicateJersey: z.boolean().optional().default(false),
});

export const updateSelectionSchema = z.object({
  playerName: z.string().trim().min(1).max(100).optional(),
  jerseyNumber: z.string().trim().min(1).max(12).optional(),
  songTitle: z.string().trim().min(1).max(160).optional(),
  artist: z.string().trim().min(1).max(160).optional(),
  youtubeUrl: z.string().trim().url().optional(),
  startTime: optionalTrimmed,
  songId: optionalTrimmed,
  allowDuplicateJersey: z.boolean().optional().default(false),
}).refine((value) => Object.keys(value).some((key) => key !== 'allowDuplicateJersey'), 'Provide at least one field.');

export type Team = z.infer<typeof teamSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type Song = z.infer<typeof songSchema>;
export type PlayerSelection = z.infer<typeof playerSelectionSchema>;
export type CreateSelectionInput = z.infer<typeof createSelectionSchema>;

export interface DuplicateWarning {
  code: 'DUPLICATE_SONG';
  message: string;
  selectionId: string;
  playerName: string;
}

export interface ExportResult {
  filename: string;
  mediaType: string;
  content: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    details?: unknown;
  };
}

export interface ApiDataBody<T> { data: T }
