import { describe, test, expect } from 'vitest';
import { formatNoteTimestamp } from './datetime.js';

// Build ISO strings relative to "now" so the tests don't depend on the wall clock.
const now = new Date();

describe('formatNoteTimestamp', () => {
  test('empty / invalid input returns an empty string', () => {
    expect(formatNoteTimestamp('')).toBe('');
    expect(formatNoteTimestamp(null)).toBe('');
    expect(formatNoteTimestamp(undefined)).toBe('');
    expect(formatNoteTimestamp('not-a-date')).toBe('');
  });

  test('a timestamp earlier today shows a time (no month name)', () => {
    const earlierToday = new Date(now);
    earlierToday.setHours(1, 5, 0, 0); // 1:05 AM today, safely "today"
    const out = formatNoteTimestamp(earlierToday.toISOString());
    expect(out).toMatch(/\d/);
    expect(out).toMatch(/[AP]M|:/); // a clock-ish string, not a date
    expect(out).not.toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
  });

  test('an earlier date this year shows month + day, no year', () => {
    // 60 days ago — same calendar year in the vast majority of runs.
    const d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    if (d.getFullYear() !== now.getFullYear()) return; // skip near a year boundary
    const out = formatNoteTimestamp(d.toISOString());
    expect(out).toMatch(/[A-Z][a-z]{2}\s+\d{1,2}/); // "Jun 5"
    expect(out).not.toContain(String(now.getFullYear()));
  });

  test('a prior-year date includes the year', () => {
    const d = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000); // ~13 months ago
    const out = formatNoteTimestamp(d.toISOString());
    expect(out).toContain(String(d.getFullYear()));
  });
});
