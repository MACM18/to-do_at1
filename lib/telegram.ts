import { prisma } from './prisma';

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
 * Sends a Task Log delivery success status notification
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
      '✅ <b>Task Log Delivered Successfully</b>',
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
    console.error('[Telegram] Error triggering success notification:', err);
  }
}

/**
 * Sends an urgent Task Log failure / error notification (System Status Checker alert)
 */
export async function notifyTaskLogError(details: {
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

    const safeUser = escapeHtml(details.userName || 'Lead');
    const safeDate = escapeHtml(details.dateStr || 'Today');
    const safeError = escapeHtml(details.errorMessage || 'Unknown dispatch error.');
    const safeTo = details.toRecipients ? escapeHtml(details.toRecipients) : null;

    const text = [
      '🚨 <b>Task Log Delivery Failed!</b>',
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

/**
 * Sends a test notification to verify Telegram Bot connectivity
 */
export async function testTelegramConnection(chatId: string) {
  const text = [
    '🤖 <b>Telegram Notification Test</b>',
    '━━━━━━━━━━━━━━━━━━━━',
    '✅ <b>Connection Status:</b> Operational',
    'Your Telegram bot is successfully connected and will alert you upon Task Log deliveries and system errors.',
    '━━━━━━━━━━━━━━━━━━━━',
    `🕒 <i>Timestamp: ${new Date().toISOString()}</i>`,
  ].join('\n');

  return sendTelegramMessage(chatId, text);
}
