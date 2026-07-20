import { describe, expect, it } from 'vitest';
import { formatCaptureDate, isoInterval, yearDistance, yearOf } from './date';

describe('date utils', () => {
  it('extracts the UTC year', () => {
    expect(yearOf('1966-04-25T00:00:00Z')).toBe(1966);
  });

  it('measures distance to a target year', () => {
    expect(yearDistance('1966-07-01T00:00:00Z', 1966)).toBeLessThan(0.1);
    expect(yearDistance('1966-07-01T00:00:00Z', 1970)).toBeGreaterThan(3.5);
  });

  it('formats capture dates for display', () => {
    expect(formatCaptureDate('1966-04-25T00:00:00Z')).toBe('25 Apr 1966');
  });

  it('builds STAC datetime intervals', () => {
    expect(isoInterval('1960-01-01', '1970-01-01')).toBe('1960-01-01/1970-01-01');
    expect(isoInterval(undefined, '1970-01-01')).toBe('../1970-01-01');
    expect(isoInterval()).toBeUndefined();
  });
});
