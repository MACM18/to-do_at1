import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with updated sample tasks and shift timings...');

  // 1. Create or update Default AppConfig
  const config = await prisma.appConfig.upsert({
    where: { id: 'global_config' },
    update: {
      shiftStartTime: '8.30',
      prepEndTime: '8.45',
      shiftEndTime: '5.30',
    },
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
      shiftStartTime: '8.30',
      prepEndTime: '8.45',
      shiftEndTime: '5.30',
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

  await prisma.appConfig.update({
    where: { id: 'global_config' },
    data: { defaultUserId: leadUser.id },
  });

  // 3. Create Team Members
  const member1 = await prisma.user.upsert({
    where: { email: 'nimesh@example.com' },
    update: {},
    create: {
      name: 'Nimesh',
      email: 'nimesh@example.com',
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

  // Clear existing tasks to avoid duplicates on re-seed
  await prisma.subtask.deleteMany({});
  await prisma.task.deleteMany({});

  // 4. Sample Tasks for Lead (Matching User's Sample Report)
  await prisma.task.create({
    data: {
      title: 'Check the sales details and give an update and prepared a sheet to record',
      startTime: '8.45',
      endTime: '9.00',
      priority: 'High',
      assignedBy: 'Altitude1',
      status: 'DONE',
      progress: 100,
      recurrence: 'NONE',
      userId: leadUser.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Webmail creation as per team request',
      startTime: '9.00',
      endTime: '5.30',
      priority: 'Medium',
      assignedBy: 'Altitude1',
      status: 'DONE',
      progress: 100,
      recurrence: 'NONE',
      userId: leadUser.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'KPI system update',
      startTime: '',
      endTime: '',
      priority: 'High',
      assignedBy: 'Nimesh',
      status: 'IN_PROGRESS',
      progress: 95,
      recurrence: 'NONE',
      userId: leadUser.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Project backend development',
      startTime: '3.40',
      endTime: '5.30',
      priority: 'High',
      assignedBy: 'Altitude1',
      status: 'DONE',
      progress: 100,
      recurrence: 'NONE',
      userId: leadUser.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Tech solution documentation',
      startTime: '',
      endTime: '',
      priority: 'High',
      assignedBy: 'Altitude1',
      status: 'IN_PROGRESS',
      progress: 60,
      recurrence: 'NONE',
      userId: leadUser.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'New domain batch CF setup',
      startTime: '9.00',
      endTime: '5.30',
      priority: 'High',
      assignedBy: 'Altitude1',
      status: 'DONE',
      progress: 100,
      recurrence: 'NONE',
      userId: leadUser.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Domain account creation and sharing with the team',
      startTime: '9.00',
      endTime: '4.30',
      priority: 'High',
      assignedBy: 'Myself',
      status: 'DONE',
      progress: 100,
      recurrence: 'NONE',
      userId: leadUser.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Slab changes implementation',
      startTime: '',
      endTime: '',
      priority: 'High',
      assignedBy: 'Myself',
      status: 'DONE',
      progress: 96,
      recurrence: 'NONE',
      userId: leadUser.id,
    },
  });

  console.log('Seeding completed with updated report tasks!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
