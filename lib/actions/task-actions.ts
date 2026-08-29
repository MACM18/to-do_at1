'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { processRecurringTasks } from '../recurrence';
import { getLocalTimeDot } from '../time-utils';

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
  await processRecurringTasks(userId);

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

  const { progress, status } = calculateTaskProgress(subtasksData);

  const task = await prisma.task.create({
    data: {
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      recurrence: formData.recurrence || 'NONE',
      userId: formData.userId,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      startTime: formData.startTime?.trim() || (formData.recurrence === 'DAILY' ? '8.30' : null),
      endTime: formData.endTime?.trim() || null,
      priority: formData.priority || 'High',
      assignedBy: formData.assignedBy?.trim() || 'Myself',
      status: status,
      progress: progress,
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

function getCurrentDotTime(): string {
  return getLocalTimeDot();
}

export async function startTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return null;

  const updateData: any = {};
  if (!task.startTime) {
    if (task.recurrence === 'DAILY') {
      const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
      updateData.startTime = config?.shiftStartTime || '8.30';
    } else {
      updateData.startTime = getCurrentDotTime();
    }
  }

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
      taskUpdateData.startTime = task.recurrence === 'DAILY' ? '8.30' : currentTime;
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
    taskUpdateData.startTime = parentTask.recurrence === 'DAILY' ? '8.30' : currentTime;
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
      monthName: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    },
  };
}
