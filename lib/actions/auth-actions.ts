'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';

const AUTH_COOKIE_NAME = 'todo_auth_session';

/**
 * Ensures the main user from .env exists in the database.
 * Automatically links and merges any tasks/logs created under previous versions or temporary IDs.
 */
export async function ensureMainUser() {
  const envName = (process.env.AUTH_USER || 'Chathura').trim();
  const envEmail = (process.env.AUTH_EMAIL || 'chathura@example.com').trim().toLowerCase();
  const envPassword = process.env.AUTH_PASSWORD || 'changeme123';

  if (!prisma || !prisma.user) {
    return null;
  }

  // 1. Look for matching user by email or exact name
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: envEmail },
        { name: envName },
      ],
    },
  });

  // 2. If not found, look for previous versions (e.g. "Chathura (Lead)", or any LEAD/ADMIN, or first user)
  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Chathura' } },
          { name: { contains: 'Lead' } },
          { role: { in: ['LEAD', 'ADMIN'] } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // 3. Fallback: if there are any users in DB, pick the oldest user
  if (!user) {
    user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!user) {
    // Brand new database
    user = await prisma.user.create({
      data: {
        name: envName,
        email: envEmail,
        password: envPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
  } else {
    // Update existing user with current credentials & ADMIN role
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: envName,
        email: envEmail,
        role: 'ADMIN',
        password: envPassword,
      },
    });
  }

  // 4. Auto-Heal & Migrate: Reassign any tasks or logs from older duplicate accounts to this main user
  const otherDuplicateUsers = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      OR: [
        { name: { contains: 'Chathura' } },
        { name: { contains: 'Lead' } },
        { email: 'chathura@example.com' },
      ],
    },
  });

  for (const dup of otherDuplicateUsers) {
    // Migrate tasks
    await prisma.task.updateMany({
      where: { userId: dup.id },
      data: { userId: user.id },
    });

    // Migrate daily logs
    await prisma.dailyLog.updateMany({
      where: { userId: dup.id },
      data: { userId: user.id },
    });

    // Migrate shifts
    await prisma.dailyShift.updateMany({
      where: { userId: dup.id },
      data: { userId: user.id },
    });

    // Delete empty duplicate user
    try {
      await prisma.user.delete({ where: { id: dup.id } });
    } catch {
      // Ignore if foreign key constraint
    }
  }

  return user;
}

/**
 * Authenticates user by username or email & password
 */
export async function loginAction(formData: {
  identifier: string;
  password?: string;
}) {
  const identifier = formData.identifier?.trim() || '';
  const password = formData.password?.trim() || '';

  if (!identifier) {
    return { success: false, error: 'Username or Email is required.' };
  }

  const envName = (process.env.AUTH_USER || 'Chathura').trim().toLowerCase();
  const envEmail = (process.env.AUTH_EMAIL || 'chathura@example.com').trim().toLowerCase();
  const envPassword = process.env.AUTH_PASSWORD || 'changeme123';

  // Ensure main user exists and all historical tasks are merged to main user
  const mainUser = await ensureMainUser();

  const isMainUserMatch =
    (identifier.toLowerCase() === envName ||
      identifier.toLowerCase() === envEmail ||
      identifier.toLowerCase() === 'chathura' ||
      identifier.toLowerCase().includes('chathura')) &&
    password === envPassword;

  let targetUser = null;

  if (isMainUserMatch) {
    targetUser = mainUser;
  } else {
    // Search general team members in database
    targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { name: identifier },
        ],
      },
    });

    if (!targetUser) {
      return { success: false, error: 'Invalid username/email or password.' };
    }

    if (targetUser.password && targetUser.password !== password) {
      return { success: false, error: 'Invalid username/email or password.' };
    }
  }

  if (!targetUser || !targetUser.isActive) {
    return { success: false, error: 'Account is inactive or not found.' };
  }

  // Set HTTP-only auth session cookie
  const cookieStore = await cookies();
  cookieStore.set(
    AUTH_COOKIE_NAME,
    JSON.stringify({
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    }
  );

  revalidatePath('/');
  return { success: true, user: targetUser };
}

/**
 * Gets currently logged in user from session cookie
 */
export async function getCurrentUserSession() {
  try {
    const mainUser = await ensureMainUser();

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const parsed = JSON.parse(sessionCookie.value);
    if (!parsed || !parsed.id) {
      return null;
    }

    let user = await prisma.user.findUnique({
      where: { id: parsed.id },
    });

    // If session ID was from an old duplicate, fallback to main user
    if (!user && (parsed.role === 'ADMIN' || parsed.role === 'LEAD')) {
      user = mainUser;
    }

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Logs out the current user
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  revalidatePath('/');
  redirect('/login');
}
