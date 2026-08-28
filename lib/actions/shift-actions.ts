'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { getDayBounds } from '../time-utils';

export async function getTodayShift(userId: string) {
  const { startOfDay: todayStart, endOfDay: todayEnd } = getDayBounds(new Date());

  return prisma.dailyShift.findFirst({
    where: {
      userId,
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });
}

export async function saveTodayShift(data: {
  userId: string;
  shiftStartTime?: string;
  prepEndTime?: string;
  shiftEndTime?: string;
}) {
  const { startOfDay: todayStart, endOfDay: todayEnd } = getDayBounds(new Date());

  const existing = await prisma.dailyShift.findFirst({
    where: {
      userId: data.userId,
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  let shift;
  if (existing) {
    shift = await prisma.dailyShift.update({
      where: { id: existing.id },
      data: {
        shiftStartTime: data.shiftStartTime?.trim() || existing.shiftStartTime,
        prepEndTime: data.prepEndTime?.trim() || existing.prepEndTime,
        shiftEndTime: data.shiftEndTime?.trim() || existing.shiftEndTime,
      },
    });
  } else {
    shift = await prisma.dailyShift.create({
      data: {
        userId: data.userId,
        date: todayStart,
        shiftStartTime: data.shiftStartTime?.trim() || null,
        prepEndTime: data.prepEndTime?.trim() || null,
        shiftEndTime: data.shiftEndTime?.trim() || null,
      },
    });
  }

  revalidatePath('/');
  return shift;
}
