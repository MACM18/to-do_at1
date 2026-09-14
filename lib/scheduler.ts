import cron from 'node-cron';
import { prisma } from './prisma';
import { sendDailySummaryReport } from './mailer';
import { processRecurringTasks } from './recurrence';

const SCHEDULER_TIMEZONE = 'Asia/Colombo'; // UTC+05:30

/**
 * Singleton scheduler task store attached to globalThis
 * Prevents multiple instances across Next.js re-evaluations
 */
interface SchedulerTasks {
  eveningWeekdayTask: cron.ScheduledTask | null;
  eveningSaturdayTask: cron.ScheduledTask | null;
  recurrenceMidnightTask: cron.ScheduledTask | null;
}

const globalScheduler: SchedulerTasks =
  (globalThis as any).__scheduler_tasks__ || {
    eveningWeekdayTask: null,
    eveningSaturdayTask: null,
    recurrenceMidnightTask: null,
  };
(globalThis as any).__scheduler_tasks__ = globalScheduler;

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

    // Stop existing scheduled tasks cleanly
    if (globalScheduler.eveningWeekdayTask) {
      globalScheduler.eveningWeekdayTask.stop();
      globalScheduler.eveningWeekdayTask = null;
    }
    if (globalScheduler.eveningSaturdayTask) {
      globalScheduler.eveningSaturdayTask.stop();
      globalScheduler.eveningSaturdayTask = null;
    }
    if (globalScheduler.recurrenceMidnightTask) {
      globalScheduler.recurrenceMidnightTask.stop();
      globalScheduler.recurrenceMidnightTask = null;
    }

    // Schedule 1: Midnight Recurring Task Roll-Over (Mon - Sat at 00:01)
    globalScheduler.recurrenceMidnightTask = cron.schedule(
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

    // Schedule 2: Automated Evening Task Log (Mon-Fri at configured time, Sat at saturdayReportTime)
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

      globalScheduler.eveningWeekdayTask = cron.schedule(
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

      // 2B: Saturday Task Log (Configurable Saturday auto-send, defaults to 13:30)
      const saturdayTime = config.saturdayReportTime || '13:30';
      const [satHourStr, satMinuteStr] = saturdayTime.split(':');
      const satMinute = parseInt(satMinuteStr || '30', 10);
      const satHour = parseInt(satHourStr || '13', 10);

      const saturdayCronExpr = `${satMinute} ${satHour} * * 6`;
      console.log(
        `[Cron] Scheduling Saturday Task Log at ${saturdayTime} +05:30 (${saturdayCronExpr})`
      );

      globalScheduler.eveningSaturdayTask = cron.schedule(
        saturdayCronExpr,
        async () => {
          console.log(`[Cron] Triggering scheduled Saturday task log at ${saturdayTime}...`);
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
