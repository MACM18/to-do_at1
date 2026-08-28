import cron from 'node-cron';
import { prisma } from './prisma';
import { sendDailySummaryReport } from './mailer';
import { processRecurringTasks } from './recurrence';

let eveningWeekdayTask: cron.ScheduledTask | null = null;
let eveningSaturdayTask: cron.ScheduledTask | null = null;
let recurrenceMidnightTask: cron.ScheduledTask | null = null;

const SCHEDULER_TIMEZONE = 'Asia/Colombo'; // UTC+05:30

/**
 * Initializes and schedules background cron jobs based on working schedule:
 * - Morning Day Plan: MANUAL ONLY (Triggered when lead clicks "Send Day Plan")
 * - Evening Task Log (Automated):
 *   - Mon - Fri at 17:30 (5:30 PM) / configured evening time
 *   - Saturday at 13:30 (1:30 PM shift off)
 *   - Sunday: Off (Skipped)
 * - Midnight Recurring Reset: Mon - Sat at 00:01
 */
export async function initScheduler() {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    if (!config) return;

    // Stop existing scheduled tasks
    if (eveningWeekdayTask) {
      eveningWeekdayTask.stop();
      eveningWeekdayTask = null;
    }
    if (eveningSaturdayTask) {
      eveningSaturdayTask.stop();
      eveningSaturdayTask = null;
    }
    if (recurrenceMidnightTask) {
      recurrenceMidnightTask.stop();
      recurrenceMidnightTask = null;
    }

    // Schedule 1: Midnight Recurring Task Roll-Over (Mon - Sat at 00:01)
    recurrenceMidnightTask = cron.schedule(
      '1 0 * * 1-6',
      async () => {
        console.log('[Cron] Running midnight recurring task processor (Mon-Sat)...');
        try {
          const result = await processRecurringTasks();
          console.log(`[Cron] Reset ${result.resetCount} recurring tasks for the new day.`);
        } catch (err) {
          console.error('[Cron] Recurring task processor error:', err);
        }
      },
      { timezone: SCHEDULER_TIMEZONE }
    );

    const hasRecipients =
      Boolean(config.toRecipients) ||
      Boolean(config.emailRecipients) ||
      Boolean(config.ccRecipients) ||
      Boolean(config.bccRecipients);

    // Schedule 2: Automated Evening Task Log (Mon-Fri at 17:30, Sat at 13:30)
    // Morning Day Plan is strictly manual-only upon user confirmation.
    if (config.autoSendDailyLog && config.smtpUser && hasRecipients) {
      // 2A: Weekday Evening Log (Monday to Friday, e.g. 17:30 or 18:00)
      const eveningTime = config.eveningReportTime || '17:30';
      const [hourStr, minuteStr] = eveningTime.split(':');
      const minute = parseInt(minuteStr || '30', 10);
      const hour = parseInt(hourStr || '17', 10);

      const weekdayCronExpr = `${minute} ${hour} * * 1-5`;
      console.log(
        `[Cron] Scheduling Weekday Task Log (Mon-Fri) at ${eveningTime} +05:30 (${weekdayCronExpr})`
      );

      eveningWeekdayTask = cron.schedule(
        weekdayCronExpr,
        async () => {
          console.log('[Cron] Triggering scheduled weekday evening summary (Mon-Fri)...');
          try {
            const result = await sendDailySummaryReport();
            console.log('[Cron] Weekday evening summary sent:', result.message);
          } catch (err) {
            console.error('[Cron] Weekday evening summary error:', err);
          }
        },
        { timezone: SCHEDULER_TIMEZONE }
      );

      // 2B: Saturday Task Log (Saturday at 13:30 / 1:30 PM Shift End)
      const saturdayCronExpr = '30 13 * * 6';
      console.log(
        `[Cron] Scheduling Saturday Task Log at 13:30 (1:30 PM) +05:30 (${saturdayCronExpr})`
      );

      eveningSaturdayTask = cron.schedule(
        saturdayCronExpr,
        async () => {
          console.log('[Cron] Triggering scheduled Saturday task log at 1:30 PM...');
          try {
            const result = await sendDailySummaryReport();
            console.log('[Cron] Saturday task log sent:', result.message);
          } catch (err) {
            console.error('[Cron] Saturday task log error:', err);
          }
        },
        { timezone: SCHEDULER_TIMEZONE }
      );
    }
  } catch (error) {
    console.error('Failed to initialize scheduler:', error);
  }
}
