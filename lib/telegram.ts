import { prisma } from './prisma';

/**
 * Global alert deduplication cache across Next.js re-evaluations
 */
const globalTelegramLocks = (globalThis as any).__telegram_sent_locks__ || new Map<string, number>();
(globalThis as any).__telegram_sent_locks__ = globalTelegramLocks;

/**
 * Checks and acquires a lock for an alert to prevent duplicate messages sent at the same time
 */
function acquireAlertLock(lockKey: string, ttlMs = 25000): boolean {
  const now = Date.now();
  const lastSent = globalTelegramLocks.get(lockKey);
  if (lastSent && now - lastSent < ttlMs) {
    console.log(`[Telegram] Skipping duplicate alert for lockKey: ${lockKey} (${now - lastSent}ms ago)`);
    return false;
  }
  globalTelegramLocks.set(lockKey, now);

  // Clean old keys if map gets large
  if (globalTelegramLocks.size > 50) {
    for (const [k, v] of globalTelegramLocks.entries()) {
      if (now - v > ttlMs * 2) {
        globalTelegramLocks.delete(k);
      }
    }
  }

  return true;
}

/**
 * Escapes HTML characters for Telegram HTML parse mode
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sends a raw message to a Telegram Chat via Bot API
 */
export async function sendTelegramMessage(
  chatId: string,
  htmlText: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!botToken) {
    return {
      success: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured in .env',
    };
  }

  if (!chatId?.trim()) {
    return {
      success: false,
      error: 'Telegram Chat ID is required.',
    };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const errMsg = data?.description || `Telegram API Error (${response.status})`;
      console.error('[Telegram] Failed to send message:', errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, message: 'Telegram message sent successfully.' };
  } catch (err: any) {
    console.error('[Telegram] Exception sending message:', err);
    return {
      success: false,
      error: err.message || 'Network exception while contacting Telegram API.',
    };
  }
}

/**
 * Sends a Day Plan (morning) delivery success status notification
 */
export async function notifyDayPlanSuccess(details: {
  userName: string;
  dateStr: string;
  checkInTime?: string;
  plannedTasksCount: number;
  meetingsCount?: number;
  toRecipients: string;
  messageId?: string;
}) {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: 'global_config' },
    });

    if (!config?.telegramNotificationsEnabled || !config?.telegramChatId?.trim()) {
      return;
    }

    const lockKey = `DAY_PLAN_${details.userName}_${details.dateStr}_${details.messageId || 'default'}`;
    if (!acquireAlertLock(lockKey)) return;

    const safeUser = escapeHtml(details.userName || 'Lead');
    const safeDate = escapeHtml(details.dateStr || 'Today');
    const safeCheckIn = escapeHtml(details.checkInTime || '08.30');
    const safeTo = escapeHtml(details.toRecipients || 'Configured Recipients');
    const safeMsgId = details.messageId ? escapeHtml(details.messageId) : null;
    const meetingsText =
      typeof details.meetingsCount === 'number' && details.meetingsCount > 0
        ? `🤝 <b>Meetings:</b> ${details.meetingsCount} Scheduled`
        : null;

    const text = [
      '🌅 <b>Day Plan Delivered Successfully</b>',
      '━━━━━━━━━━━━━━━━━━━━',
      `👤 <b>User:</b> ${safeUser}`,
      `📅 <b>Date:</b> ${safeDate}`,
      `🕒 <b>Check-in:</b> ${safeCheckIn}`,
      `📋 <b>Planned Tasks:</b> ${details.plannedTasksCount} Planned`,
      meetingsText,
      `📬 <b>To:</b> ${safeTo}`,
      safeMsgId ? `🆔 <b>Message ID:</b> <code>${safeMsgId}</code>` : '',
      '━━━━━━━━━━━━━━━━━━━━',
      '🚀 <i>System Status: Operational</i>',
    ]
      .filter(Boolean)
      .join('\n');

    await sendTelegramMessage(config.telegramChatId, text);
  } catch (err) {
    console.error('[Telegram] Error triggering day plan success notification:', err);
  }
}

/**
 * Sends a Task Log (evening) delivery success status notification
 */
export async function notifyTaskLogSuccess(details: {
  userName: string;
  dateStr: string;
  checkOutTime?: string;
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  toRecipients: string;
  messageId?: string;
}) {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: 'global_config' },
    });

    if (!config?.telegramNotificationsEnabled || !config?.telegramChatId?.trim()) {
      return;
    }

    const lockKey = `TASK_LOG_${details.userName}_${details.dateStr}_${details.messageId || 'default'}`;
    if (!acquireAlertLock(lockKey)) return;

    const rate =
      details.totalCount > 0
        ? Math.round((details.completedCount / details.totalCount) * 100)
        : details.completedCount > 0
          ? 100
          : 0;

    const safeUser = escapeHtml(details.userName || 'Lead');
    const safeDate = escapeHtml(details.dateStr || 'Today');
    const safeCheckOut = escapeHtml(details.checkOutTime || 'Standard Shift End');
    const safeTo = escapeHtml(details.toRecipients || 'Configured Recipients');
    const safeMsgId = details.messageId ? escapeHtml(details.messageId) : null;

    const text = [
      '🌙 <b>Task Log Delivered Successfully</b>',
      '━━━━━━━━━━━━━━━━━━━━',
      `👤 <b>User:</b> ${safeUser}`,
      `📅 <b>Date:</b> ${safeDate}`,
      `🕒 <b>Check-out:</b> ${safeCheckOut}`,
      `📊 <b>Tasks:</b> ${details.completedCount}/${details.totalCount} Completed (${rate}%)`,
      details.pendingCount > 0 ? `⏳ <b>Pending:</b> ${details.pendingCount}` : '',
      `📬 <b>To:</b> ${safeTo}`,
      safeMsgId ? `🆔 <b>Message ID:</b> <code>${safeMsgId}</code>` : '',
      '━━━━━━━━━━━━━━━━━━━━',
      '🚀 <i>System Status: Operational</i>',
    ]
      .filter(Boolean)
      .join('\n');

    await sendTelegramMessage(config.telegramChatId, text);
  } catch (err) {
    console.error('[Telegram] Error triggering task log success notification:', err);
  }
}

/**
 * Sends an urgent email delivery failure / error notification (System Status Checker alert)
 */
export async function notifyEmailDeliveryError(details: {
  type: 'MORNING_PLAN' | 'EVENING_TASKLOG' | string;
  userName?: string;
  dateStr?: string;
  errorMessage: string;
  toRecipients?: string;
}) {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: 'global_config' },
    });

    if (!config?.telegramNotificationsEnabled || !config?.telegramChatId?.trim()) {
      return;
    }

    const lockKey = `ERR_${details.type}_${details.userName}_${details.dateStr}_${details.errorMessage}`;
    if (!acquireAlertLock(lockKey)) return;

    const typeTitle = details.type === 'MORNING_PLAN' ? 'Day Plan' : 'Task Log';
    const safeUser = escapeHtml(details.userName || 'Lead');
    const safeDate = escapeHtml(details.dateStr || 'Today');
    const safeError = escapeHtml(details.errorMessage || 'Unknown dispatch error.');
    const safeTo = details.toRecipients ? escapeHtml(details.toRecipients) : null;

    const text = [
      `🚨 <b>${typeTitle} Delivery Failed!</b>`,
      '━━━━━━━━━━━━━━━━━━━━',
      `👤 <b>User:</b> ${safeUser}`,
      `📅 <b>Date:</b> ${safeDate}`,
      `⚠️ <b>Error:</b> <code>${safeError}</code>`,
      safeTo ? `📬 <b>Target To:</b> ${safeTo}` : '',
      '━━━━━━━━━━━━━━━━━━━━',
      '⚠️ <i>System Status: Attention Required</i>',
    ]
      .filter(Boolean)
      .join('\n');

    await sendTelegramMessage(config.telegramChatId, text);
  } catch (err) {
    console.error('[Telegram] Error triggering error alert:', err);
  }
}

// Backward compatibility alias
export const notifyTaskLogError = (details: {
  userName?: string;
  dateStr?: string;
  errorMessage: string;
  toRecipients?: string;
}) => notifyEmailDeliveryError({ ...details, type: 'EVENING_TASKLOG' });

/**
 * Sends a test notification to verify Telegram Bot connectivity
 */
export async function testTelegramConnection(chatId: string) {
  const text = [
    '🤖 <b>Telegram Notification Test</b>',
    '━━━━━━━━━━━━━━━━━━━━',
    '✅ <b>Connection Status:</b> Operational',
    'Your Telegram bot is successfully connected and will alert you upon Day Plan & Task Log deliveries and system errors.',
    '━━━━━━━━━━━━━━━━━━━━',
    `🕒 <i>Timestamp: ${new Date().toISOString()}</i>`,
  ].join('\n');

  return sendTelegramMessage(chatId, text);
}
