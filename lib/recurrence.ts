import { prisma } from './prisma';
import { getDayBounds } from './time-utils';

/**
 * 1. Resets recurring tasks (DAILY, WEEKLY) that were completed on previous days:
 *    - Status -> TODO, Progress -> 0, unchecks subtasks, clears timing, updates lastResetDate.
 * 2. Resets the daily work timer (startTime and endTime) for in-progress or incomplete tasks carried over from previous days:
 *    - Keeps status (e.g. IN_PROGRESS), keeps progress (e.g. 40%), keeps completed subtasks intact.
 *    - Clears startTime -> null and endTime -> null so the timer starts fresh for today.
 *    - Updates lastResetDate -> now.
 */
export async function processRecurringTasks(userId?: string) {
  const { startOfDay: startOfToday } = getDayBounds(new Date(), 'Asia/Colombo');
  const now = new Date();

  // 1. Process recurring completed tasks
  const recurringWhere: any = {
    recurrence: { in: ['DAILY', 'WEEKLY'] },
  };
  if (userId) recurringWhere.userId = userId;

  const recurringTasks = await prisma.task.findMany({
    where: recurringWhere,
    include: { subtasks: true },
  });

  let resetCount = 0;

  for (const task of recurringTasks) {
    const isCompleted = task.status === 'DONE' || task.progress === 100;
    const lastReset = task.lastResetDate ? new Date(task.lastResetDate) : null;
    const lastUpdate = new Date(task.updatedAt);

    let shouldReset = false;

    if (task.recurrence === 'DAILY') {
      // If completed and the last update or reset was before today (Asia/Colombo)
      if (isCompleted && (!lastReset || lastReset < startOfToday) && lastUpdate < startOfToday) {
        shouldReset = true;
      }
    } else if (task.recurrence === 'WEEKLY') {
      // Weekly recurrence check: if completed and last reset was > 6 days ago
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (isCompleted && (!lastReset || lastReset < oneWeekAgo) && lastUpdate < oneWeekAgo) {
        shouldReset = true;
      }
    }

    if (shouldReset) {
      await prisma.$transaction([
        prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'TODO',
            progress: 0,
            startTime: null,
            endTime: null,
            lastResetDate: now,
          },
        }),
        prisma.subtask.updateMany({
          where: { taskId: task.id },
          data: {
            isDone: false,
          },
        }),
      ]);
      resetCount++;
    }
  }

  // 2. Process in-progress or incomplete tasks carried over from yesterday (or earlier)
  // For incomplete tasks with startTime or endTime from a previous date: reset timers for today!
  const carriedOverWhere: any = {
    status: { in: ['IN_PROGRESS', 'TODO'] },
    OR: [
      { startTime: { not: null } },
      { endTime: { not: null } },
    ],
  };
  if (userId) carriedOverWhere.userId = userId;

  const carriedOverTasks = await prisma.task.findMany({
    where: carriedOverWhere,
  });

  for (const task of carriedOverTasks) {
    const lastReset = task.lastResetDate ? new Date(task.lastResetDate) : null;
    const lastUpdate = new Date(task.updatedAt);
    const createdDate = new Date(task.createdAt);

    // If the task was started or updated before today's start in Asia/Colombo
    if ((!lastReset || lastReset < startOfToday) && lastUpdate < startOfToday && createdDate < startOfToday) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          startTime: null,
          endTime: null,
          lastResetDate: now,
        },
      });
      resetCount++;
    }
  }

  return { resetCount };
}
