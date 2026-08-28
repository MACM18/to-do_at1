'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { ensureMainUser, getCurrentUserSession } from './auth-actions';

export async function getUsers() {
  await ensureMainUser();

  return prisma.user.findMany({
    include: {
      _count: {
        select: {
          tasks: true,
          logs: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  role?: string;
}) {
  if (!data.name?.trim() || !data.email?.trim()) {
    throw new Error('Name and email are required');
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email.trim().toLowerCase() },
  });

  if (existing) {
    throw new Error('A team member with this email already exists');
  }

  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password?.trim() || null,
      role: data.role || 'MEMBER',
      isActive: true,
    },
  });

  revalidatePath('/');
  return user;
}

export async function updateUser(
  userId: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    isActive?: boolean;
  }
) {
  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.email !== undefined) updatePayload.email = data.email.trim().toLowerCase();
  if (data.password !== undefined && data.password !== '') {
    updatePayload.password = data.password.trim();
  }
  if (data.role !== undefined) updatePayload.role = data.role;
  if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updatePayload,
  });

  revalidatePath('/');
  return user;
}

/**
 * Admin action to change a user's password with verification
 */
export async function updateUserPassword(targetUserId: string, newPassword: string) {
  const sessionUser = await getCurrentUserSession();
  if (!sessionUser || (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'LEAD')) {
    throw new Error('Only administrators can change team member passwords.');
  }

  if (!newPassword || newPassword.trim().length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  const user = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      password: newPassword.trim(),
    },
  });

  revalidatePath('/');
  return { success: true, message: `Password for ${user.name} successfully updated.` };
}

export async function deleteUser(userId: string) {
  const count = await prisma.user.count();
  if (count <= 1) {
    throw new Error('Cannot delete the only remaining user in the system.');
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath('/');
  return { success: true };
}
