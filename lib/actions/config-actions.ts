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
import { formatTo24HrDot } from '../time-utils';

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
