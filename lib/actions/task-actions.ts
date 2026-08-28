'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { processRecurringTasks } from '../recurrence';

export async function getTasks(userId?: string) {
  await processRecurringTasks(userId);

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
  dueDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  priority?: string;
  assignedBy?: string;
  subtaskTitles?: string[];
}) {
  if (!formData.title?.trim()) {
    throw new Error('Task title is required');
  }

  const subtasksData =
    formData.subtaskTitles && formData.subtaskTitles.length > 0
      ? formData.subtaskTitles
          .filter((t) => t.trim().length > 0)
          .map((title) => ({
            title: title.trim(),
            isDone: false,
          }))
      : [];

  const task = await prisma.task.create({
    data: {
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      recurrence: formData.recurrence || 'NONE',
      userId: formData.userId,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      startTime: formData.startTime?.trim() || null,
      endTime: formData.endTime?.trim() || null,
      priority: formData.priority || 'High',
      assignedBy: formData.assignedBy?.trim() || 'Myself',
      status: 'TODO',
      progress: 0,
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
    dueDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    priority?: string;
    assignedBy?: string;
  }
) {
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

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updatePayload,
    include: { subtasks: true },
  });

  revalidatePath('/');
  return task;
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({
    where: { id: taskId },
  });
  revalidatePath('/');
  return { success: true };
}

// Fast toggle for tasks without subtasks (0% <-> 100%)
export async function toggleTaskComplete(taskId: string, currentStatus: string) {
  const isDone = currentStatus === 'DONE';
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { subtasks: true },
  });

  if (!task) return null;

  if (task.subtasks.length > 0) {
    const nextDone = !isDone;
    await prisma.$transaction([
      prisma.subtask.updateMany({
        where: { taskId },
        data: { isDone: nextDone },
      }),
      prisma.task.update({
        where: { id: taskId },
        data: {
          status: nextDone ? 'DONE' : 'TODO',
          progress: nextDone ? 100 : 0,
        },
      }),
    ]);
  } else {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: isDone ? 'TODO' : 'DONE',
        progress: isDone ? 0 : 100,
      },
    });
  }

  revalidatePath('/');
  return { success: true };
}

// Subtask toggle with weighted progress calculation
export async function toggleSubtask(subtaskId: string, taskId: string) {
  const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!subtask) return;

  const newDoneState = !subtask.isDone;

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { isDone: newDoneState },
  });

  const allSubtasks = await prisma.subtask.findMany({ where: { taskId } });
  const completedCount = allSubtasks.filter((s) =>
    s.id === subtaskId ? newDoneState : s.isDone
  ).length;

  const total = allSubtasks.length;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const status =
    progressPercent === 100 ? 'DONE' : progressPercent > 0 ? 'IN_PROGRESS' : 'TODO';

  await prisma.task.update({
    where: { id: taskId },
    data: {
      progress: progressPercent,
      status: status,
    },
  });

  revalidatePath('/');
  return { progress: progressPercent, status };
}

export async function addSubtask(taskId: string, title: string) {
  if (!title.trim()) return null;

  const subtask = await prisma.subtask.create({
    data: {
      taskId,
      title: title.trim(),
      isDone: false,
    },
  });

  const allSubtasks = await prisma.subtask.findMany({ where: { taskId } });
  const completedCount = allSubtasks.filter((s) => s.isDone).length;
  const total = allSubtasks.length;
  const progressPercent = Math.round((completedCount / total) * 100);
  const status =
    progressPercent === 100 ? 'DONE' : progressPercent > 0 ? 'IN_PROGRESS' : 'TODO';

  await prisma.task.update({
    where: { id: taskId },
    data: {
      progress: progressPercent,
      status: status,
    },
  });

  revalidatePath('/');
  return subtask;
}

export async function deleteSubtask(subtaskId: string, taskId: string) {
  await prisma.subtask.delete({
    where: { id: subtaskId },
  });

  const allSubtasks = await prisma.subtask.findMany({ where: { taskId } });
  const total = allSubtasks.length;
  const completedCount = allSubtasks.filter((s) => s.isDone).length;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const status =
    progressPercent === 100 ? 'DONE' : progressPercent > 0 ? 'IN_PROGRESS' : 'TODO';

  await prisma.task.update({
    where: { id: taskId },
    data: {
      progress: progressPercent,
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
