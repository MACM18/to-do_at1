import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMorningTodoList, sendDailySummaryReport } from '@/lib/mailer';
import { processRecurringTasks } from '@/lib/recurrence';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'morning' | 'evening' | 'recurrence' | 'all'

  try {
    const results: Record<string, any> = {};

    if (!type || type === 'recurrence' || type === 'all') {
      const recResult = await processRecurringTasks();
      results.recurrence = recResult;
    }

    if (type === 'morning' || type === 'all') {
      const morningRes = await sendMorningTodoList();
      results.morning = morningRes;
    }

    if (type === 'evening' || type === 'all') {
      const eveningRes = await sendDailySummaryReport();
      results.evening = eveningRes;
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
