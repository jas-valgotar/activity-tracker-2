// Overview: Tests optional routine reminder time validation, parsing, and display formatting.

import { formatReminderTime, isValidReminderTimeMinutes, parseReminderTime } from '../src/domain/reminderTime';

describe('reminder time helpers', () => {
  it('formats local minute-of-day values for friendly display', () => {
    expect(formatReminderTime(0)).toBe('12:00 AM');
    expect(formatReminderTime(9 * 60 + 30)).toBe('9:30 AM');
    expect(formatReminderTime(17 * 60)).toBe('5:00 PM');
  });

  it('parses 24-hour and 12-hour input', () => {
    expect(parseReminderTime('09:30')).toBe(9 * 60 + 30);
    expect(parseReminderTime('5:00 PM')).toBe(17 * 60);
    expect(parseReminderTime('12:00 AM')).toBe(0);
    expect(parseReminderTime('25:00')).toBeNull();
  });

  it('validates optional local reminder values', () => {
    expect(isValidReminderTimeMinutes(null)).toBe(false);
    expect(isValidReminderTimeMinutes(0)).toBe(true);
    expect(isValidReminderTimeMinutes(23 * 60 + 59)).toBe(true);
    expect(isValidReminderTimeMinutes(24 * 60)).toBe(false);
  });
});
