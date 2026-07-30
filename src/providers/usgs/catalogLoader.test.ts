import { describe, expect, it } from 'vitest';
import { toIsoCaptureDate } from './catalogLoader';

describe('toIsoCaptureDate', () => {
  it('normalizes the harvest format to strict ISO 8601', () => {
    expect(toIsoCaptureDate('1966-04-25 00:00:00-05')).toBe('1966-04-25T00:00:00-05:00');
    expect(toIsoCaptureDate('1975-01-25 00:00:00-06')).toBe('1975-01-25T00:00:00-06:00');
  });

  it('passes through already-ISO strings unchanged in meaning', () => {
    expect(toIsoCaptureDate('1966-04-25T00:00:00-05:00')).toBe('1966-04-25T00:00:00-05:00');
    expect(toIsoCaptureDate('2020-01-15T00:00:00Z')).toBe('2020-01-15T00:00:00Z');
  });

  it('treats a missing offset as UTC and leaves unknown shapes alone', () => {
    expect(toIsoCaptureDate('1966-04-25 12:30:00')).toBe('1966-04-25T12:30:00Z');
    expect(toIsoCaptureDate('April 1966')).toBe('April 1966');
  });
});
