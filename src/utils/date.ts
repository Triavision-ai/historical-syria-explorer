const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function yearOf(isoDate: string): number {
  return new Date(isoDate).getUTCFullYear();
}

/** Absolute distance in fractional years between a capture date and a target year. */
export function yearDistance(isoDate: string, targetYear: number): number {
  const target = Date.UTC(targetYear, 6, 1); // middle of the target year
  return Math.abs(new Date(isoDate).getTime() - target) / MS_PER_YEAR;
}

export function formatCaptureDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Short month + year ("May 1966") — the timeline's event label. */
export function formatMonthYear(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Build an ISO interval string ("start/end") as used by STAC datetime search. */
export function isoInterval(from?: string, to?: string): string | undefined {
  if (!from && !to) return undefined;
  return `${from ?? '..'}/${to ?? '..'}`;
}
