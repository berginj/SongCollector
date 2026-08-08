import type { PlayerSelection } from './models.js';

const canonical = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

export function findDuplicateSong(
  selections: PlayerSelection[],
  candidate: Pick<PlayerSelection, 'songTitle' | 'artist' | 'youtubeVideoId'>,
  excludeId?: string,
): PlayerSelection | undefined {
  return selections.find((selection) => selection.id !== excludeId && (
    selection.youtubeVideoId === candidate.youtubeVideoId ||
    (canonical(selection.songTitle) === canonical(candidate.songTitle) && canonical(selection.artist) === canonical(candidate.artist))
  ));
}

export function findDuplicateJersey(
  selections: PlayerSelection[],
  jerseyNumber: string,
  excludeId?: string,
): PlayerSelection | undefined {
  return selections.find((selection) => selection.id !== excludeId && canonical(selection.jerseyNumber) === canonical(jerseyNumber));
}
