import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { processRecurringTasks } from './recurrence';

export interface EmailSendResult {
  success: boolean;
  message: string;
  messageId?: string;
  taskCount?: number;
  recipientCount?: number;
}

/**
 * Creates Nodemailer transporter using dynamic database settings or overrides.
 */
export async function getTransporter(customConfig?: {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
}) {
  const config =
    customConfig ||
    (await prisma.appConfig.findUnique({
      where: { id: 'global_config' },
    }));

  if (!config || !config.smtpUser || !config.smtpPassword) {
    throw new Error(
      'SMTP is not configured. Please enter your Gmail/SMTP email and App Password in Settings.'
    );
  }

  const port = Number(config.smtpPort) || 465;
  const isSecure = config.smtpSecure !== undefined ? Boolean(config.smtpSecure) : port === 465;

  return nodemailer.createTransport({
    host: config.smtpHost || 'smtp.gmail.com',
    port: port,
    secure: isSecure,
    auth: {
      user: config.smtpUser.trim(),
      pass: config.smtpPassword.trim(),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Verifies SMTP connection and authentication.
 */
export async function verifySmtpConnection(customConfig?: {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = await getTransporter(customConfig);
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified successfully!' };
  } catch (error: any) {
    console.error('SMTP Verification Error:', error);
    return {
      success: false,
      message:
        error.message ||
        'Failed to authenticate with SMTP server. Please check your credentials.',
    };
  }
}

/**
 * Retrieves or initializes monthly email thread metadata for threading replies.
 */
async function getMonthlyThreadDetails(userId: string, targetDate: Date = new Date()) {
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`; // e.g. "2026-08"

  const monthName = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const userName = user?.name || 'Lead';

  const baseSubject = `Daily Tasks & Work Log - ${userName} - ${monthName}`;

  const existingThread = await prisma.monthlyEmailThread.findUnique({
    where: {
      userId_monthKey: {
        userId,
        monthKey,
      },
    },
  });

  return {
    monthKey,
    monthName,
    baseSubject,
    existingThread,
  };
}

/**
 * Records the latest message ID to keep the monthly thread chained.
 */
async function saveMonthlyThreadMessage(
  userId: string,
  monthKey: string,
  baseSubject: string,
  messageId: string
) {
  if (!messageId) return;

  const existing = await prisma.monthlyEmailThread.findUnique({
    where: {
      userId_monthKey: {
        userId,
        monthKey,
      },
    },
  });

  if (existing) {
    await prisma.monthlyEmailThread.update({
      where: { id: existing.id },
      data: { lastMessageId: messageId },
    });
  } else {
    await prisma.monthlyEmailThread.create({
      data: {
        userId,
        monthKey,
        rootMessageId: messageId,
        lastMessageId: messageId,
        subject: baseSubject,
      },
    });
  }
}

/**
 * Generates the pixel-perfect HTML table matching the user's template.
 * @param mode 'morning' (Day Plan - no start/end times) | 'evening' (Task Log - with start/end times)
 */
function buildReportTableHtml(options: {
  user: { name: string; email: string };
  tasks: any[];
  config: any;
  mode: 'morning' | 'evening';
  targetDate?: Date;
  customShift?: {
    shiftStartTime?: string | null;
    prepEndTime?: string | null;
    shiftEndTime?: string | null;
  };
}) {
  const { user, tasks, config, mode, targetDate = new Date(), customShift } = options;
  const isMorning = mode === 'morning';
  const planTitle = isMorning ? 'Day Plan' : 'Task Log';

  const dateHeader = targetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const shiftStart = customShift?.shiftStartTime || config?.shiftStartTime || '8.30';
  const prepEnd = customShift?.prepEndTime || config?.prepEndTime || '8.45';
  const shiftEnd = customShift?.shiftEndTime || config?.shiftEndTime || '5.30';

  // Calculate Overall Productivity Ratio
  const totalTasks = tasks.length;
  const totalProgressSum = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
  const overallProductivity =
    totalTasks > 0 ? (totalProgressSum / totalTasks).toFixed(2) : '0.00';

  const getPriorityStyle = (priority: string = 'High') => {
    const p = priority.toLowerCase();
    if (p === 'high') {
      return 'color: #f87171; font-weight: 500;';
    } else if (p === 'medium') {
      return 'color: #38bdf8; font-weight: 500;';
    } else {
      return 'color: #94a3b8; font-weight: 500;';
    }
  };

  const getAssignedByStyle = (assignedBy: string = 'Myself') => {
    const a = assignedBy.trim();
    if (a.toLowerCase() === 'myself') {
      return 'color: #047857; font-weight: bold;';
    } else if (a.toLowerCase().includes('altitude') || a.toLowerCase().includes('lead')) {
      return 'color: #b91c1c; font-weight: bold;';
    } else {
      return 'color: #b45309; font-weight: bold;';
    }
  };

  const getStatusText = (status: string, progress: number) => {
    if (status === 'DONE' || progress === 100) return 'Completed';
    if (progress > 0 || status === 'IN_PROGRESS') return 'In progress';
    return 'Pending';
  };

  const getStatusStyle = (status: string, progress: number) => {
    if (status === 'DONE' || progress === 100) {
      return 'color: #047857; font-weight: 500;';
    }
    return 'color: #1f2937; font-weight: 500;';
  };

  const cellBorder = 'border: 1px solid #000000; padding: 6px 8px; font-size: 13px;';

  const renderTaskRows = () => {
    if (tasks.length === 0) {
      return `
        <tr>
          <td style="${cellBorder} text-align: center;" colspan="7">No tasks recorded for this plan.</td>
        </tr>
      `;
    }

    return tasks
      .map((t) => {
        const startVal = isMorning ? '' : t.startTime || '';
        const endVal = isMorning ? '' : t.endTime || '';
        const statusText = getStatusText(t.status, t.progress);
        const priorityText = t.priority || 'High';
        const assignedByText = t.assignedBy || 'Myself';
        const prodVal = Number(t.progress || 0).toFixed(2) + '%';

        return `
          <tr>
            <td style="${cellBorder} text-align: right; width: 68px;">${startVal}</td>
            <td style="${cellBorder} text-align: right; width: 68px;">${endVal}</td>
            <td style="${cellBorder} text-align: left;">
              ${t.title}
              ${
                t.subtasks && t.subtasks.length > 0
                  ? `<div style="font-size: 11px; color: #555; margin-top: 3px; padding-left: 6px;">
                      ${t.subtasks
                        .map(
                          (s: any) =>
                            `• ${s.isDone ? '✓' : '○'} ${s.title}`
                        )
                        .join('<br/>')}
                    </div>`
                  : ''
              }
            </td>
            <td style="${cellBorder} text-align: center; ${getPriorityStyle(priorityText)} width: 95px;">${priorityText}</td>
            <td style="${cellBorder} text-align: center; ${getAssignedByStyle(assignedByText)} width: 95px;">${assignedByText}</td>
            <td style="${cellBorder} text-align: center; ${getStatusStyle(t.status, t.progress)} width: 95px;">${statusText}</td>
            <td style="${cellBorder} text-align: right; width: 100px;">${prodVal}</td>
          </tr>
        `;
      })
      .join('');
  };

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 960px; margin: 0 auto; color: #000000; background: #ffffff;">
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #000000; margin-bottom: 20px;">
        <thead>
          <tr>
            <th colspan="7" style="background-color: #000000; color: #ffffff; font-size: 24px; font-weight: bold; padding: 12px; text-align: center; letter-spacing: 0.5px;">
              ${dateHeader}
            </th>
          </tr>
          <tr style="background-color: #ffffff; font-weight: bold;">
            <th style="${cellBorder} text-align: left; width: 68px;">Start time</th>
            <th style="${cellBorder} text-align: left; width: 68px;">End time</th>
            <th style="${cellBorder} text-align: center;">${planTitle}</th>
            <th style="${cellBorder} text-align: center; width: 95px;" colspan="4"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${cellBorder} text-align: right;">${shiftStart}</td>
            <td style="${cellBorder}"></td>
            <td colspan="5" style="${cellBorder} background-color: #999999; color: #000000; text-align: center; font-weight: 500;">
              Shift started & Sign In
            </td>
          </tr>

          <tr>
            <td style="${cellBorder} text-align: right;">${isMorning ? '' : shiftStart}</td>
            <td style="${cellBorder} text-align: right;">${isMorning ? '' : prepEnd}</td>
            <td colspan="5" style="${cellBorder}">
              Prepared the Day Plan and prepared for the day
            </td>
          </tr>

          <tr style="font-weight: bold; background-color: #ffffff;">
            <td colspan="3" style="${cellBorder} text-align: center;">Tasks to be complete</td>
            <td style="${cellBorder} text-align: center; width: 95px;">Priority Level</td>
            <td style="${cellBorder} text-align: center; width: 95px;">Assigned by</td>
            <td style="${cellBorder} text-align: center; width: 95px;">Task Status</td>
            <td style="${cellBorder} text-align: center; width: 100px;">Productivity (%)</td>
          </tr>

          ${renderTaskRows()}

          <tr>
            <td style="${cellBorder}"></td>
            <td style="${cellBorder} text-align: right;">${isMorning ? '' : shiftEnd}</td>
            <td colspan="5" style="${cellBorder}">
              Shift off
            </td>
          </tr>

          <tr>
            <td colspan="6" style="${cellBorder} text-align: right; font-weight: bold; font-size: 14px; padding-right: 14px;">
              Overall Productivity Ratio of the Day (${user.name || 'Myself'})
            </td>
            <td style="${cellBorder} background-color: #c4c4c4; text-align: center; font-weight: bold; font-size: 14px;">
              ${overallProductivity}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Sends a test email to verify credentials and inbox delivery.
 */
export async function sendTestEmail(targetEmail: string): Promise<EmailSendResult> {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    if (!config) throw new Error('Global configuration not found.');

    const transporter = await getTransporter();
    const recipient = targetEmail || config.emailRecipients.split(',')[0]?.trim();

    if (!recipient) {
      throw new Error('Please provide a recipient email address.');
    }

    const testUser = { name: 'Myself', email: config.smtpUser };
    const sampleTasks = [
      {
        title: 'Check sales details and update records',
        startTime: '8.45',
        endTime: '9.00',
        priority: 'High',
        assignedBy: 'Altitude1',
        status: 'DONE',
        progress: 100,
      },
      {
        title: 'Webmail creation as per team request',
        startTime: '9.00',
        endTime: '5.30',
        priority: 'Medium',
        assignedBy: 'Altitude1',
        status: 'DONE',
        progress: 100,
      },
    ];

    const testHtml = `
      <div style="font-family: Arial, sans-serif; padding: 10px;">
        <p style="font-size: 14px; color: #333; margin-bottom: 16px;">
          <strong>SMTP Connection Test</strong> — Below is a live preview of your report layout:
        </p>
        ${buildReportTableHtml({
          user: testUser,
          tasks: sampleTasks,
          config,
          mode: 'evening',
        })}
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${config.senderName || 'Daily Focus & Team Tracker'}" <${config.smtpUser}>`,
      to: recipient,
      subject: `Test Report Preview - ${new Date().toLocaleDateString()}`,
      html: testHtml,
    });

    return {
      success: true,
      message: `Test email sent successfully to ${recipient}!`,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('Send Test Email Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to send test email.',
    };
  }
}

/**
 * 1. Morning Day Plan Trigger (Personal)
 * Sends as a reply within the current month's conversation thread.
 * Automatically initiates a new thread at the start of each month.
 */
export async function sendMorningTodoList(
  userId?: string,
  recipientOverride?: string,
  customCheckInTime?: string
): Promise<EmailSendResult> {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    if (!config) throw new Error('Global configuration not found.');

    const recipients = (recipientOverride || config.emailRecipients)
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      throw new Error('No recipient email addresses configured. Please add them in Settings.');
    }

    await processRecurringTasks(userId);

    let targetUser;
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: userId } });
    } else if (config.defaultUserId) {
      targetUser = await prisma.user.findUnique({ where: { id: config.defaultUserId } });
    } else {
      targetUser = await prisma.user.findFirst({ where: { role: 'LEAD', isActive: true } });
    }

    if (!targetUser) {
      targetUser = await prisma.user.findFirst({ where: { isActive: true } });
    }

    if (!targetUser) {
      throw new Error('No active user found to generate morning report for.');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Look up today's custom shift or save checkin
    let shift = await prisma.dailyShift.findFirst({
      where: {
        userId: targetUser.id,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    if (customCheckInTime && customCheckInTime.trim()) {
      if (shift) {
        shift = await prisma.dailyShift.update({
          where: { id: shift.id },
          data: { shiftStartTime: customCheckInTime.trim() },
        });
      } else {
        shift = await prisma.dailyShift.create({
          data: {
            userId: targetUser.id,
            date: todayStart,
            shiftStartTime: customCheckInTime.trim(),
          },
        });
      }
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId: targetUser.id,
        OR: [
          { status: { in: ['TODO', 'IN_PROGRESS'] } },
          { createdAt: { gte: todayStart } },
          { updatedAt: { gte: todayStart } },
        ],
      },
      include: {
        subtasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    const transporter = await getTransporter();

    // Get Monthly Threading Details
    const { monthKey, baseSubject, existingThread } = await getMonthlyThreadDetails(
      targetUser.id,
      todayStart
    );

    const emailHtml = buildReportTableHtml({
      user: targetUser,
      tasks,
      config,
      mode: 'morning',
      customShift: shift
        ? {
            shiftStartTime: shift.shiftStartTime,
            prepEndTime: shift.prepEndTime,
            shiftEndTime: shift.shiftEndTime,
          }
        : undefined,
    });

    const mailOptions: any = {
      from: `"${config.senderName || 'Daily Focus'}" <${config.smtpUser}>`,
      to: recipients.join(', '),
      subject: existingThread ? `Re: ${existingThread.subject}` : baseSubject,
      html: emailHtml,
    };

    // Attach In-Reply-To and References to chain into the monthly thread
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

    // Save/update this month's thread message ID
    await saveMonthlyThreadMessage(targetUser.id, monthKey, baseSubject, info.messageId);

    return {
      success: true,
      message: `Morning Day Plan successfully sent to ${recipients.join(', ')}!`,
      messageId: info.messageId,
      taskCount: tasks.length,
      recipientCount: recipients.length,
    };
  } catch (error: any) {
    console.error('Send Morning List Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to send morning to-do list.',
    };
  }
}

/**
 * 2. Evening Task Log Trigger (Personal)
 * Sends as a reply within the current month's conversation thread.
 * Automatically initiates a new thread at the start of each month.
 */
export async function sendDailySummaryReport(
  recipientOverride?: string,
  targetUserId?: string,
  customCheckOutTime?: string
): Promise<EmailSendResult> {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    if (!config) throw new Error('Global configuration not found.');

    const recipients = (recipientOverride || config.emailRecipients)
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      throw new Error('No recipient email addresses configured. Please add them in Settings.');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const userWhere: any = { isActive: true };
    if (targetUserId) {
      userWhere.id = targetUserId;
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        tasks: {
          where: {
            OR: [
              { updatedAt: { gte: todayStart } },
              { createdAt: { gte: todayStart } },
              { status: { in: ['TODO', 'IN_PROGRESS'] } },
            ],
          },
          include: {
            subtasks: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
        shifts: {
          where: {
            date: { gte: todayStart, lte: todayEnd },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    if (users.length === 0) {
      throw new Error('No active user found to send report for.');
    }

    const primaryUser = users[0];

    // If customCheckOutTime passed for targeted user, persist it
    if (targetUserId && customCheckOutTime && customCheckOutTime.trim()) {
      const existing = await prisma.dailyShift.findFirst({
        where: { userId: targetUserId, date: { gte: todayStart, lte: todayEnd } },
      });
      if (existing) {
        await prisma.dailyShift.update({
          where: { id: existing.id },
          data: { shiftEndTime: customCheckOutTime.trim() },
        });
      } else {
        await prisma.dailyShift.create({
          data: {
            userId: targetUserId,
            date: todayStart,
            shiftEndTime: customCheckOutTime.trim(),
          },
        });
      }
    }

    const transporter = await getTransporter();

    // Get Monthly Threading Details
    const { monthKey, baseSubject, existingThread } = await getMonthlyThreadDetails(
      primaryUser.id,
      todayStart
    );

    let combinedHtml = '';
    let totalTasksCount = 0;

    for (const u of users) {
      totalTasksCount += u.tasks.length;
      const userShift = u.shifts[0] || null;
      const finalShiftEnd =
        (u.id === targetUserId && customCheckOutTime?.trim()) ||
        userShift?.shiftEndTime ||
        config?.shiftEndTime;

      combinedHtml += buildReportTableHtml({
        user: u,
        tasks: u.tasks,
        config,
        mode: 'evening',
        customShift: {
          shiftStartTime: userShift?.shiftStartTime || config?.shiftStartTime,
          prepEndTime: userShift?.prepEndTime || config?.prepEndTime,
          shiftEndTime: finalShiftEnd,
        },
      });
      combinedHtml += '<br/><br/>';
    }

    const mailOptions: any = {
      from: `"${config.senderName || 'Daily Tracker'}" <${config.smtpUser}>`,
      to: recipients.join(', '),
      subject: existingThread ? `Re: ${existingThread.subject}` : baseSubject,
      html: combinedHtml,
    };

    // Attach In-Reply-To and References to chain into the monthly thread
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

    // Save/update this month's thread message ID
    await saveMonthlyThreadMessage(primaryUser.id, monthKey, baseSubject, info.messageId);

    return {
      success: true,
      message: `Task log successfully sent to ${recipients.join(', ')}!`,
      messageId: info.messageId,
      taskCount: totalTasksCount,
      recipientCount: recipients.length,
    };
  } catch (error: any) {
    console.error('Send Daily Summary Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to send task log.',
    };
  }
}
