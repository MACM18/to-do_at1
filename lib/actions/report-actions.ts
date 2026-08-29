'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import {
  getMondayWorkplanReportData,
  getSaturdayProgressReportData,
} from './task-actions';

/**
 * Saves a newly generated report to the archive
 */
export async function saveReport(data: {
  type: string; // MONDAY_KICKOFF, SATURDAY_PROGRESS, MONTHLY_SUMMARY
  title: string;
  period: string;
  createdById?: string | null;
  createdByName?: string | null;
  summaryText: string;
  reportData: any;
  totalTasks?: number;
  completedCount?: number;
  inProgressCount?: number;
  pendingCount?: number;
  completionRate?: number;
}) {
  const report = await prisma.savedReport.create({
    data: {
      type: data.type,
      title: data.title,
      period: data.period,
      createdById: data.createdById || null,
      createdByName: data.createdByName || null,
      summaryText: data.summaryText,
      reportData: typeof data.reportData === 'string' ? data.reportData : JSON.stringify(data.reportData),
      totalTasks: data.totalTasks || 0,
      completedCount: data.completedCount || 0,
      inProgressCount: data.inProgressCount || 0,
      pendingCount: data.pendingCount || 0,
      completionRate: data.completionRate || 0.0,
    },
  });

  revalidatePath('/');
  return report;
}

/**
 * Fetches all saved reports from the database
 */
export async function getSavedReports() {
  const reports = await prisma.savedReport.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return reports.map((r) => ({
    ...r,
    reportData: (() => {
      try {
        return JSON.parse(r.reportData);
      } catch {
        return null;
      }
    })(),
  }));
}

/**
 * Permanently deletes a saved report
 */
export async function deleteSavedReport(reportId: string) {
  await prisma.savedReport.delete({
    where: { id: reportId },
  });

  revalidatePath('/');
  return { success: true };
}

/**
 * Recreates / Regenerates a saved report with fresh live task and team data
 */
export async function recreateSavedReport(reportId: string) {
  const existing = await prisma.savedReport.findUnique({
    where: { id: reportId },
  });

  if (!existing) {
    throw new Error('Report not found');
  }

  let freshData: any;
  let summaryText = '';
  let totalTasks = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let pendingCount = 0;
  let completionRate = 0.0;

  if (existing.type === 'MONDAY_KICKOFF') {
    freshData = await getMondayWorkplanReportData();
    summaryText = freshData.textSummary;
    totalTasks = freshData.totalActiveTasks;
    completedCount = 0;
    inProgressCount = freshData.developers.reduce((sum: number, d: any) => sum + d.ongoing.length, 0);
    pendingCount = freshData.developers.reduce((sum: number, d: any) => sum + d.carryOver.length + d.activeToday.length, 0);
    completionRate = 0;
  } else {
    // SATURDAY_PROGRESS or MONTHLY_SUMMARY
    const isMonthly = existing.type === 'MONTHLY_SUMMARY' || existing.period.toLowerCase().includes('month');
    freshData = await getSaturdayProgressReportData(isMonthly ? 'MONTHLY' : 'WEEKLY');
    summaryText = freshData.textSummary;
    totalTasks = freshData.summary.totalTasks;
    completedCount = freshData.summary.totalCompleted;
    inProgressCount = freshData.summary.totalInProgress;
    pendingCount = freshData.summary.totalPending;
    completionRate = parseFloat(freshData.summary.overallTeamCompletionRate) || 0;
  }

  const updated = await prisma.savedReport.update({
    where: { id: reportId },
    data: {
      summaryText,
      reportData: JSON.stringify(freshData),
      totalTasks,
      completedCount,
      inProgressCount,
      pendingCount,
      completionRate,
      updatedAt: new Date(),
    },
  });

  revalidatePath('/');
  return {
    ...updated,
    reportData: freshData,
  };
}
