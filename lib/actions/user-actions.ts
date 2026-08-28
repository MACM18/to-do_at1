'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';

export async function getUsers() {
  let users = await prisma.user.findMany({
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

  if (users.length === 0) {
    const defaultLead = await prisma.user.create({
      data: {
        name: 'Chathura (Lead)',
        email: 'chathura@example.com',
        role: 'LEAD',
        isActive: true,
      },
      include: {
        _count: {
          select: {
            tasks: true,
            logs: true,
          },
        },
      },
    });
    users = [defaultLead];
  }

  return users;
}

export async function createUser(data: {
  name: string;
  email: string;
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
    role?: string;
    isActive?: boolean;
  }
) {
  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.email !== undefined) updatePayload.email = data.email.trim().toLowerCase();
  if (data.role !== undefined) updatePayload.role = data.role;
  if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updatePayload,
  });

  revalidatePath('/');
  return user;
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
