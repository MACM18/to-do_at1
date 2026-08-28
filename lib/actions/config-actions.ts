'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import {
  verifySmtpConnection,
  sendTestEmail,
  sendMorningTodoList,
  sendDailySummaryReport,
} from '../mailer';
import { initScheduler } from '../scheduler';

export async function getConfig() {
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
        morningReportTime: '08:00',
        eveningReportTime: '18:00',
        shiftStartTime: '8.30',
        prepEndTime: '8.45',
        shiftEndTime: '5.30',
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
  morningReportTime?: string;
  eveningReportTime?: string;
  shiftStartTime?: string;
  prepEndTime?: string;
  shiftEndTime?: string;
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
  if (data.morningReportTime !== undefined)
    updatePayload.morningReportTime = data.morningReportTime.trim();
  if (data.eveningReportTime !== undefined)
    updatePayload.eveningReportTime = data.eveningReportTime.trim();
  if (data.shiftStartTime !== undefined)
    updatePayload.shiftStartTime = data.shiftStartTime.trim();
  if (data.prepEndTime !== undefined)
    updatePayload.prepEndTime = data.prepEndTime.trim();
  if (data.shiftEndTime !== undefined)
    updatePayload.shiftEndTime = data.shiftEndTime.trim();
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

  // Re-sync background scheduler
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

export async function triggerMorningReportAction(userId?: string, recipientOverride?: string) {
  return sendMorningTodoList(userId, recipientOverride);
}

export async function triggerEveningSummaryAction(recipientOverride?: string, userId?: string) {
  return sendDailySummaryReport(recipientOverride, userId);
}
