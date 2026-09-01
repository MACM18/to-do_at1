'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { processRecurringTasks } from '../recurrence';
import {
  getLocalTimeDot,
  formatTo24HrDot,
  getDayBounds,
  getWeekBounds,
  getMonthBounds,
  isLastSaturdayOfMonth,
  formatLocalDate,
  getLocalDateParts,
} from '../time-utils';

/**
 * Calculates progress and status based on subtasks.
 * If subtasks have custom weights (percentages), it sums the weights of completed subtasks.
 * Otherwise, it divides 100% equally among subtasks.
 */
function calculateTaskProgress(
  subtasks: { isDone: boolean; weight?: number | null }[]
): { progress: number; status: string } {
  if (!subtasks || subtasks.length === 0) {
    return { progress: 0, status: 'TODO' };
  }

  const hasCustomWeights = subtasks.some(
    (s) => s.weight !== null && s.weight !== undefined && s.weight > 0
  );

  if (hasCustomWeights) {
    const completedWeight = subtasks
      .filter((s) => s.isDone)
      .reduce((sum, s) => sum + (s.weight || 0), 0);
    const progress = Math.min(100, Math.max(0, Math.round(completedWeight)));
    const status = progress >= 100 ? 'DONE' : progress > 0 ? 'IN_PROGRESS' : 'TODO';
    return { progress, status };
  } else {
    const completedCount = subtasks.filter((s) => s.isDone).length;
    const progress = Math.round((completedCount / subtasks.length) * 100);
    const status = progress >= 100 ? 'DONE' : progress > 0 ? 'IN_PROGRESS' : 'TODO';
    return { progress, status };
  }
}

export async function getTasks(userId?: string) {
  try {
    await processRecurringTasks(userId);
  } catch (err) {
    console.error('Error processing recurring tasks in getTasks:', err);
  }

  if (!prisma || !prisma.task || !prisma.user) {
    return [];
  }

  try {
    // If a main admin user exists, reassign any orphaned tasks from older versions
    const mainUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'LEAD'] } },
      orderBy: { createdAt: 'asc' },
    });

    if (mainUser) {
      const validUsers = await prisma.user.findMany({ select: { id: true } });
      const validUserIds = validUsers.map((u) => u.id);
      await prisma.task.updateMany({
        where: {
          userId: { notIn: validUserIds },
        },
        data: { userId: mainUser.id },
      });
    }
  } catch (err) {
    console.error('Error reassigning orphaned tasks in getTasks:', err);
  }

  const whereClause = userId ? { userId } : {};

  return prisma.task.findMany({
    where: whereClause,
    include: {
      subtasks: {
        orderBy: { createdAt: 'asc' },
      },
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function createTask(formData: {
  title: string;
  description?: string;
  status?: string;
  progress?: number;
  recurrence?: string;
  userId: string;
  dueDate?: string | Date | null;
  startTime?: string | null;
  endTime?: string | null;
  priority?: string;
  assignedBy?: string;
  subtaskTitles?: string[];
  subtasks?: { title: string; weight?: number | null }[];
}) {
  if (!formData.title?.trim()) {
    throw new Error('Task title is required');
  }

  let subtasksData: { title: string; weight?: number | null; isDone: boolean }[] = [];

  if (formData.subtasks && formData.subtasks.length > 0) {
    subtasksData = formData.subtasks
      .filter((s) => s.title?.trim().length > 0)
      .map((s) => ({
        title: s.title.trim(),
        weight: typeof s.weight === 'number' ? s.weight : null,
        isDone: false,
      }));
  } else if (formData.subtaskTitles && formData.subtaskTitles.length > 0) {
    subtasksData = formData.subtaskTitles
      .filter((t) => t.trim().length > 0)
      .map((title) => ({
        title: title.trim(),
        weight: null,
        isDone: false,
      }));
  }

  let initialProgress = formData.progress ?? 0;
  let initialStatus = formData.status ?? 'TODO';

  if (subtasksData.length > 0) {
    const calculated = calculateTaskProgress(subtasksData);
    initialProgress = calculated.progress;
    initialStatus = calculated.status;
  }

  const task = await prisma.task.create({
    data: {
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      recurrence: formData.recurrence || 'NONE',
      userId: formData.userId,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      startTime: formData.startTime?.trim() || (formData.recurrence === 'DAILY' ? '08.30' : null),
      endTime: formData.endTime?.trim() || null,
      priority: formData.priority || 'High',
      assignedBy: formData.assignedBy?.trim() || 'Myself',
      status: initialStatus,
      progress: initialProgress,
      subtasks: {
        create: subtasksData,
      },
    },
    include: {
      subtasks: true,
    },
  });

  revalidatePath('/');
  return task;
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    userId?: string;
    recurrence?: string;
    status?: string;
    progress?: number;
    dueDate?: string | Date | null;
    startTime?: string | null;
    endTime?: string | null;
    priority?: string;
    assignedBy?: string;
    subtasks?: { id?: string; title: string; weight?: number | null; isDone?: boolean }[];
  }
) {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: { subtasks: true },
  });

  const updatePayload: any = {};
  if (data.title !== undefined) updatePayload.title = data.title.trim();
  if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
  if (data.userId !== undefined && data.userId.trim()) updatePayload.userId = data.userId.trim();
  if (data.recurrence !== undefined) updatePayload.recurrence = data.recurrence;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.progress !== undefined) updatePayload.progress = data.progress;
  if (data.dueDate !== undefined)
    updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.startTime !== undefined) updatePayload.startTime = data.startTime?.trim() || null;
  if (data.endTime !== undefined) updatePayload.endTime = data.endTime?.trim() || null;
  if (data.priority !== undefined) updatePayload.priority = data.priority;
  if (data.assignedBy !== undefined) updatePayload.assignedBy = data.assignedBy?.trim() || 'Myself';

  // If subtasks array is supplied in update, sync them
  if (data.subtasks !== undefined) {
    const existingSubtasks = existingTask?.subtasks || [];
    const existingIds = existingSubtasks.map((s) => s.id);
    const providedIds = data.subtasks.map((s) => s.id).filter(Boolean) as string[];

    // Delete subtasks that were removed
    const toDelete = existingIds.filter((id) => !providedIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.subtask.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    // Upsert provided subtasks
    for (const st of data.subtasks) {
      if (st.id && existingIds.includes(st.id)) {
        await prisma.subtask.update({
          where: { id: st.id },
          data: {
            title: st.title.trim(),
            weight: typeof st.weight === 'number' ? st.weight : null,
            ...(st.isDone !== undefined ? { isDone: st.isDone } : {}),
          },
        });
      } else if (st.title.trim()) {
        await prisma.subtask.create({
          data: {
            taskId,
            title: st.title.trim(),
            weight: typeof st.weight === 'number' ? st.weight : null,
            isDone: Boolean(st.isDone),
          },
        });
      }
    }

    // Recalculate progress from fresh subtasks if subtasks exist
    const freshSubtasks = await prisma.subtask.findMany({ where: { taskId } });
    if (freshSubtasks.length > 0) {
      const calculated = calculateTaskProgress(freshSubtasks);
      updatePayload.progress = calculated.progress;
      updatePayload.status = calculated.status;
    } else {
      // No subtasks on task: preserve existing status/progress unless explicitly provided
      if (data.status !== undefined) {
        updatePayload.status = data.status;
      } else if (existingTask) {
        updatePayload.status = existingTask.status;
      }
      if (data.progress !== undefined) {
        updatePayload.progress = data.progress;
      } else if (existingTask) {
        updatePayload.progress = existingTask.progress;
      }
    }
  }

  // If the task was previously completed or marked DONE, ensure 100% progress
  if (updatePayload.status === 'DONE' && (updatePayload.progress === undefined || updatePayload.progress < 100)) {
    updatePayload.progress = 100;
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updatePayload,
    include: { subtasks: true },
  });

  revalidatePath('/');
  return task;
}

/**
 * Fast direct progress & status update for team member tracking
 * Allows the manager to update a team task's status and progress percentage in 1 click
 */
export async function updateTeamTaskStatusAndProgress(
  taskId: string,
  progress: number,
  status?: string
) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  let resolvedStatus = status;

  if (!resolvedStatus) {
    if (clampedProgress >= 100) {
      resolvedStatus = 'DONE';
    } else if (clampedProgress > 0) {
      resolvedStatus = 'IN_PROGRESS';
    } else {
      resolvedStatus = 'TODO';
    }
  } else {
    if (resolvedStatus === 'DONE' && clampedProgress < 100) {
      // If marked done, set progress to 100
      progress = 100;
    } else if (resolvedStatus === 'TODO' && clampedProgress > 0) {
      progress = 0;
    }
  }

  const finalProgress = resolvedStatus === 'DONE' ? 100 : (resolvedStatus === 'TODO' && !status ? 0 : clampedProgress);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      progress: finalProgress,
      status: resolvedStatus,
    },
  });

  revalidatePath('/');
  return updated;
}

/**
 * Fast task reassignment / owner transfer for team member tracking
 * In case a task was accidentally logged under the wrong member
 */
export async function reassignTeamTask(taskId: string, newUserId: string) {
  if (!taskId || !newUserId) {
    throw new Error('Task ID and target team member ID are required');
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { userId: newUserId },
  });

  revalidatePath('/');
  return updated;
}

function getCurrentDotTime(): string {
  return getLocalTimeDot();
}

export async function startTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return null;

  const updateData: any = {};
  const currentTime = getLocalTimeDot(new Date(), 'Asia/Colombo');

  if (task.recurrence === 'DAILY') {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    updateData.startTime = formatTo24HrDot(config?.shiftStartTime || '08.30');
  } else {
    updateData.startTime = currentTime;
  }
  updateData.endTime = null;

  if (task.status === 'TODO') {
    updateData.status = 'IN_PROGRESS';
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  revalidatePath('/');
  return updated;
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({
    where: { id: taskId },
  });
  revalidatePath('/');
  return { success: true };
}

// Fast toggle for tasks (0% <-> 100%) with smart start/end timing
export async function toggleTaskComplete(taskId: string, currentStatus: string) {
  const isDone = currentStatus === 'DONE';
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { subtasks: true },
  });

  if (!task) return null;

  const nextDone = !isDone;
  const currentTime = getCurrentDotTime();

  const taskUpdateData: any = {
    status: nextDone ? 'DONE' : 'TODO',
    progress: nextDone ? 100 : 0,
  };

  if (nextDone) {
    if (!task.startTime) {
      taskUpdateData.startTime = task.recurrence === 'DAILY' ? '08.30' : currentTime;
    }
    taskUpdateData.endTime = currentTime;
  }

  if (task.subtasks.length > 0) {
    await prisma.$transaction([
      prisma.subtask.updateMany({
        where: { taskId },
        data: { isDone: nextDone },
      }),
      prisma.task.update({
        where: { id: taskId },
        data: taskUpdateData,
      }),
    ]);
  } else {
    await prisma.task.update({
      where: { id: taskId },
      data: taskUpdateData,
    });
  }

  revalidatePath('/');
  return { success: true };
}

// Subtask toggle with weighted progress calculation and smart start/end timing
export async function toggleSubtask(subtaskId: string, taskId: string) {
  const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!subtask) return;

  const parentTask = await prisma.task.findUnique({ where: { id: taskId } });
  const newDoneState = !subtask.isDone;
  const currentTime = getCurrentDotTime();

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { isDone: newDoneState },
  });

  const allSubtasks = await prisma.subtask.findMany({ where: { taskId } });
  const updatedSubtasks = allSubtasks.map((s) =>
    s.id === subtaskId ? { ...s, isDone: newDoneState } : s
  );

  const { progress, status } = calculateTaskProgress(updatedSubtasks);

  const taskUpdateData: any = {
    progress: progress,
    status: status,
  };

  // If subtask started/toggled and parent task has no startTime, set it
  if (parentTask && !parentTask.startTime) {
    taskUpdateData.startTime = parentTask.recurrence === 'DAILY' ? '08.30' : currentTime;
  }

  // If task reaches 100% completion, record endTime
  if (status === 'DONE' || progress === 100) {
    taskUpdateData.endTime = currentTime;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: taskUpdateData,
  });

  revalidatePath('/');
  return { progress, status };
}

export async function addSubtask(taskId: string, title: string, weight?: number | null) {
  if (!title.trim()) return null;

  const subtask = await prisma.subtask.create({
    data: {
      taskId,
      title: title.trim(),
      weight: typeof weight === 'number' ? weight : null,
      isDone: false,
    },
  });

  const allSubtasks = await prisma.subtask.findMany({ where: { taskId } });
  const { progress, status } = calculateTaskProgress(allSubtasks);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      progress: progress,
      status: status,
    },
  });

  revalidatePath('/');
  return subtask;
}

export async function updateSubtask(
  subtaskId: string,
  taskId: string,
  data: { title?: string; weight?: number | null; isDone?: boolean }
) {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.isDone !== undefined) updateData.isDone = data.isDone;

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: updateData,
  });

  const allSubtasks = await prisma.subtask.findMany({ where: { taskId } });
  const { progress, status } = calculateTaskProgress(allSubtasks);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      progress,
      status,
    },
  });

  revalidatePath('/');
  return { progress, status };
}

export async function deleteSubtask(subtaskId: string, taskId: string) {
  await prisma.subtask.delete({
    where: { id: subtaskId },
  });

  const allSubtasks = await prisma.subtask.findMany({ where: { taskId } });
  const { progress, status } = calculateTaskProgress(allSubtasks);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      progress: progress,
      status: status,
    },
  });

  revalidatePath('/');
  return { success: true };
}

/**
 * Fetch monthly aggregated task & log data for exports & reporting
 */
export async function getMonthlyReportData(options: {
  year: number;
  month: number; // 1-12
  userId?: string;
}) {
  const { year, month, userId } = options;
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const userWhere: any = { isActive: true };
  if (userId && userId !== 'ALL') {
    userWhere.id = userId;
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    include: {
      tasks: {
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          subtasks: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      },
      logs: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        orderBy: [{ date: 'asc' }],
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let totalProgress = 0;

  const flattenedTasks: any[] = [];

  users.forEach((u) => {
    u.tasks.forEach((t) => {
      totalTasks++;
      if (t.status === 'DONE') completedTasks++;
      else if (t.status === 'IN_PROGRESS') inProgressTasks++;
      totalProgress += t.progress || 0;

      flattenedTasks.push({
        id: t.id,
        date: t.createdAt,
        userName: u.name,
        userEmail: u.email,
        title: t.title,
        description: t.description,
        status: t.status,
        progress: t.progress,
        priority: t.priority,
        assignedBy: t.assignedBy,
        startTime: t.startTime,
        endTime: t.endTime,
        subtasksCount: t.subtasks?.length || 0,
        completedSubtasks: t.subtasks?.filter((s) => s.isDone).length || 0,
      });
    });
  });

  const averageProductivity =
    totalTasks > 0 ? (totalProgress / totalTasks).toFixed(2) : '0.00';

  return {
    users,
    tasks: flattenedTasks,
    summary: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks: totalTasks - completedTasks - inProgressTasks,
      averageProductivity,
      monthName: formatLocalDate(startDate, { month: 'long', year: 'numeric' }),
    },
  };
}

/**
 * Monday Developer Workplan Report:
 * Summarizes ongoing, pending backlog, and scheduled tasks for every developer on the team
 * with formatted text ready to copy to clipboard for managers + structured PDF data.
 */
export async function getMondayWorkplanReportData() {
  const { startOfDay: todayStart, formattedShort: dateStr } = getDayBounds(new Date());

  const activeUsers = await prisma.user.findMany({
    where: { isActive: true },
    include: {
      tasks: {
        where: {
          OR: [
            { status: { in: ['TODO', 'IN_PROGRESS'] } },
            { recurrence: { in: ['DAILY', 'WEEKLY'] } },
            { createdAt: { gte: todayStart } },
          ],
        },
        include: {
          subtasks: true,
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      },
      logs: {
        where: {
          date: { gte: todayStart },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  const developersWorkplan = activeUsers.map((u) => {
    const ongoing = u.tasks.filter(
      (t) => t.status !== 'DONE' && (Boolean(t.startTime) || t.status === 'IN_PROGRESS')
    );
    const carryOver = u.tasks.filter(
      (t) =>
        new Date(t.createdAt) < todayStart &&
        t.status !== 'DONE' &&
        !t.startTime &&
        t.status !== 'IN_PROGRESS'
    );
    const activeToday = u.tasks.filter(
      (t) =>
        new Date(t.createdAt) >= todayStart &&
        t.status !== 'DONE' &&
        !t.startTime &&
        t.status !== 'IN_PROGRESS'
    );
    const todayLog = u.logs[0] || null;

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      totalActive: ongoing.length + carryOver.length + activeToday.length,
      ongoing,
      carryOver,
      activeToday,
      blockers: todayLog?.blockers || null,
      summaryNotes: todayLog?.summary || null,
    };
  });

  // Build Creative Text Summary for Manager Clipboard Sharing
  let textSummary = `*TEAM WORKPLAN & TASK REPORT*\nDate: ${dateStr}\n========================================\n\n`;

  developersWorkplan.forEach((dev) => {
    textSummary += `*${dev.name.toUpperCase()}*\n`;
    textSummary += `Total Active Items: ${dev.totalActive}\n`;

    if (dev.ongoing.length > 0) {
      textSummary += `IN PROGRESS (${dev.ongoing.length}):\n`;
      dev.ongoing.forEach((t) => {
        textSummary += `  - ${t.title} (${Number(t.progress || 0).toFixed(0)}% done)\n`;
      });
    }

    if (dev.carryOver.length > 0) {
      textSummary += `PENDING BACKLOG (${dev.carryOver.length}):\n`;
      dev.carryOver.forEach((t) => {
        textSummary += `  - ${t.title}${t.dueDate ? ` (Due: ${new Date(t.dueDate).toLocaleDateString('en-US')})` : ''}\n`;
      });
    }

    if (dev.activeToday.length > 0) {
      textSummary += `SCHEDULED TODAY (${dev.activeToday.length}):\n`;
      dev.activeToday.forEach((t) => {
        textSummary += `  - ${t.title}\n`;
      });
    }

    if (dev.totalActive === 0) {
      textSummary += `  (No active tasks pending)\n`;
    }

    if (dev.blockers) {
      textSummary += `Blocker Note: ${dev.blockers}\n`;
    }

    textSummary += `\n`;
  });

  textSummary += `========================================\nGenerated via To-Do MACM`;

  const reportPayload = {
    dateStr,
    developers: developersWorkplan,
    textSummary,
    totalDevelopers: activeUsers.length,
    totalActiveTasks: developersWorkplan.reduce((sum, d) => sum + d.totalActive, 0),
  };

  // Automatically log to reports archive
  try {
    const todayStartOfDay = new Date();
    todayStartOfDay.setHours(0, 0, 0, 0);
    const existing = await prisma.savedReport.findFirst({
      where: {
        type: 'MONDAY_KICKOFF',
        period: dateStr,
        createdAt: { gte: todayStartOfDay },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await prisma.savedReport.update({
        where: { id: existing.id },
        data: {
          title: `Monday Workplan (${dateStr})`,
          summaryText: textSummary,
          reportData: JSON.stringify(reportPayload),
          totalTasks: reportPayload.totalActiveTasks,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.savedReport.create({
        data: {
          type: 'MONDAY_KICKOFF',
          title: `Monday Workplan (${dateStr})`,
          period: dateStr,
          summaryText: textSummary,
          reportData: JSON.stringify(reportPayload),
          totalTasks: reportPayload.totalActiveTasks,
          completedCount: 0,
          inProgressCount: developersWorkplan.reduce((sum, d) => sum + d.ongoing.length, 0),
          pendingCount: developersWorkplan.reduce((sum, d) => sum + d.carryOver.length + d.activeToday.length, 0),
          completionRate: 0,
        },
      });
    }
  } catch (err) {
    console.error('Auto-archiving Monday report failed', err);
  }

  return reportPayload;
}

/**
 * Saturday Team Progress Report:
 * Handles weekly deliverables and automatically switches to full-month report on the last Saturday of the month.
 */
export async function getSaturdayProgressReportData(forcePeriod?: 'WEEKLY' | 'MONTHLY' | 'AUTO') {
  const now = new Date();
  const isLastSat = isLastSaturdayOfMonth(now);
  const isMonthly = forcePeriod === 'MONTHLY' || (forcePeriod !== 'WEEKLY' && isLastSat);

  let startDate: Date;
  let endDate: Date;
  let periodTitle: string;

  if (isMonthly) {
    const { year, month } = getLocalDateParts(now);

    const monthBounds = getMonthBounds(year, month);
    startDate = monthBounds.startOfMonth;
    endDate = monthBounds.endOfMonth;
    periodTitle = `Monthly Team Deliverables (${formatLocalDate(startDate, { month: 'long', year: 'numeric' })})`;
  } else {
    const weekBounds = getWeekBounds(now);
    startDate = weekBounds.startOfWeek;
    endDate = weekBounds.endOfWeek;
    periodTitle = `Weekly Team Progress (${formatLocalDate(startDate, { month: 'short', day: 'numeric' })} - ${formatLocalDate(endDate, { month: 'short', day: 'numeric', year: 'numeric' })})`;
  }

  const activeUsers = await prisma.user.findMany({
    where: { isActive: true },
    include: {
      tasks: {
        where: {
          OR: [
            { createdAt: { gte: startDate, lte: endDate } },
            { updatedAt: { gte: startDate, lte: endDate } },
            { status: { in: ['TODO', 'IN_PROGRESS'] } },
            { recurrence: { in: ['DAILY', 'WEEKLY'] } },
          ],
        },
        include: { subtasks: true },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      },
      meetings: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
      },
      logs: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'desc' },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  let totalTasks = 0;
  let totalCompleted = 0;
  let totalInProgress = 0;
  let totalPending = 0;
  let totalMeetings = 0;
  let grandProgressSum = 0;

  const developersBreakdown = activeUsers.map((u) => {
    const devCompleted = u.tasks.filter((t) => t.status === 'DONE');
    const devInProgress = u.tasks.filter((t) => t.status === 'IN_PROGRESS' || (t.progress > 0 && t.status !== 'DONE'));
    const devPending = u.tasks.filter((t) => t.status === 'TODO' && !t.startTime && t.progress === 0);

    const devTotalItems = u.tasks.length + u.meetings.length;
    const devProgressSum = u.tasks.reduce((sum, t) => sum + (t.progress || 0), 0) + u.meetings.length * 100;
    const devAvgProd = devTotalItems > 0 ? (devProgressSum / devTotalItems).toFixed(2) : '0.00';

    totalTasks += u.tasks.length;
    totalCompleted += devCompleted.length;
    totalInProgress += devInProgress.length;
    totalPending += devPending.length;
    totalMeetings += u.meetings.length;
    grandProgressSum += devProgressSum;

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      totalTasks: u.tasks.length,
      completedTasks: devCompleted,
      inProgressTasks: devInProgress,
      pendingTasks: devPending,
      meetings: u.meetings,
      productivityScore: devAvgProd,
      completionRate: u.tasks.length > 0 ? ((devCompleted.length / u.tasks.length) * 100).toFixed(1) : '0.0',
    };
  });

  const grandTotalItems = totalTasks + totalMeetings;
  const overallTeamProductivity = grandTotalItems > 0 ? (grandProgressSum / grandTotalItems).toFixed(2) : '0.00';
  const overallTeamCompletionRate = totalTasks > 0 ? ((totalCompleted / totalTasks) * 100).toFixed(1) : '0.0';

  // Build Formatted Clipboard Summary
  let textSummary = `*${isMonthly ? 'MONTHLY' : 'WEEKLY'} TEAM PROGRESS & COMPLETION REPORT*\nPeriod: ${periodTitle}\n`;
  textSummary += `Team Overall Completion: ${overallTeamCompletionRate}% | Productivity Score: ${overallTeamProductivity}%\n`;
  textSummary += `Total Deliverables: ${totalTasks} (${totalCompleted} Done, ${totalInProgress} In Progress, ${totalPending} Pending) + ${totalMeetings} Meetings\n`;
  textSummary += `========================================\n\n`;

  developersBreakdown.forEach((dev) => {
    textSummary += `*${dev.name.toUpperCase()}* — ${dev.completionRate}% Done (Productivity: ${dev.productivityScore}%)\n`;
    textSummary += `Deliverables: ${dev.totalTasks} Total (${dev.completedTasks.length} Done, ${dev.inProgressTasks.length} In Progress, ${dev.pendingTasks.length} Pending) | ${dev.meetings.length} Meetings\n`;

    if (dev.completedTasks.length > 0) {
      textSummary += `  COMPLETED DELIVERABLES (${dev.completedTasks.length}):\n`;
      dev.completedTasks.forEach((t) => {
        textSummary += `    - ${t.title}\n`;
      });
    }

    if (dev.inProgressTasks.length > 0) {
      textSummary += `  IN-PROGRESS ITEMS (${dev.inProgressTasks.length}):\n`;
      dev.inProgressTasks.forEach((t) => {
        textSummary += `    - ${t.title} (${Number(t.progress || 0).toFixed(0)}% done)\n`;
      });
    }

    if (dev.pendingTasks.length > 0) {
      textSummary += `  PENDING BACKLOG (${dev.pendingTasks.length}):\n`;
      dev.pendingTasks.forEach((t) => {
        textSummary += `    - ${t.title}${t.dueDate ? ` (Due: ${new Date(t.dueDate).toLocaleDateString('en-US')})` : ''}\n`;
      });
    }

    textSummary += `\n`;
  });

  textSummary += `========================================\nGenerated via To-Do MACM`;

  const reportPayload = {
    isMonthly,
    isLastSaturday: isLastSat,
    periodTitle,
    startDate,
    endDate,
    summary: {
      totalTasks,
      totalCompleted,
      totalInProgress,
      totalPending,
      totalMeetings,
      overallTeamProductivity,
      overallTeamCompletionRate,
    },
    developers: developersBreakdown,
    textSummary,
  };

  // Automatically log to reports archive
  try {
    const todayStartOfDay = new Date();
    todayStartOfDay.setHours(0, 0, 0, 0);
    const reportType = isMonthly ? 'MONTHLY_SUMMARY' : 'SATURDAY_PROGRESS';
    const existing = await prisma.savedReport.findFirst({
      where: {
        type: reportType,
        period: periodTitle,
        createdAt: { gte: todayStartOfDay },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await prisma.savedReport.update({
        where: { id: existing.id },
        data: {
          title: `${isMonthly ? 'Monthly' : 'Weekly'} Progress (${periodTitle})`,
          summaryText: textSummary,
          reportData: JSON.stringify(reportPayload),
          totalTasks,
          completedCount: totalCompleted,
          inProgressCount: totalInProgress,
          pendingCount: totalPending,
          completionRate: parseFloat(overallTeamCompletionRate) || 0,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.savedReport.create({
        data: {
          type: reportType,
          title: `${isMonthly ? 'Monthly' : 'Weekly'} Progress (${periodTitle})`,
          period: periodTitle,
          summaryText: textSummary,
          reportData: JSON.stringify(reportPayload),
          totalTasks,
          completedCount: totalCompleted,
          inProgressCount: totalInProgress,
          pendingCount: totalPending,
          completionRate: parseFloat(overallTeamCompletionRate) || 0,
        },
      });
    }
  } catch (err) {
    console.error('Auto-archiving Saturday report failed', err);
  }

  return reportPayload;
}
