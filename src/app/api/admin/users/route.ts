import { NextResponse } from 'next/server';
import prisma, { Prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Helper to check for admin session
async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === Prisma.UserRole.ADMIN;
}

// GET all users (for admin panel)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PATCH to update a user's status (approve/deny)
export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, status } = await request.json();
    if (!userId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}

// DELETE a user
export async function DELETE(request: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
} 