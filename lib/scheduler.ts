import cron from 'node-cron';
import { prisma } from './prisma';
import { sendMorningTodoList, sendDailySummaryReport } from './mailer';
import { processRecurringTasks } from './recurrence';

let morningTask: cron.ScheduledTask | null = null;
let eveningTask: cron.ScheduledTask | null = null;
let recurrenceMidnightTask: cron.ScheduledTask | null = null;

/**
 * Initializes and schedules cron jobs based on current AppConfig settings.
 */
export async function initScheduler() {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    if (!config) return;

    // Stop existing scheduled tasks
    if (morningTask) {
      morningTask.stop();
      morningTask = null;
    }
    if (eveningTask) {
      eveningTask.stop();
      eveningTask = null;
    }
    if (recurrenceMidnightTask) {
      recurrenceMidnightTask.stop();
      recurrenceMidnightTask = null;
    }

    // Schedule 1: Midnight Recurring Task Roll-Over (runs every day at 00:01)
    recurrenceMidnightTask = cron.schedule('1 0 * * *', async () => {
      console.log('[Cron] Running midnight recurring task processor...');
      try {
        const result = await processRecurringTasks();
        console.log(`[Cron] Reset ${result.resetCount} recurring tasks for the new day.`);
      } catch (err) {
        console.error('[Cron] Recurring task processor error:', err);
      }
    });

    // Schedule 2: Morning To-Do List
    if (config.autoSendMorningReport && config.morningReportTime && config.smtpUser && config.emailRecipients) {
      const [hourStr, minuteStr] = config.morningReportTime.split(':');
      const minute = parseInt(minuteStr || '0', 10);
      const hour = parseInt(hourStr || '8', 10);

      const cronExpr = `${minute} ${hour} * * *`;
      console.log(`[Cron] Scheduling Morning To-Do List at ${config.morningReportTime} (${cronExpr})`);

      morningTask = cron.schedule(cronExpr, async () => {
        console.log('[Cron] Triggering scheduled morning report...');
        try {
          const result = await sendMorningTodoList();
          console.log('[Cron] Morning report sent:', result.message);
        } catch (err) {
          console.error('[Cron] Morning report error:', err);
        }
      });
    }

    // Schedule 3: Evening Team Daily Log Summary
    if (config.autoSendDailyLog && config.eveningReportTime && config.smtpUser && config.emailRecipients) {
      const [hourStr, minuteStr] = config.eveningReportTime.split(':');
      const minute = parseInt(minuteStr || '0', 10);
      const hour = parseInt(hourStr || '18', 10);

      const cronExpr = `${minute} ${hour} * * *`;
      console.log(`[Cron] Scheduling Evening Team Summary at ${config.eveningReportTime} (${cronExpr})`);

      eveningTask = cron.schedule(cronExpr, async () => {
        console.log('[Cron] Triggering scheduled evening team summary...');
        try {
          const result = await sendDailySummaryReport();
          console.log('[Cron] Evening summary report sent:', result.message);
        } catch (err) {
          console.error('[Cron] Evening summary report error:', err);
        }
      });
    }
  } catch (error) {
    console.error('Failed to initialize scheduler:', error);
  }
}
