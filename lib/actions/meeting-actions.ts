'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { getDayBounds } from '../time-utils';

export async function getTodayMeetings(userId: string, targetDate?: Date) {
  const { startOfDay, endOfDay } = getDayBounds(targetDate || new Date());

  return prisma.meetingLog.findMany({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function createMeeting(formData: {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  userId: string;
  date?: string | Date;
}) {
  if (!formData.title?.trim()) {
    throw new Error('Meeting title is required');
  }
  if (!formData.startTime?.trim() || !formData.endTime?.trim()) {
    throw new Error('Start time and end time are required');
  }

  const meetingDate = formData.date ? new Date(formData.date) : new Date();

  const meeting = await prisma.meetingLog.create({
    data: {
      title: formData.title.trim(),
      startTime: formData.startTime.trim(),
      endTime: formData.endTime.trim(),
      description: formData.description?.trim() || null,
      userId: formData.userId,
      date: meetingDate,
    },
  });

  revalidatePath('/');
  return meeting;
}

export async function updateMeeting(
  meetingId: string,
  formData: {
    title?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
  }
) {
  const updatePayload: any = {};
  if (formData.title !== undefined) updatePayload.title = formData.title.trim();
  if (formData.startTime !== undefined) updatePayload.startTime = formData.startTime.trim();
  if (formData.endTime !== undefined) updatePayload.endTime = formData.endTime.trim();
  if (formData.description !== undefined) updatePayload.description = formData.description?.trim() || null;

  const meeting = await prisma.meetingLog.update({
    where: { id: meetingId },
    data: updatePayload,
  });

  revalidatePath('/');
  return meeting;
}

export async function deleteMeeting(meetingId: string) {
  await prisma.meetingLog.delete({
    where: { id: meetingId },
  });

  revalidatePath('/');
  return { success: true };
}
