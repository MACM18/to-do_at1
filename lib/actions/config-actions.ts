'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import {
  verifySmtpConnection,
  sendTestEmail,
  sendMorningReportEmail,
  sendEveningSummaryEmail,
} from '../mailer';
import { initScheduler } from '../scheduler';
import { formatTo24HrDot, getLocalDateParts, getDayBounds } from '../time-utils';

export async function getConfig() {
  if (!prisma || !prisma.appConfig) {
    return {
      id: 'global_config',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: '',
      smtpPassword: '',
      senderName: 'Daily Focus & Team Tracker',
      emailRecipients: '',
      toRecipients: '',
      ccRecipients: '',
      bccRecipients: '',
      morningReportTime: '08:00',
      eveningReportTime: '18:00',
      saturdayReportTime: '13:30',
      shiftStartTime: '08.30',
      prepEndTime: '08.45',
      shiftEndTime: '17.30',
      saturdayShiftEndTime: '13.30',
      autoSendMorningReport: false,
      autoSendDailyLog: false,
      pausedEveningLogDate: null,
      pausedEveningLogReason: null,
      telegramChatId: '',
      telegramNotificationsEnabled: false,
    };
  }

  let config = await prisma.appConfig.findUnique({
    where: { id: 'global_config' },
  });

  if (!config) {
    config = await prisma.appConfig.create({
      data: {
        id: 'global_config',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: '',
        smtpPassword: '',
        senderName: 'Daily Focus & Team Tracker',
        emailRecipients: '',
        toRecipients: '',
        ccRecipients: '',
        bccRecipients: '',
        morningReportTime: '08:00',
        eveningReportTime: '18:00',
        saturdayReportTime: '13:30',
        shiftStartTime: '08.30',
        prepEndTime: '08.45',
        shiftEndTime: '17.30',
        saturdayShiftEndTime: '13.30',
        autoSendMorningReport: false,
        autoSendDailyLog: false,
        telegramChatId: '',
        telegramNotificationsEnabled: false,
      },
    });
  }

  return config;
}

export async function updateConfig(data: {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  senderName?: string;
  emailRecipients?: string;
  toRecipients?: string;
  ccRecipients?: string;
  bccRecipients?: string;
  morningReportTime?: string;
  eveningReportTime?: string;
  saturdayReportTime?: string;
  shiftStartTime?: string;
  prepEndTime?: string;
  shiftEndTime?: string;
  saturdayShiftEndTime?: string;
  autoSendMorningReport?: boolean;
  autoSendDailyLog?: boolean;
  pausedEveningLogDate?: string | null;
  pausedEveningLogReason?: string | null;
  telegramChatId?: string;
  telegramNotificationsEnabled?: boolean;
  defaultUserId?: string;
}) {
  const updatePayload: any = {};

  if (data.smtpHost !== undefined) updatePayload.smtpHost = data.smtpHost.trim();
  if (data.smtpPort !== undefined) updatePayload.smtpPort = Number(data.smtpPort) || 465;
  if (data.smtpSecure !== undefined) updatePayload.smtpSecure = Boolean(data.smtpSecure);
  if (data.smtpUser !== undefined) updatePayload.smtpUser = data.smtpUser.trim();
  if (data.smtpPassword !== undefined && data.smtpPassword !== '') {
    updatePayload.smtpPassword = data.smtpPassword.trim();
  }
  if (data.senderName !== undefined) updatePayload.senderName = data.senderName.trim();
  if (data.emailRecipients !== undefined)
    updatePayload.emailRecipients = data.emailRecipients.trim();
  if (data.toRecipients !== undefined)
    updatePayload.toRecipients = data.toRecipients.trim();
  if (data.ccRecipients !== undefined)
    updatePayload.ccRecipients = data.ccRecipients.trim();
  if (data.bccRecipients !== undefined)
    updatePayload.bccRecipients = data.bccRecipients.trim();
  if (data.morningReportTime !== undefined)
    updatePayload.morningReportTime = data.morningReportTime.trim();
  if (data.eveningReportTime !== undefined)
    updatePayload.eveningReportTime = data.eveningReportTime.trim();
  if (data.saturdayReportTime !== undefined)
    updatePayload.saturdayReportTime = data.saturdayReportTime.trim();
  if (data.shiftStartTime !== undefined)
    updatePayload.shiftStartTime = formatTo24HrDot(data.shiftStartTime);
  if (data.prepEndTime !== undefined)
    updatePayload.prepEndTime = formatTo24HrDot(data.prepEndTime);
  if (data.shiftEndTime !== undefined)
    updatePayload.shiftEndTime = formatTo24HrDot(data.shiftEndTime);
  if (data.saturdayShiftEndTime !== undefined)
    updatePayload.saturdayShiftEndTime = formatTo24HrDot(data.saturdayShiftEndTime);
  if (data.autoSendMorningReport !== undefined)
    updatePayload.autoSendMorningReport = Boolean(data.autoSendMorningReport);
  if (data.autoSendDailyLog !== undefined)
    updatePayload.autoSendDailyLog = Boolean(data.autoSendDailyLog);
  if (data.pausedEveningLogDate !== undefined)
    updatePayload.pausedEveningLogDate = data.pausedEveningLogDate;
  if (data.pausedEveningLogReason !== undefined)
    updatePayload.pausedEveningLogReason = data.pausedEveningLogReason;
  if (data.telegramChatId !== undefined)
    updatePayload.telegramChatId = data.telegramChatId.trim();
  if (data.telegramNotificationsEnabled !== undefined)
    updatePayload.telegramNotificationsEnabled = Boolean(data.telegramNotificationsEnabled);
  if (data.defaultUserId !== undefined) updatePayload.defaultUserId = data.defaultUserId;

  const config = await prisma.appConfig.upsert({
    where: { id: 'global_config' },
    update: updatePayload,
    create: {
      id: 'global_config',
      ...updatePayload,
    },
  });

  await initScheduler();

  revalidatePath('/');
  return config;
}

/**
 * Toggles pause/resume of the evening task log automated dispatch for a given date (default today).
 * Perfect for Holiday or Leave days.
 */
export async function togglePauseEveningLogForTodayAction(targetDate?: string | Date, reason?: string) {
  const d = targetDate ? (typeof targetDate === 'string' ? new Date(targetDate) : targetDate) : new Date();
  const { dateStr } = getLocalDateParts(d);

  const config = await prisma.appConfig.findUnique({
    where: { id: 'global_config' },
  });

  const isCurrentlyPaused = config?.pausedEveningLogDate === dateStr;

  let newPausedDate: string | null = null;
  let newReason: string | null = null;

  if (!isCurrentlyPaused) {
    newPausedDate = dateStr;
    newReason = reason || 'Holiday / Leave';
  }

  const updatedConfig = await prisma.appConfig.upsert({
    where: { id: 'global_config' },
    update: {
      pausedEveningLogDate: newPausedDate,
      pausedEveningLogReason: newReason,
    },
    create: {
      id: 'global_config',
      pausedEveningLogDate: newPausedDate,
      pausedEveningLogReason: newReason,
    },
  });

  // Also update today's evening draft status if exists
  const { startOfDay: todayStart, endOfDay: todayEnd } = getDayBounds(d);
  const eveningDraft = await prisma.emailDraft.findFirst({
    where: {
      type: 'EVENING_TASKLOG',
      date: { gte: todayStart, lte: todayEnd },
    },
  });

  if (eveningDraft && eveningDraft.status !== 'SENT') {
    await prisma.emailDraft.update({
      where: { id: eveningDraft.id },
      data: {
        status: isCurrentlyPaused ? 'DRAFT' : 'PAUSED',
      },
    });
  }

  revalidatePath('/');
  return {
    success: true,
    isPaused: !isCurrentlyPaused,
    pausedDate: newPausedDate,
    pausedReason: newReason,
    config: updatedConfig,
    message: !isCurrentlyPaused
      ? `Today (${dateStr}) marked as Holiday / Leave. Automated evening task log email is paused for today.`
      : `Evening task log automated dispatch resumed for today (${dateStr}).`,
  };
}

export async function getTelegramStatusAction() {
  const hasBotToken = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  return { hasBotToken };
}

export async function testTelegramAction(customChatId?: string) {
  let targetChatId = customChatId?.trim();
  if (!targetChatId) {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    targetChatId = config?.telegramChatId?.trim();
  }
  if (!targetChatId) {
    return { success: false, error: 'Please enter a Telegram Chat ID first.' };
  }
  const { testTelegramConnection } = await import('../telegram');
  return testTelegramConnection(targetChatId);
}

export async function testSmtpConnectionAction(customConfig?: {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
}) {
  return verifySmtpConnection(customConfig);
}

export async function sendTestEmailAction(email: string) {
  return sendTestEmail(email);
}

export async function triggerMorningReportAction(
  userId?: string,
  recipientOverride?: string,
  customCheckInTime?: string
) {
  // Support both (userId, recipientOverride, customCheckInTime) and (userId, customCheckInTime)
  const checkIn = customCheckInTime || (recipientOverride && !recipientOverride.includes('@') ? recipientOverride : undefined);
  return sendMorningReportEmail(userId, checkIn);
}

export async function triggerEveningSummaryAction(
  userIdOrRecipient?: string,
  userId?: string,
  customCheckOutTime?: string
) {
  const targetId = userId || (userIdOrRecipient && !userIdOrRecipient.includes('@') ? userIdOrRecipient : undefined);
  return sendEveningSummaryEmail(new Date(), targetId, customCheckOutTime);
}
