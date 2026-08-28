import { redirect } from 'next/navigation';
import { getCurrentUserSession } from '@/lib/actions/auth-actions';
import { getUsers } from '@/lib/actions/user-actions';
import { getTasks } from '@/lib/actions/task-actions';
import { getDailyLogs } from '@/lib/actions/log-actions';
import { getConfig } from '@/lib/actions/config-actions';
import { getTodayMeetings } from '@/lib/actions/meeting-actions';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const sessionUser = await getCurrentUserSession();

  if (!sessionUser) {
    redirect('/login');
  }

  const [users, tasks, logs, config, meetings] = await Promise.all([
    getUsers(),
    getTasks(),
    getDailyLogs(),
    getConfig(),
    getTodayMeetings(sessionUser.id),
  ]);

  return (
    <AppShell
      sessionUser={sessionUser}
      initialUsers={users}
      initialTasks={tasks}
      initialLogs={logs}
      initialConfig={config}
      initialMeetings={meetings}
    />
  );
}
