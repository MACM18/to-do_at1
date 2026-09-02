import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMorningTodoList, sendDailySummaryReport } from '@/lib/mailer';
import { processRecurringTasks } from '@/lib/recurrence';
import { pruneOldEmailDrafts } from '@/lib/actions/email-draft-actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'morning' | 'evening' | 'recurrence' | 'all'

  try {
    const results: Record<string, any> = {};

    // Auto-prune email drafts older than 30 days
    await pruneOldEmailDrafts();

    if (!type || type === 'recurrence' || type === 'all') {
      const recResult = await processRecurringTasks();
      results.recurrence = recResult;
    }

    const config = await prisma.appConfig.findUnique({ where: { id: 'global_config' } });

    if (type === 'morning') {
      if (config?.autoSendMorningReport) {
        const morningRes = await sendMorningTodoList();
        results.morning = morningRes;
      } else {
        results.morning = { skipped: 'Morning plan auto-dispatch is disabled (manual review only).' };
      }
    }

    if (type === 'evening' || type === 'all') {
      const today = new Date();
      const isSunday = today.getDay() === 0;

      if (config?.autoSendDailyLog && !isSunday) {
        const eveningRes = await sendDailySummaryReport();
        results.evening = eveningRes;
      } else {
        results.evening = {
          skipped: isSunday
            ? 'Sunday is an off day.'
            : 'Auto-send daily log is disabled in settings.',
        };
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal cron error',
      },
      { status: 500 }
    );
  }
}
