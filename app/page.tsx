import { getUsers } from '@/lib/actions/user-actions';
import { getTasks } from '@/lib/actions/task-actions';
import { getDailyLogs } from '@/lib/actions/log-actions';
import { getConfig } from '@/lib/actions/config-actions';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [users, tasks, logs, config] = await Promise.all([
    getUsers(),
    getTasks(),
    getDailyLogs(),
    getConfig(),
  ]);

  return (
    <AppShell
      initialUsers={users}
      initialTasks={tasks}
      initialLogs={logs}
      initialConfig={config}
    />
  );
}
