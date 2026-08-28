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
      message: error.message || 'Failed to authenticate with SMTP server. Please check your credentials.',
    };
  }
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

    const info = await transporter.sendMail({
      from: `"${config.senderName || 'Daily Focus & Team Tracker'}" <${config.smtpUser}>`,
      to: recipient,
      subject: `🧪 Test Email from Daily Task Tracker - ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding: 24px; color: #ffffff; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Connection Successful! 🎉</h1>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Your Gmail SMTP setup is working perfectly.</p>
          </div>
          <div style="padding: 24px; color: #334155; line-height: 1.6;">
            <p style="margin-top: 0;">Hi,</p>
            <p>This is a verification test from your <strong>Daily Task & Team Monitoring PWA</strong>.</p>
            <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px; border-radius: 4px; margin: 18px 0; font-size: 14px;">
              <strong>Configured Sender:</strong> ${config.smtpUser}<br/>
              <strong>Configured Recipients:</strong> ${config.emailRecipients || '(Not set yet)'}<br/>
              <strong>Server Time:</strong> ${new Date().toLocaleString()}
            </div>
            <p style="margin-bottom: 0; color: #64748b; font-size: 13px;">You are all set to receive automated morning to-do lists and evening team summary reports!</p>
          </div>
        </div>
      `,
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
 * 1. Morning To-Do List Trigger
 * Filters:
 * - Specific user's tasks
 * - Scheduled/created for today OR pending backlogs from previous dates
 * - Subtask breakdown and progress calculation
 */
export async function sendMorningTodoList(
  userId?: string,
  recipientOverride?: string
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

    // Process recurring tasks first (reset completed daily/weekly tasks for the new day)
    await processRecurringTasks(userId);

    // Identify target user
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

    // Fetch pending tasks from past dates + all tasks scheduled for today
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
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    const transporter = await getTransporter();

    // Separate today's vs carry-over backlogs
    const carryOverTasks = tasks.filter(
      (t) => t.createdAt < todayStart && t.status !== 'DONE'
    );
    const todayTasks = tasks.filter((t) => t.createdAt >= todayStart || t.status === 'DONE');

    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const renderTaskCard = (t: typeof tasks[0]) => {
      const isDone = t.status === 'DONE';
      const progressBg =
        t.progress === 100 ? '#10b981' : t.progress > 0 ? '#3b82f6' : '#94a3b8';

      const recurrenceBadge =
        t.recurrence !== 'NONE'
          ? `<span style="display:inline-block; font-size:11px; background:#e0e7ff; color:#4338ca; padding:2px 8px; border-radius:12px; margin-left:6px; font-weight:600;">🔁 ${t.recurrence}</span>`
          : '';

      const subtaskList =
        t.subtasks && t.subtasks.length > 0
          ? `
            <div style="margin-top: 10px; padding-left: 8px; border-left: 2px solid #e2e8f0;">
              ${t.subtasks
                .map(
                  (s) => `
                <div style="display:flex; align-items:center; font-size:13px; margin-bottom:4px; color:${
                  s.isDone ? '#64748b' : '#334155'
                }; text-decoration:${s.isDone ? 'line-through' : 'none'};">
                  <span style="margin-right:6px;">${s.isDone ? '✅' : '⬜'}</span>
                  <span>${s.title}</span>
                </div>
              `
                )
                .join('')}
            </div>
          `
          : '';

      return `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:14px 16px; margin-bottom:12px; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <div style="font-size:15px; font-weight:600; color:#1e293b;">
              <span style="color:${isDone ? '#10b981' : '#3b82f6'}; margin-right:4px;">${
                isDone ? '✅' : '📌'
              }</span>
              ${t.title}
              ${recurrenceBadge}
            </div>
            <span style="font-size:12px; font-weight:700; color:#475569; background:#f1f5f9; padding:2px 8px; border-radius:6px; white-space:nowrap; margin-left:8px;">
              ${t.progress}%
            </span>
          </div>
          ${
            t.description
              ? `<div style="font-size:13px; color:#64748b; margin-bottom:8px;">${t.description}</div>`
              : ''
          }
          
          <!-- Progress bar -->
          <div style="background:#f1f5f9; height:6px; border-radius:999px; overflow:hidden; margin:8px 0;">
            <div style="background:${progressBg}; width:${t.progress}%; height:100%; border-radius:999px;"></div>
          </div>

          ${subtaskList}
        </div>
      `;
    };

    const completedCount = tasks.filter((t) => t.status === 'DONE').length;
    const totalCount = tasks.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; margin:0; padding:24px; color:#1e293b;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <div style="background:linear-gradient(135deg, #1e3a8a, #2563eb); padding:28px 24px; color:#ffffff;">
            <div style="font-size:13px; text-transform:uppercase; letter-spacing:1px; font-weight:700; opacity:0.85;">☀️ Morning Focus & Backlog</div>
            <h1 style="margin:6px 0 0 0; font-size:24px; font-weight:800; color:#ffffff;">${targetUser.name}'s Daily Plan</h1>
            <div style="margin-top:6px; font-size:14px; opacity:0.9;">${formattedDate}</div>
          </div>

          <!-- Quick Stats Bar -->
          <div style="background:#eff6ff; border-bottom:1px solid #dbeafe; padding:14px 24px; display:flex; justify-content:space-around; text-align:center;">
            <div>
              <div style="font-size:18px; font-weight:700; color:#1e40af;">${totalCount}</div>
              <div style="font-size:12px; color:#6b7280; text-transform:uppercase;">Active Tasks</div>
            </div>
            <div>
              <div style="font-size:18px; font-weight:700; color:#d97706;">${carryOverTasks.length}</div>
              <div style="font-size:12px; color:#6b7280; text-transform:uppercase;">Carry-over Backlog</div>
            </div>
            <div>
              <div style="font-size:18px; font-weight:700; color:#059669;">${completedCount}</div>
              <div style="font-size:12px; color:#6b7280; text-transform:uppercase;">Completed</div>
            </div>
          </div>

          <div style="padding:24px;">
            ${
              carryOverTasks.length > 0
                ? `
                <div style="margin-bottom:24px;">
                  <h3 style="margin:0 0 12px 0; font-size:15px; font-weight:700; color:#b45309; display:flex; align-items:center;">
                    ⏳ Pending Backlog From Previous Days (${carryOverTasks.length})
                  </h3>
                  ${carryOverTasks.map(renderTaskCard).join('')}
                </div>
              `
                : ''
            }

            <div>
              <h3 style="margin:0 0 12px 0; font-size:15px; font-weight:700; color:#1e293b;">
                🎯 Today's Focus & Scheduled Items (${todayTasks.length})
              </h3>
              ${
                todayTasks.length > 0
                  ? todayTasks.map(renderTaskCard).join('')
                  : '<p style="color:#64748b; font-size:14px; font-style:italic;">No additional items for today yet. Add tasks from the app to sync.</p>'
              }
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 24px; text-align:center; font-size:12px; color:#94a3b8;">
            Sent automatically by <strong>${config.senderName || 'Daily Focus & Team Tracker'}</strong><br/>
            Open your Mobile PWA to update tasks, check off subtasks, or record evening logs.
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"${config.senderName || 'Daily Focus'}" <${config.smtpUser}>`,
      to: recipients.join(', '),
      subject: `📋 Daily Plan & Backlog - ${targetUser.name} (${formattedDate})`,
      html: emailHtml,
    });

    return {
      success: true,
      message: `Morning plan successfully sent to ${recipients.join(', ')}!`,
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
 * 2. Evening / Forced Daily Team Log Summary Trigger
 * Filters:
 * - All active team members
 * - Today's updated tasks + unresolved carry-over backlogs
 * - Today's work logs and blockers
 */
export async function sendDailySummaryReport(recipientOverride?: string): Promise<EmailSendResult> {
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

    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        tasks: {
          where: {
            OR: [
              { updatedAt: { gte: todayStart } },
              { createdAt: { gte: todayStart } },
              { status: { in: ['TODO', 'IN_PROGRESS'] } }, // Carry-over backlogs
            ],
          },
          include: {
            subtasks: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        },
        logs: {
          where: {
            date: { gte: todayStart },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    const transporter = await getTransporter();

    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    let totalTasksCount = 0;
    let completedTasksCount = 0;

    users.forEach((u) => {
      totalTasksCount += u.tasks.length;
      completedTasksCount += u.tasks.filter((t) => t.status === 'DONE').length;
    });

    const teamCompletionRate =
      totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const renderMemberSection = (user: typeof users[0]) => {
      const userCompleted = user.tasks.filter((t) => t.status === 'DONE').length;
      const userTotal = user.tasks.length;

      return `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:20px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.03);">
          
          <!-- Member Header -->
          <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:12px 18px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:16px; font-weight:700; color:#0f172a;">${user.name}</span>
              <span style="font-size:11px; font-weight:600; text-transform:uppercase; padding:2px 8px; border-radius:12px; margin-left:8px; background:${
                user.role === 'LEAD' ? '#fef3c7' : '#e0e7ff'
              }; color:${user.role === 'LEAD' ? '#92400e' : '#3730a3'};">
                ${user.role}
              </span>
            </div>
            <div style="font-size:12px; color:#64748b; font-weight:600;">
              ${userCompleted}/${userTotal} Completed
            </div>
          </div>

          <div style="padding:16px 18px;">
            <!-- Daily Notes / Blockers -->
            ${
              user.logs.length > 0
                ? user.logs
                    .map(
                      (l) => `
                  <div style="background:#f1f5f9; border-left:3px solid #3b82f6; padding:10px 14px; border-radius:4px; margin-bottom:12px; font-size:13px;">
                    <div style="font-weight:600; color:#1e293b; margin-bottom:2px;">📝 Daily Log Summary:</div>
                    <div style="color:#334155;">${l.summary}</div>
                    ${
                      l.blockers
                        ? `<div style="margin-top:6px; color:#b91c1c; font-weight:500;"><strong>🚨 Blocker:</strong> ${l.blockers}</div>`
                        : ''
                    }
                  </div>
                `
                    )
                    .join('')
                : ''
            }

            <!-- Task List -->
            ${
              user.tasks.length > 0
                ? `
                <div style="margin-top:8px;">
                  ${user.tasks
                    .map((t) => {
                      const isDone = t.status === 'DONE';
                      return `
                      <div style="padding:8px 0; border-bottom:1px solid #f1f5f9;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:14px;">
                          <div>
                            <span style="margin-right:6px;">${isDone ? '✅' : '⏳'}</span>
                            <strong style="color:${isDone ? '#64748b' : '#1e293b'}; text-decoration:${
                        isDone ? 'line-through' : 'none'
                      };">${t.title}</strong>
                            ${
                              t.recurrence !== 'NONE'
                                ? `<span style="font-size:11px; background:#e0e7ff; color:#4338ca; padding:1px 6px; border-radius:10px; margin-left:4px;">🔁 ${t.recurrence}</span>`
                                : ''
                            }
                          </div>
                          <span style="font-size:12px; font-weight:600; color:${
                            isDone ? '#10b981' : '#3b82f6'
                          };">${t.progress}%</span>
                        </div>
                        ${
                          t.subtasks.length > 0
                            ? `
                            <div style="padding-left:24px; margin-top:4px; font-size:12px; color:#64748b;">
                              ${t.subtasks
                                .map(
                                  (s) => `
                                <div style="margin:2px 0;">
                                  ${s.isDone ? '✓' : '○'} ${s.title}
                                </div>
                              `
                                )
                                .join('')}
                            </div>
                          `
                            : ''
                        }
                      </div>
                    `;
                    })
                    .join('')}
                </div>
              `
                : '<div style="color:#94a3b8; font-size:13px; font-style:italic;">No tasks recorded for this period.</div>'
            }
          </div>
        </div>
      `;
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; margin:0; padding:24px; color:#1e293b;">
        <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <div style="background:linear-gradient(135deg, #0f172a, #334155); padding:28px 24px; color:#ffffff;">
            <div style="font-size:13px; text-transform:uppercase; letter-spacing:1px; font-weight:700; color:#93c5fd;">🚀 Daily Team Progress Report</div>
            <h1 style="margin:6px 0 0 0; font-size:24px; font-weight:800; color:#ffffff;">Team Summary & Daily Logs</h1>
            <div style="margin-top:6px; font-size:14px; opacity:0.9;">${formattedDate}</div>
          </div>

          <!-- Overall Stats -->
          <div style="background:#f1f5f9; border-bottom:1px solid #e2e8f0; padding:16px 24px; display:flex; justify-content:space-around; text-align:center;">
            <div>
              <div style="font-size:20px; font-weight:700; color:#0f172a;">${users.length}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Active Members</div>
            </div>
            <div>
              <div style="font-size:20px; font-weight:700; color:#2563eb;">${totalTasksCount}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Total Tasks</div>
            </div>
            <div>
              <div style="font-size:20px; font-weight:700; color:#10b981;">${completedTasksCount}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Completed</div>
            </div>
            <div>
              <div style="font-size:20px; font-weight:700; color:#8b5cf6;">${teamCompletionRate}%</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Completion Rate</div>
            </div>
          </div>

          <!-- Team Breakdown -->
          <div style="padding:24px;">
            <h2 style="margin:0 0 16px 0; font-size:16px; font-weight:700; color:#1e293b;">👥 Team Progress by Member</h2>
            ${users.map(renderMemberSection).join('')}
          </div>

          <!-- Footer -->
          <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 24px; text-align:center; font-size:12px; color:#94a3b8;">
            Sent automatically by <strong>${config.senderName || 'Daily Focus & Team Tracker'}</strong><br/>
            Manage all configs, schedule triggers, and team members directly in your PWA.
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"${config.senderName || 'Daily Team Tracker'}" <${config.smtpUser}>`,
      to: recipients.join(', '),
      subject: `🚀 Daily Team Progress Report - ${formattedDate}`,
      html: emailHtml,
    });

    return {
      success: true,
      message: `Daily summary report successfully sent to ${recipients.join(', ')}!`,
      messageId: info.messageId,
      taskCount: totalTasksCount,
      recipientCount: recipients.length,
    };
  } catch (error: any) {
    console.error('Send Daily Summary Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to send daily summary report.',
    };
  }
}
