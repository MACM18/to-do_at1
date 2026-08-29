/**
 * Timezone-aware date and time utilities for Asia/Colombo (+05:30)
 */
export const APP_TIMEZONE = 'Asia/Colombo';

/**
 * Returns formatted time string like "8.45", "12.58", or "17.30" in Asia/Colombo (+05:30)
 */
export function getLocalTimeDot(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hourStr = parts.find((p) => p.type === 'hour')?.value || '0';
  const minuteStr = parts.find((p) => p.type === 'minute')?.value || '00';

  return `${parseInt(hourStr, 10)}.${minuteStr}`;
}

/**
 * Returns the start and end of day Date objects normalized to Asia/Colombo (+05:30)
 */
export function getDayBounds(date: Date = new Date(), timeZone: string = APP_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date); // "YYYY-MM-DD"

  const startOfDay = new Date(`${dateStr}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

  return { startOfDay, endOfDay, dateStr };
}

/**
 * Returns the start (Monday 00:00:00) and end (Saturday/Sunday 23:59:59) of the current week in Asia/Colombo (+05:30)
 */
export function getWeekBounds(date: Date = new Date(), timeZone: string = APP_TIMEZONE) {
  const { startOfDay } = getDayBounds(date, timeZone);
  const day = startOfDay.getDay(); // 0 is Sunday, 1 is Monday, ... 6 is Saturday
  // Monday is day 1. If Sunday (0), distance back to last Monday is 6 days. Otherwise day - 1.
  const diffToMonday = day === 0 ? 6 : day - 1;

  const startOfWeek = new Date(startOfDay.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000 + (23 * 3600 + 59 * 60 + 59) * 1000 + 999);

  return { startOfWeek, endOfWeek };
}

/**
 * Returns the start and end of the month in Asia/Colombo (+05:30)
 */
export function getMonthBounds(year: number, month: number, timeZone: string = APP_TIMEZONE) {
  const mStr = String(month).padStart(2, '0');
  const startOfMonth = new Date(`${year}-${mStr}-01T00:00:00.000+05:30`);

  // Last day of month
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonth = new Date(`${year}-${mStr}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`);

  return { startOfMonth, endOfMonth, totalDays: lastDay };
}

/**
 * Checks if the target date is the last Saturday of its month in Asia/Colombo (+05:30)
 */
export function isLastSaturdayOfMonth(date: Date = new Date(), timeZone: string = APP_TIMEZONE): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2026', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const dayOfMonth = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);

  const { startOfDay } = getDayBounds(date, timeZone);
  const dayOfWeek = startOfDay.getDay(); // 6 is Saturday

  if (dayOfWeek !== 6) return false;

  const totalDaysInMonth = new Date(year, month, 0).getDate();
  return dayOfMonth + 7 > totalDaysInMonth;
}
