// Overview: Validates, parses, and formats optional local daily reminder times for reusable activities.

export const MINUTES_PER_DAY = 24 * 60;

// Confirms a reminder is a valid local minute-of-day value.
export function isValidReminderTimeMinutes(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}

// Formats a local minute-of-day as a familiar 12-hour time.
export function formatReminderTime(minutes: number): string {
  if (!isValidReminderTimeMinutes(minutes)) {
    return 'No reminder';
  }

  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

// Parses either 24-hour HH:MM or 12-hour h:MM AM/PM input into local minutes.
export function parseReminderTime(value: string): number | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(trimmed);
  if (!match) {
    return null;
  }

  const rawHour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (!Number.isInteger(minute) || minute > 59) {
    return null;
  }

  if (period) {
    if (rawHour < 1 || rawHour > 12) {
      return null;
    }
    const hour24 = rawHour % 12 + (period === 'PM' ? 12 : 0);
    return hour24 * 60 + minute;
  }

  if (rawHour > 23) {
    return null;
  }

  return rawHour * 60 + minute;
}
