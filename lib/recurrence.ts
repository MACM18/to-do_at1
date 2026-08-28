import { prisma } from './prisma';

/**
 * Checks and resets recurring tasks (DAILY, WEEKLY) that were completed on previous days.
 * Resets task progress to 0, status to 'TODO', unchecks all subtasks, and marks lastResetDate.
 */
export async function processRecurringTasks(userId?: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const whereClause: {
    recurrence: { in: string[] };
    userId?: string;
  } = {
    recurrence: { in: ['DAILY', 'WEEKLY'] },
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const recurringTasks = await prisma.task.findMany({
    where: whereClause,
    include: { subtasks: true },
  });

  let resetCount = 0;

  for (const task of recurringTasks) {
    const isCompleted = task.status === 'DONE' || task.progress === 100;
    const lastReset = task.lastResetDate ? new Date(task.lastResetDate) : null;
    const lastUpdate = new Date(task.updatedAt);

    let shouldReset = false;

    if (task.recurrence === 'DAILY') {
      // If completed and the last update or reset was before today
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

  return { resetCount };
}
