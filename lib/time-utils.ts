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
