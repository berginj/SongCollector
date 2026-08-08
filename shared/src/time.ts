const TIMESTAMP_PATTERN = /^(0|[1-9]\d*):([0-5]\d)$/;

export function parseTimestamp(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const match = TIMESTAMP_PATTERN.exec(value.trim());
  if (!match) throw new Error('Start time must use m:ss with seconds from 00 to 59.');
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatTimestamp(seconds: number | undefined): string {
  if (seconds === undefined) return '';
  if (!Number.isInteger(seconds) || seconds < 0) throw new Error('Seconds must be a non-negative integer.');
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
