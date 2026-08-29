'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';

export async function getDailyLogs(userId?: string) {
  if (!prisma || !prisma.dailyLog) {
    return [];
  }

  const whereClause = userId ? { userId } : {};

  return prisma.dailyLog.findMany({
    where: whereClause,
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { date: 'desc' },
    take: 50,
  });
}

export async function createDailyLog(data: {
  summary: string;
  blockers?: string;
  userId: string;
  date?: string;
}) {
  if (!data.summary?.trim()) {
    throw new Error('Summary is required');
  }

  const log = await prisma.dailyLog.create({
    data: {
      summary: data.summary.trim(),
      blockers: data.blockers?.trim() || null,
      userId: data.userId,
      date: data.date ? new Date(data.date) : new Date(),
    },
    include: {
      user: true,
    },
  });

  revalidatePath('/');
  return log;
}

export async function deleteDailyLog(logId: string) {
  await prisma.dailyLog.delete({
    where: { id: logId },
  });
  revalidatePath('/');
  return { success: true };
}
