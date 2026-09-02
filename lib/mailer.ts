import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { getDayBounds, getLocalTimeDot, formatTo24HrDot, getLocalDateParts } from './time-utils';

/**
 * Normalizes recipient list string for accurate comparison
 */
function normalizeRecipients(recipients?: string | null): string {
  if (!recipients) return '';
  return recipients
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(', ');
}

/**
 * Validates and initializes the Nodemailer SMTP Transporter
 */
export async function getTransporter() {
  const config = await prisma.appConfig.findUnique({
    where: { id: 'global_config' },
  });

  if (!config) {
    throw new Error('Application email settings have not been configured yet.');
  }

  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
    throw new Error(
      'Incomplete SMTP credentials. Please configure SMTP Host, User, and App Password in Settings.'
    );
  }

  const port = Number(config.smtpPort) || 465;
  const isSecure = config.smtpSecure ?? (port === 465);

  const transporter = nodemailer.createTransport({
    host: config.smtpHost.trim(),
    port: port,
    secure: isSecure,
    auth: {
      user: config.smtpUser.trim(),
      pass: config.smtpPassword.replace(/\s+/g, ''),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

/**
 * Resolves To, CC, and BCC recipient arrays from configuration
 */
export function resolveRecipients(config: any): {
  toList: string[];
  ccList: string[];
  bccList: string[];
} {
  let toList: string[] = [];
  let ccList: string[] = [];
  let bccList: string[] = [];

  if (config) {
    const rawTo = config.toRecipients || config.emailRecipients || '';
    if (rawTo && typeof rawTo === 'string') {
      toList = rawTo.split(',').map((r: string) => r.trim()).filter(Boolean);
    }

    if (config.ccRecipients && typeof config.ccRecipients === 'string') {
      ccList = config.ccRecipients.split(',').map((r: string) => r.trim()).filter(Boolean);
    }

    if (config.bccRecipients && typeof config.bccRecipients === 'string') {
      bccList = config.bccRecipients.split(',').map((r: string) => r.trim()).filter(Boolean);
    }
  }

  return { toList, ccList, bccList };
}

/**
 * Retrieves or initializes monthly email thread metadata for threading replies.
 * If the primary "To" recipient list has changed, starts a new clean conversation.
 */
export async function getMonthlyThreadDetails(
  userId: string,
  targetDate: Date = new Date(),
  currentToRecipients: string = ''
) {
  const { monthKey, monthName } = getLocalDateParts(targetDate);
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

  // If primary To recipients changed, do not reply into old thread -> start new conversation
  if (existingThread && existingThread.toRecipients) {
    const normOld = normalizeRecipients(existingThread.toRecipients);
    const normNew = normalizeRecipients(currentToRecipients);

    if (normOld && normNew && normOld !== normNew) {
      return {
        monthKey,
        monthName,
        baseSubject,
        existingThread: null, // Reset to start new thread
      };
    }
  }

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
export async function saveMonthlyThreadMessage(
  userId: string,
  monthKey: string,
  baseSubject: string,
  messageId: string,
  currentToRecipients: string = ''
) {
  if (!messageId) return;

  const normalizedTo = normalizeRecipients(currentToRecipients);

  const existing = await prisma.monthlyEmailThread.findUnique({
    where: {
      userId_monthKey: {
        userId,
        monthKey,
      },
    },
  });

  if (existing) {
    const normOld = normalizeRecipients(existing.toRecipients);
    const isRecipientChanged = normOld && normalizedTo && normOld !== normalizedTo;

    await prisma.monthlyEmailThread.update({
      where: { id: existing.id },
      data: {
        lastMessageId: messageId,
        toRecipients: normalizedTo,
        ...(isRecipientChanged ? { rootMessageId: messageId } : {}),
      },
    });
  } else {
    await prisma.monthlyEmailThread.create({
      data: {
        userId,
        monthKey,
        rootMessageId: messageId,
        lastMessageId: messageId,
        subject: baseSubject,
        toRecipients: normalizedTo,
      },
    });
  }
}

/**
 * Generates the HTML report table matching the user's template.
 * @param mode 'morning' (Day Plan) | 'evening' (Task Log with times, productivity, blockers & meetings)
 */
export function buildReportTableHtml(options: {
  user: { name: string; email: string };
  tasks: any[];
  meetings?: any[];
  config: any;
  mode: 'morning' | 'evening';
  targetDate?: Date;
  customShift?: {
    shiftStartTime?: string | null;
    prepEndTime?: string | null;
    shiftEndTime?: string | null;
  };
}) {
  const { user, tasks, meetings = [], config, mode, targetDate = new Date(), customShift } = options;
  const isMorning = mode === 'morning';
  const planTitle = isMorning ? 'Day Plan' : 'Task Log';

  const { formattedLong: dateHeader, dayOfWeek } = getLocalDateParts(targetDate);
  const isSaturday = dayOfWeek === 6;
  const defaultShiftEnd = isSaturday ? '13.30' : config?.shiftEndTime ? formatTo24HrDot(config.shiftEndTime) : '17.30';

  const shiftStart = formatTo24HrDot(customShift?.shiftStartTime || config?.shiftStartTime || '08.30');
  const prepEnd = formatTo24HrDot(customShift?.prepEndTime || config?.prepEndTime || '08.45');
  const shiftEnd = formatTo24HrDot(customShift?.shiftEndTime || defaultShiftEnd);

  // Calculate Overall Productivity Ratio (tasks + meetings)
  const totalItems = tasks.length + meetings.length;
  const totalProgressSum =
    tasks.reduce((sum, t) => sum + (t.progress || 0), 0) + meetings.length * 100;
  const overallProductivity =
    totalItems > 0 ? (totalProgressSum / totalItems).toFixed(2) : '0.00';

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
    if (status === 'DONE' || progress >= 100) return 'Completed';
    if (status === 'IN_PROGRESS' || progress > 0) return 'In Progress';
    return 'Pending';
  };

  const getStatusStyle = (status: string, progress: number) => {
    if (status === 'DONE' || progress >= 100) return 'color: #047857; font-weight: 500;';
    if (status === 'IN_PROGRESS' || progress > 0) return 'color: #d97706; font-weight: 500;';
    return 'color: #64748b; font-weight: 500;';
  };

  const cellBorder = 'border: 1px solid #000000; padding: 6px 8px; font-size: 13px;';

  const renderTaskRows = () => {
    let rowsHtml = '';

    if (tasks.length === 0 && meetings.length === 0) {
      return `
        <tr>
          <td style="${cellBorder} text-align: center;" colspan="7">No tasks or meetings recorded for this plan.</td>
        </tr>
      `;
    }

    // Render Tasks
    rowsHtml += tasks
      .map((t) => {
        const startVal = isMorning ? '' : formatTo24HrDot(t.startTime);
        const endVal = isMorning ? '' : formatTo24HrDot(t.endTime);
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

    // Render Logged Meetings (with exact start/end times and 100% completion)
    if (meetings && meetings.length > 0) {
      rowsHtml += meetings
        .map((m) => {
          const startVal = isMorning ? '' : formatTo24HrDot(m.startTime);
          const endVal = isMorning ? '' : formatTo24HrDot(m.endTime);
          return `
            <tr style="background-color: #fafafa;">
              <td style="${cellBorder} text-align: right; width: 68px;">${startVal}</td>
              <td style="${cellBorder} text-align: right; width: 68px;">${endVal}</td>
              <td style="${cellBorder} text-align: left;">
                <strong>[Meeting]</strong> ${m.title}
                ${
                  m.description
                    ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${m.description}</div>`
                    : ''
                }
              </td>
              <td style="${cellBorder} text-align: center; color: #38bdf8; font-weight: 500; width: 95px;">Meeting</td>
              <td style="${cellBorder} text-align: center; color: #047857; font-weight: bold; width: 95px;">Team</td>
              <td style="${cellBorder} text-align: center; color: #047857; font-weight: 500; width: 95px;">Completed</td>
              <td style="${cellBorder} text-align: right; width: 100px;">100.00%</td>
            </tr>
          `;
        })
        .join('');
    }

    return rowsHtml;
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
            <td colspan="3" style="${cellBorder} text-align: center;">Tasks & Meetings to be complete</td>
            <td style="${cellBorder} text-align: center; width: 95px;">Priority Level</td>
            <td style="${cellBorder} text-align: center; width: 95px;">Assigned by</td>
            <td style="${cellBorder} text-align: center; width: 95px;">Task Status</td>
            <td style="${cellBorder} text-align: center; width: 100px;">Productivity (%)</td>
          </tr>

          ${renderTaskRows()}

          <tr>
            <td style="${cellBorder}"></td>
            <td style="${cellBorder} text-align: right;">${isMorning ? '' : shiftEnd}</td>
            <td colspan="5" style="${cellBorder} background-color: #999999; color: #000000; text-align: center; font-weight: 500;">
              Shift End & Sign Out
            </td>
          </tr>

          <tr>
            <td style="${cellBorder}"></td>
            <td style="${cellBorder}"></td>
            <td colspan="4" style="${cellBorder} font-weight: bold; text-align: right;">
              Overall Productivity Ratio
            </td>
            <td style="${cellBorder} font-weight: bold; text-align: right;">
              ${overallProductivity}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Tests SMTP connection
 */
export async function testSmtpConnection(customConfig?: any) {
  try {
    let transporter: nodemailer.Transporter;

    if (customConfig && customConfig.smtpHost) {
      let pass = customConfig.smtpPassword;
      if (!pass || !pass.trim()) {
        const saved = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
        pass = saved?.smtpPassword || '';
      }

      const port = Number(customConfig.smtpPort) || 465;
      const isSecure = customConfig.smtpSecure ?? (port === 465);
      transporter = nodemailer.createTransport({
        host: customConfig.smtpHost.trim(),
        port: port,
        secure: isSecure,
        auth: {
          user: customConfig.smtpUser?.trim(),
          pass: pass.replace(/\s+/g, ''),
        },
        connectionTimeout: 8000,
      });
    } else {
      transporter = await getTransporter();
    }

    await transporter.verify();
    return { success: true, message: 'SMTP server connection verified successfully.' };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to authenticate with SMTP server.',
    };
  }
}

/**
 * Sends a test email
 */
export async function sendTestEmail(targetEmail: string) {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    if (!config) throw new Error('Settings not configured.');

    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: `"${config.senderName || 'Daily Focus'}" <${config.smtpUser}>`,
      to: targetEmail,
      subject: `Test Email Connection - ${new Date().toLocaleTimeString()}`,
      text: 'SMTP credentials verified successfully.',
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">Email Connection Verified</h2>
        <p>Your SMTP credentials and recipient configurations are functioning properly.</p>
        <p style="color: #64748b; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
      </div>`,
    });

    return { success: true, message: `Test email delivered to ${targetEmail} (ID: ${info.messageId})` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to send test email.' };
  }
}

/**
 * Sends Morning "Day Plan" Email
 */
export async function sendMorningReportEmail(userId?: string, customCheckInTime?: string) {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    if (!config) throw new Error('Settings not configured.');

    const { toList, ccList, bccList } = resolveRecipients(config);

    if (toList.length === 0) {
      throw new Error('No recipient email address found in settings.');
    }

    let targetUser = null;
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!targetUser) {
      targetUser = await prisma.user.findFirst({
        where: { isActive: true, role: { in: ['LEAD', 'ADMIN'] } },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (!targetUser) {
      targetUser = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      });
    }

    if (!targetUser) {
      throw new Error('No active user found to send report for.');
    }

    const { startOfDay: todayStart, endOfDay: todayEnd } = getDayBounds(new Date());

    if (customCheckInTime && customCheckInTime.trim()) {
      const existing = await prisma.dailyShift.findFirst({
        where: { userId: targetUser.id, date: { gte: todayStart, lte: todayEnd } },
      });
      if (existing) {
        await prisma.dailyShift.update({
          where: { id: existing.id },
          data: { shiftStartTime: customCheckInTime.trim() },
        });
      } else {
        await prisma.dailyShift.create({
          data: {
            userId: targetUser.id,
            date: todayStart,
            shiftStartTime: customCheckInTime.trim(),
          },
        });
      }
    }

    const shift = await prisma.dailyShift.findFirst({
      where: { userId: targetUser.id, date: { gte: todayStart, lte: todayEnd } },
    });

    const tasks = await prisma.task.findMany({
      where: {
        userId: targetUser.id,
        OR: [
          { status: { in: ['TODO', 'IN_PROGRESS'] } },
          { recurrence: { in: ['DAILY', 'WEEKLY'] } },
          { createdAt: { gte: todayStart } },
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

    const transporter = await getTransporter();

    const { monthKey, baseSubject, existingThread } = await getMonthlyThreadDetails(
      targetUser.id,
      todayStart,
      toList.join(', ')
    );

    // Check if a saved customized draft exists for today
    const savedDraft = await prisma.emailDraft.findFirst({
      where: {
        userId: targetUser.id,
        type: 'MORNING_PLAN',
        date: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { createdAt: 'desc' },
    });

    const emailHtml = savedDraft?.bodyHtml || buildReportTableHtml({
      user: targetUser,
      tasks,
      meetings,
      config,
      mode: 'morning',
      targetDate: todayStart,
      customShift: shift
        ? {
            shiftStartTime: shift.shiftStartTime,
            prepEndTime: shift.prepEndTime,
            shiftEndTime: shift.shiftEndTime,
          }
        : undefined,
    });

    const resolvedSubject = savedDraft?.subject || (existingThread ? `Re: ${existingThread.subject}` : baseSubject);
    const finalToList = savedDraft?.toRecipients ? savedDraft.toRecipients.split(',').map((r) => r.trim()).filter(Boolean) : toList;
    const finalCcList = savedDraft?.ccRecipients ? savedDraft.ccRecipients.split(',').map((r) => r.trim()).filter(Boolean) : ccList;
    const finalBccList = savedDraft?.bccRecipients ? savedDraft.bccRecipients.split(',').map((r) => r.trim()).filter(Boolean) : bccList;

    const mailOptions: any = {
      from: `"${config.senderName || 'To-Do MACM'}" <${config.smtpUser}>`,
      subject: resolvedSubject,
      html: emailHtml,
    };

    if (finalToList.length > 0) mailOptions.to = finalToList.join(', ');
    if (finalCcList.length > 0) mailOptions.cc = finalCcList.join(', ');
    if (finalBccList.length > 0) mailOptions.bcc = finalBccList.join(', ');

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

    if (savedDraft) {
      await prisma.emailDraft.update({
        where: { id: savedDraft.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: info.messageId,
          updatedAt: new Date(),
        },
      });
    }

    await saveMonthlyThreadMessage(
      targetUser.id,
      monthKey,
      baseSubject,
      info.messageId,
      finalToList.join(', ')
    );

    return {
      success: true,
      message: `Day Plan email sent to ${finalToList.join(', ')} (Message ID: ${info.messageId})`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to dispatch Day Plan email.' };
  }
}

/**
 * Sends Evening "Task Log" Email
 */
export async function sendEveningSummaryEmail(
  targetDate: Date = new Date(),
  targetUserId?: string,
  customCheckOutTime?: string
) {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });
    if (!config) throw new Error('Settings not configured.');

    const { toList, ccList, bccList } = resolveRecipients(config);

    if (toList.length === 0) {
      throw new Error('No recipient email address configured.');
    }

    const { startOfDay: todayStart, endOfDay: todayEnd } = getDayBounds(targetDate);

    // Resolve targetUser: explicitly passed userId, or primary Lead/Admin
    let targetUser = null;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    }
    if (!targetUser) {
      targetUser = await prisma.user.findFirst({
        where: { isActive: true, role: { in: ['LEAD', 'ADMIN'] } },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (!targetUser) {
      targetUser = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      });
    }

    if (!targetUser) {
      throw new Error('No active user found to send report for.');
    }

    const isSaturday = todayStart.getDay() === 6;
    const defaultEnd = isSaturday ? '13.30' : config?.shiftEndTime ? formatTo24HrDot(config.shiftEndTime) : '17.30';

    if (customCheckOutTime && customCheckOutTime.trim()) {
      const formattedCheckout = formatTo24HrDot(customCheckOutTime);
      const existing = await prisma.dailyShift.findFirst({
        where: { userId: targetUser.id, date: { gte: todayStart, lte: todayEnd } },
      });
      if (existing) {
        await prisma.dailyShift.update({
          where: { id: existing.id },
          data: { shiftEndTime: formattedCheckout },
        });
      } else {
        await prisma.dailyShift.create({
          data: {
            userId: targetUser.id,
            date: todayStart,
            shiftEndTime: formattedCheckout,
          },
        });
      }
    }

    // Retrieve targetUser's shift for today
    const userShift = await prisma.dailyShift.findFirst({
      where: {
        userId: targetUser.id,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    let finalShiftEnd =
      (customCheckOutTime?.trim() ? formatTo24HrDot(customCheckOutTime) : null) ||
      (userShift?.shiftEndTime ? formatTo24HrDot(userShift.shiftEndTime) : null) ||
      defaultEnd;

    if (isSaturday && (!finalShiftEnd || finalShiftEnd === '17.30' || finalShiftEnd === '5.30')) {
      finalShiftEnd = '13.30';
    }

    // Auto-complete daily tasks ONLY for targetUser by checkout time if not yet completed
    const allDailyTasks = await prisma.task.findMany({
      where: {
        userId: targetUser.id,
        recurrence: 'DAILY',
      },
      include: { subtasks: true },
    });

    const shiftStartVal = formatTo24HrDot(userShift?.shiftStartTime || config?.shiftStartTime || '08.30');

    for (const t of allDailyTasks) {
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

    // Query updated tasks strictly for targetUser ONLY
    const tasks = await prisma.task.findMany({
      where: {
        userId: targetUser.id,
        OR: [
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

    const transporter = await getTransporter();

    const { monthKey, baseSubject, existingThread } = await getMonthlyThreadDetails(
      targetUser.id,
      todayStart,
      toList.join(', ')
    );

    // Check if a saved customized draft exists for today for this user
    const savedDraft = await prisma.emailDraft.findFirst({
      where: {
        userId: targetUser.id,
        type: 'EVENING_TASKLOG',
        date: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { createdAt: 'desc' },
    });

    let combinedHtml = savedDraft?.bodyHtml || '';

    // If no customized draft was saved, generate HTML strictly for targetUser only (matching preview)
    if (!combinedHtml) {
      combinedHtml = buildReportTableHtml({
        user: targetUser,
        tasks: tasks,
        meetings: meetings || [],
        config,
        mode: 'evening',
        targetDate: todayStart,
        customShift: {
          shiftStartTime: userShift?.shiftStartTime || config?.shiftStartTime,
          prepEndTime: userShift?.prepEndTime || config?.prepEndTime,
          shiftEndTime: finalShiftEnd,
        },
      });
    }

    const resolvedSubject = savedDraft?.subject || (existingThread ? `Re: ${existingThread.subject}` : baseSubject);
    const finalToList = savedDraft?.toRecipients ? savedDraft.toRecipients.split(',').map((r) => r.trim()).filter(Boolean) : toList;
    const finalCcList = savedDraft?.ccRecipients ? savedDraft.ccRecipients.split(',').map((r) => r.trim()).filter(Boolean) : ccList;
    const finalBccList = savedDraft?.bccRecipients ? savedDraft.bccRecipients.split(',').map((r) => r.trim()).filter(Boolean) : bccList;

    const mailOptions: any = {
      from: `"${config.senderName || 'To-Do MACM'}" <${config.smtpUser}>`,
      subject: resolvedSubject,
      html: combinedHtml,
    };

    if (finalToList.length > 0) mailOptions.to = finalToList.join(', ');
    if (finalCcList.length > 0) mailOptions.cc = finalCcList.join(', ');
    if (finalBccList.length > 0) mailOptions.bcc = finalBccList.join(', ');

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

    if (savedDraft) {
      await prisma.emailDraft.update({
        where: { id: savedDraft.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: info.messageId,
          updatedAt: new Date(),
        },
      });
    }

    await saveMonthlyThreadMessage(
      targetUser.id,
      monthKey,
      baseSubject,
      info.messageId,
      finalToList.join(', ')
    );

    return {
      success: true,
      message: `Task Log summary email sent to ${finalToList.join(', ')} (Message ID: ${info.messageId})`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to dispatch Task Log email.' };
  }
}

// Backward compatibility export aliases
export const verifySmtpConnection = testSmtpConnection;
export const sendMorningTodoList = sendMorningReportEmail;
export const sendDailySummaryReport = sendEveningSummaryEmail;

