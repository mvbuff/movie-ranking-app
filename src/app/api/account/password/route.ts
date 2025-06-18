import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hash, compare } from 'bcrypt';
import { UserRole } from '@prisma/client';

// Helper to generate a random temporary password
function generateTempPassword() {
  return Math.random().toString(36).slice(-8);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { currentPassword, newPassword, userIdForAdminReset } = await request.json();

  // --- Admin Password Reset Flow ---
  if (userIdForAdminReset && session.user.role === UserRole.ADMIN) {
    const tempPassword = generateTempPassword();
    const hashedPassword = await hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userIdForAdminReset },
      data: {
        password: hashedPassword,
        passwordResetRequired: true,
      },
    });

    return NextResponse.json({ temporaryPassword: tempPassword });
  }

  // --- Self-Service Password Change Flow ---
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.password) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  // If it's NOT a forced reset, then the current password is required and must be validated.
  if (!user.passwordResetRequired) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
    }
    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid current password' }, { status: 403 });
    }
  }

  // A new password is always required.
  if (!newPassword) {
    return NextResponse.json({ error: 'New password is required.' }, { status: 400 });
  }

  const newHashedPassword = await hash(newPassword, 10);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      password: newHashedPassword,
      passwordResetRequired: false, // Clear flag after successful change
    },
  });

  return NextResponse.json({ message: 'Password changed successfully' });
} 