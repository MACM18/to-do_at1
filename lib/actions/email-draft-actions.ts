'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { getDayBounds, formatTo24HrDot } from '../time-utils';
import {
  getTransporter,
  resolveRecipients,
  getMonthlyThreadDetails,
  saveMonthlyThreadMessage,
  buildReportTableHtml,
} from '../mailer';

/**
 * Automatically prunes email draft records older than 30 days
 */
export async function pruneOldEmailDrafts() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await prisma.emailDraft.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
  } catch (error) {
    console.error('Error pruning old email drafts:', error);
  }
}

/**
 * Retrieves the email draft for today (or generates a fresh live preview if not saved yet)
 */
export async function getEmailDraftPreview(params: {
  userId: string;
  type: 'MORNING_PLAN' | 'EVENING_TASKLOG';
  date?: string | Date;
  customCheckInTime?: string;
  customCheckOutTime?: string;
}) {
  await pruneOldEmailDrafts();

  const { userId, type, date, customCheckInTime, customCheckOutTime } = params;
  const targetDate = date ? new Date(date) : new Date();
  const { startOfDay: todayStart, endOfDay: todayEnd, dayOfWeek } = getDayBounds(targetDate);

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    throw new Error('User not found.');
  }

  const config = await prisma.appConfig.findUnique({
    where: { id: 'global_config' },
  });

  const { toList, ccList, bccList } = resolveRecipients(config);

  const isSaturday = dayOfWeek === 6;
  const defaultShiftStart = formatTo24HrDot(config?.shiftStartTime || '08.30');
  const defaultShiftEnd = isSaturday ? '13.30' : formatTo24HrDot(config?.shiftEndTime || '17.30');

  // Check if a saved draft exists in database for this user, date and type
  const savedDraft = await prisma.emailDraft.findFirst({
    where: {
      userId,
      type,
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get monthly thread metadata for conversation ID
  const { monthKey, baseSubject, existingThread } = await getMonthlyThreadDetails(
    targetUser.id,
    todayStart,
    toList.join(', ')
  );

  if (savedDraft) {
    return {
      id: savedDraft.id,
      userId: savedDraft.userId,
      userName: targetUser.name,
      userEmail: targetUser.email,
      type: savedDraft.type,
      date: savedDraft.date.toISOString(),
      subject: savedDraft.subject,
      threadSubject: savedDraft.threadSubject || existingThread?.subject || baseSubject,
      monthKey,
      rootMessageId: existingThread?.rootMessageId || null,
      lastMessageId: existingThread?.lastMessageId || null,
      isThreadActive: Boolean(existingThread && existingThread.rootMessageId),
      toRecipients: savedDraft.toRecipients,
      ccRecipients: savedDraft.ccRecipients || '',
      bccRecipients: savedDraft.bccRecipients || '',
      bodyHtml: savedDraft.bodyHtml,
      bodyText: savedDraft.bodyText || '',
      checkInTime: savedDraft.checkInTime || defaultShiftStart,
      checkOutTime: savedDraft.checkOutTime || defaultShiftEnd,
      status: savedDraft.status,
      sentAt: savedDraft.sentAt ? savedDraft.sentAt.toISOString() : null,
      isCustomized: true,
    };
  }

  // Generate a live fresh draft preview
  const shift = await prisma.dailyShift.findFirst({
    where: { userId: targetUser.id, date: { gte: todayStart, lte: todayEnd } },
  });

  const effectiveCheckIn = customCheckInTime
    ? formatTo24HrDot(customCheckInTime)
    : shift?.shiftStartTime
    ? formatTo24HrDot(shift.shiftStartTime)
    : defaultShiftStart;

  const effectiveCheckOut = customCheckOutTime
    ? formatTo24HrDot(customCheckOutTime)
    : shift?.shiftEndTime
    ? formatTo24HrDot(shift.shiftEndTime)
    : defaultShiftEnd;

  const isMorning = type === 'MORNING_PLAN';

  // Query relevant tasks for morning or evening
  const tasks = await prisma.task.findMany({
    where: {
      userId: targetUser.id,
      OR: isMorning
        ? [
            { status: { in: ['TODO', 'IN_PROGRESS'] } },
            { recurrence: { in: ['DAILY', 'WEEKLY'] } },
            { createdAt: { gte: todayStart } },
          ]
        : [
            { status: { in: ['TODO', 'IN_PROGRESS'] } },
            { recurrence: { in: ['DAILY', 'WEEKLY'] } },
            { createdAt: { gte: todayStart, lte: todayEnd } },
            { updatedAt: { gte: todayStart, lte: todayEnd } },
          ],
    },
    include: {
      subtasks: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  });

  const meetings = await prisma.meetingLog.findMany({
    where: {
      userId: targetUser.id,
      date: { gte: todayStart, lte: todayEnd },
    },
    orderBy: { startTime: 'asc' },
  });

  const resolvedSubject = existingThread ? `Re: ${existingThread.subject}` : baseSubject;

  const generatedHtml = buildReportTableHtml({
    user: targetUser,
    tasks,
    meetings,
    config,
    mode: isMorning ? 'morning' : 'evening',
    targetDate: todayStart,
    customShift: {
      shiftStartTime: effectiveCheckIn,
      prepEndTime: config?.prepEndTime || '08.45',
      shiftEndTime: effectiveCheckOut,
    },
  });

  return {
    id: null,
    userId: targetUser.id,
    userName: targetUser.name,
    userEmail: targetUser.email,
    type,
    date: todayStart.toISOString(),
    subject: resolvedSubject,
    threadSubject: existingThread?.subject || baseSubject,
    monthKey,
    rootMessageId: existingThread?.rootMessageId || null,
    lastMessageId: existingThread?.lastMessageId || null,
    isThreadActive: Boolean(existingThread && existingThread.rootMessageId),
    toRecipients: toList.join(', '),
    ccRecipients: ccList.join(', '),
    bccRecipients: bccList.join(', '),
    bodyHtml: generatedHtml,
    bodyText: '',
    checkInTime: effectiveCheckIn,
    checkOutTime: effectiveCheckOut,
    status: 'DRAFT',
    sentAt: null,
    isCustomized: false,
  };
}

/**
 * Saves or updates an email draft in the database
 */
export async function saveEmailDraft(data: {
  userId: string;
  type: 'MORNING_PLAN' | 'EVENING_TASKLOG';
  date?: string | Date;
  subject: string;
  threadSubject?: string;
  toRecipients: string;
  ccRecipients?: string;
  bccRecipients?: string;
  bodyHtml: string;
  bodyText?: string;
  checkInTime?: string;
  checkOutTime?: string;
}) {
  await pruneOldEmailDrafts();

  const targetDate = data.date ? new Date(data.date) : new Date();
  const { startOfDay: todayStart, endOfDay: todayEnd } = getDayBounds(targetDate);

  // If checkIn/checkOut provided, sync to daily shift
  if (data.checkInTime || data.checkOutTime) {
    const existingShift = await prisma.dailyShift.findFirst({
      where: { userId: data.userId, date: { gte: todayStart, lte: todayEnd } },
    });

    const shiftData = {
      ...(data.checkInTime ? { shiftStartTime: formatTo24HrDot(data.checkInTime) } : {}),
      ...(data.checkOutTime ? { shiftEndTime: formatTo24HrDot(data.checkOutTime) } : {}),
    };

    if (existingShift) {
      await prisma.dailyShift.update({
        where: { id: existingShift.id },
        data: shiftData,
      });
    } else {
      await prisma.dailyShift.create({
        data: {
          userId: data.userId,
          date: todayStart,
          ...shiftData,
        },
      });
    }
  }

  // Find existing draft for today
  const existingDraft = await prisma.emailDraft.findFirst({
    where: {
      userId: data.userId,
      type: data.type,
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  let draftRecord;

  if (existingDraft) {
    draftRecord = await prisma.emailDraft.update({
      where: { id: existingDraft.id },
      data: {
        subject: data.subject.trim(),
        threadSubject: data.threadSubject?.trim() || existingDraft.threadSubject,
        toRecipients: data.toRecipients.trim(),
        ccRecipients: data.ccRecipients?.trim() || '',
        bccRecipients: data.bccRecipients?.trim() || '',
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText || null,
        checkInTime: data.checkInTime ? formatTo24HrDot(data.checkInTime) : existingDraft.checkInTime,
        checkOutTime: data.checkOutTime ? formatTo24HrDot(data.checkOutTime) : existingDraft.checkOutTime,
        status: 'DRAFT',
        updatedAt: new Date(),
      },
    });
  } else {
    draftRecord = await prisma.emailDraft.create({
      data: {
        userId: data.userId,
        type: data.type,
        date: todayStart,
        subject: data.subject.trim(),
        threadSubject: data.threadSubject?.trim() || null,
        toRecipients: data.toRecipients.trim(),
        ccRecipients: data.ccRecipients?.trim() || '',
        bccRecipients: data.bccRecipients?.trim() || '',
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText || null,
        checkInTime: data.checkInTime ? formatTo24HrDot(data.checkInTime) : null,
        checkOutTime: data.checkOutTime ? formatTo24HrDot(data.checkOutTime) : null,
        status: 'DRAFT',
      },
    });
  }

  revalidatePath('/');
  return {
    success: true,
    message: 'Email preview customization saved! The scheduled dispatch will automatically send this saved version.',
    draft: draftRecord,
  };
}

/**
 * Immediately dispatches an email draft (either from modal or manual trigger)
 */
export async function sendEmailDraftNow(data: {
  draftId?: string | null;
  userId: string;
  type: 'MORNING_PLAN' | 'EVENING_TASKLOG';
  date?: string | Date;
  subject: string;
  toRecipients: string;
  ccRecipients?: string;
  bccRecipients?: string;
  bodyHtml: string;
  checkInTime?: string;
  checkOutTime?: string;
}) {
  try {
    await pruneOldEmailDrafts();

    const config = await prisma.appConfig.findUnique({
      where: { id: 'global_config' },
    });

    if (!config) {
      throw new Error('Application email settings have not been configured yet.');
    }

    const targetDate = data.date ? new Date(data.date) : new Date();
    const { startOfDay: todayStart, endOfDay: todayEnd, dayOfWeek } = getDayBounds(targetDate);
    const isSaturday = dayOfWeek === 6;

    const toList = data.toRecipients
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    if (toList.length === 0) {
      throw new Error('No recipient ("To") email address specified.');
    }

    const ccList = data.ccRecipients
      ? data.ccRecipients.split(',').map((r) => r.trim()).filter(Boolean)
      : [];

    const bccList = data.bccRecipients
      ? data.bccRecipients.split(',').map((r) => r.trim()).filter(Boolean)
      : [];

    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!targetUser) {
      throw new Error('User not found.');
    }

    // If Evening Task Log, execute completion logic for daily tasks
    if (data.type === 'EVENING_TASKLOG') {
      const defaultEnd = isSaturday ? '13.30' : config.shiftEndTime ? formatTo24HrDot(config.shiftEndTime) : '17.30';
      let finalShiftEnd = data.checkOutTime ? formatTo24HrDot(data.checkOutTime) : defaultEnd;
      if (isSaturday && (!finalShiftEnd || finalShiftEnd === '17.30' || finalShiftEnd === '5.30')) {
        finalShiftEnd = '13.30';
      }

      const dailyTasks = await prisma.task.findMany({
        where: {
          userId: targetUser.id,
          recurrence: 'DAILY',
        },
        include: { subtasks: true },
      });

      const shiftStartVal = data.checkInTime
        ? formatTo24HrDot(data.checkInTime)
        : formatTo24HrDot(config.shiftStartTime || '08.30');

      for (const t of dailyTasks) {
        if (t.subtasks && t.subtasks.length > 0) {
          await prisma.subtask.updateMany({
            where: { taskId: t.id },
            data: { isDone: true },
          });
        }

        let resolvedEndTime = t.endTime ? formatTo24HrDot(t.endTime) : null;
        if (!resolvedEndTime || (isSaturday && (resolvedEndTime === '17.30' || resolvedEndTime === '5.30'))) {
          resolvedEndTime = finalShiftEnd;
        }

        await prisma.task.update({
          where: { id: t.id },
          data: {
            status: 'DONE',
            progress: 100,
            startTime: t.startTime ? formatTo24HrDot(t.startTime) : shiftStartVal,
            endTime: resolvedEndTime,
          },
        });
      }
    }

    const transporter = await getTransporter();

    const { monthKey, baseSubject, existingThread } = await getMonthlyThreadDetails(
      targetUser.id,
      todayStart,
      toList.join(', ')
    );

    const mailOptions: any = {
      from: `"${config.senderName || 'To-Do MACM'}" <${config.smtpUser}>`,
      to: toList.join(', '),
      subject: data.subject.trim(),
      html: data.bodyHtml,
    };

    if (ccList.length > 0) mailOptions.cc = ccList.join(', ');
    if (bccList.length > 0) mailOptions.bcc = bccList.join(', ');

    if (existingThread && existingThread.rootMessageId) {
      const lastMsg = existingThread.lastMessageId || existingThread.rootMessageId;
      mailOptions.inReplyTo = lastMsg;
      mailOptions.references = `${existingThread.rootMessageId} ${lastMsg}`.trim();
      mailOptions.headers = {
        'In-Reply-To': lastMsg,
        References: `${existingThread.rootMessageId} ${lastMsg}`.trim(),
      };
    }

    const info = await transporter.sendMail(mailOptions);

    await saveMonthlyThreadMessage(
      targetUser.id,
      monthKey,
      baseSubject,
      info.messageId,
      toList.join(', ')
    );

    // Save/Update EmailDraft as SENT
    await prisma.emailDraft.upsert({
      where: {
        userId_type_date: {
          userId: targetUser.id,
          type: data.type,
          date: todayStart,
        },
      },
      update: {
        subject: data.subject.trim(),
        toRecipients: toList.join(', '),
        ccRecipients: ccList.join(', '),
        bccRecipients: bccList.join(', '),
        bodyHtml: data.bodyHtml,
        checkInTime: data.checkInTime ? formatTo24HrDot(data.checkInTime) : null,
        checkOutTime: data.checkOutTime ? formatTo24HrDot(data.checkOutTime) : null,
        status: 'SENT',
        sentAt: new Date(),
        messageId: info.messageId,
        updatedAt: new Date(),
      },
      create: {
        userId: targetUser.id,
        type: data.type,
        date: todayStart,
        subject: data.subject.trim(),
        toRecipients: toList.join(', '),
        ccRecipients: ccList.join(', '),
        bccRecipients: bccList.join(', '),
        bodyHtml: data.bodyHtml,
        checkInTime: data.checkInTime ? formatTo24HrDot(data.checkInTime) : null,
        checkOutTime: data.checkOutTime ? formatTo24HrDot(data.checkOutTime) : null,
        status: 'SENT',
        sentAt: new Date(),
        messageId: info.messageId,
      },
    });

    revalidatePath('/');
    return {
      success: true,
      message: `${data.type === 'MORNING_PLAN' ? 'Day Plan' : 'Task Log'} email dispatched successfully to ${toList.join(', ')}`,
    };
  } catch (error: any) {
    console.error('Error sending email draft:', error);
    return {
      success: false,
      message: error.message || 'Failed to dispatch email.',
    };
  }
}

/**
 * Gets draft review / status for today to show badges on buttons
 */
export async function getTodayEmailDraftStatus(userId: string) {
  const { startOfDay: todayStart, endOfDay: todayEnd } = getDayBounds(new Date());

  const drafts = await prisma.emailDraft.findMany({
    where: {
      userId,
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const morningDraft = drafts.find((d) => d.type === 'MORNING_PLAN');
  const eveningDraft = drafts.find((d) => d.type === 'EVENING_TASKLOG');

  return {
    morning: {
      hasDraft: Boolean(morningDraft),
      isSent: morningDraft?.status === 'SENT',
      sentAt: morningDraft?.sentAt ? morningDraft.sentAt.toISOString() : null,
    },
    evening: {
      hasDraft: Boolean(eveningDraft),
      isSent: eveningDraft?.status === 'SENT',
      sentAt: eveningDraft?.sentAt ? eveningDraft.sentAt.toISOString() : null,
    },
  };
}
