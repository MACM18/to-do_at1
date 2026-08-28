'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';

const AUTH_COOKIE_NAME = 'todo_auth_session';

/**
 * Ensures the main user from .env exists in the database
 */
export async function ensureMainUser() {
  const envName = (process.env.AUTH_USER || 'Chathura').trim();
  const envEmail = (process.env.AUTH_EMAIL || 'chathura@example.com').trim().toLowerCase();
  const envPassword = process.env.AUTH_PASSWORD || 'changeme123';

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: envEmail },
        { name: envName },
      ],
    },
  });

  if (!user) {
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
    // Keep credentials and admin role synced
    if (user.role !== 'ADMIN' || user.password !== envPassword || user.name !== envName) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: envName,
          role: 'ADMIN',
          password: envPassword,
        },
      });
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

  await ensureMainUser();

  const isMainUserMatch =
    (identifier.toLowerCase() === envName || identifier.toLowerCase() === envEmail) &&
    password === envPassword;

  let targetUser = null;

  if (isMainUserMatch) {
    targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: envEmail },
          { name: process.env.AUTH_USER || 'Chathura' },
        ],
      },
    });
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
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const parsed = JSON.parse(sessionCookie.value);
    if (!parsed || !parsed.id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.id },
    });

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
