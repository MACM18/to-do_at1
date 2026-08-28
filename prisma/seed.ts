import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database data...');

  // 1. Create or update Default AppConfig
  const config = await prisma.appConfig.upsert({
    where: { id: 'global_config' },
    update: {},
    create: {
      id: 'global_config',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: '',
      smtpPassword: '',
      senderName: 'Daily Focus & Team Tracker',
      emailRecipients: '',
      morningReportTime: '08:00',
      eveningReportTime: '18:00',
      autoSendMorningReport: false,
      autoSendDailyLog: false,
    },
  });

  // 2. Create Lead User
  const leadUser = await prisma.user.upsert({
    where: { email: 'chathura@example.com' },
    update: {},
    create: {
      name: 'Chathura (Lead)',
      email: 'chathura@example.com',
      role: 'LEAD',
      isActive: true,
    },
  });

  // Set defaultUserId in AppConfig
  await prisma.appConfig.update({
    where: { id: 'global_config' },
    data: { defaultUserId: leadUser.id },
  });

  // 3. Create Team Members
  const member1 = await prisma.user.upsert({
    where: { email: 'alex.rivera@example.com' },
    update: {},
    create: {
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      role: 'MEMBER',
      isActive: true,
    },
  });

  const member2 = await prisma.user.upsert({
    where: { email: 'sarah.chen@example.com' },
    update: {},
    create: {
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      role: 'MEMBER',
      isActive: true,
    },
  });

  // 4. Create sample tasks for Lead
  const task1 = await prisma.task.create({
    data: {
      title: 'Review Sprint Deliverables & Architecture Plan',
      description: 'Prepare notes for team sync and verify production migration checklist',
      status: 'IN_PROGRESS',
      progress: 67,
      recurrence: 'DAILY',
      userId: leadUser.id,
      subtasks: {
        create: [
          { title: 'Check VPS server load & memory headroom', isDone: true },
          { title: 'Verify database backup cron script', isDone: true },
          { title: 'Send weekly status report to stakeholders', isDone: false },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Deploy PWA to Production VPS',
      description: 'Run docker-compose and configure domain SSL certificate',
      status: 'TODO',
      progress: 0,
      recurrence: 'NONE',
      userId: leadUser.id,
      subtasks: {
        create: [
          { title: 'Build production Docker image', isDone: false },
          { title: 'Configure Nginx reverse proxy', isDone: false },
          { title: 'Test iPhone PWA Add-to-HomeScreen installation', isDone: false },
        ],
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Check Daily Team Logs & Review PRs',
      description: 'Daily morning routine check',
      status: 'DONE',
      progress: 100,
      recurrence: 'DAILY',
      userId: leadUser.id,
    },
  });

  // 5. Create sample tasks for Alex
  await prisma.task.create({
    data: {
      title: 'Optimize API response latency for dashboard endpoints',
      description: 'Add Redis caching layer or Prisma query indexing',
      status: 'IN_PROGRESS',
      progress: 50,
      recurrence: 'NONE',
      userId: member1.id,
      subtasks: {
        create: [
          { title: 'Profile slowest DB queries', isDone: true },
          { title: 'Add compound indexes on Task(userId, status)', isDone: false },
        ],
      },
    },
  });

  // 6. Create sample tasks for Sarah
  await prisma.task.create({
    data: {
      title: 'Design Mobile-first Bottom Navigation & Touch Interactions',
      description: 'Ensure smooth gestures and safe area insets on iOS Safari',
      status: 'DONE',
      progress: 100,
      recurrence: 'NONE',
      userId: member2.id,
      subtasks: {
        create: [
          { title: 'Implement safe-area-inset bottom padding', isDone: true },
          { title: 'Add haptic feedback & smooth transitions', isDone: true },
        ],
      },
    },
  });

  // 7. Create sample Daily Log
  await prisma.dailyLog.create({
    data: {
      summary: 'Completed architectural review for PWA offline sync and Dockerized VPS deployment.',
      blockers: 'None currently. Waiting for production SMTP credentials.',
      userId: leadUser.id,
      date: new Date(),
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
