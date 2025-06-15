import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// GET: Fetch all weight preferences for a given user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
  }

  try {
    const preferences = await prisma.weightPreference.findMany({
      where: { userId },
    });
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Failed to fetch weight preferences:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create or update a weight preference
const upsertPreferenceSchema = z.object({
  userId: z.string(),
  friendId: z.string(),
  weight: z.number().min(0).max(2),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = upsertPreferenceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.formErrors }, { status: 400 });
    }

    const { userId, friendId, weight } = validation.data;

    const preference = await prisma.weightPreference.upsert({
      where: {
        userId_friendId: { userId, friendId },
      },
      update: { weight },
      create: { userId, friendId, weight },
    });

    return NextResponse.json(preference, { status: 200 });
  } catch (error) {
    console.error("Failed to upsert weight preference:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a weight preference
const deletePreferenceSchema = z.object({
  userId: z.string(),
  friendId: z.string(),
});

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const validation = deletePreferenceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.formErrors }, { status: 400 });
        }

        const { userId, friendId } = validation.data;

        await prisma.weightPreference.delete({
            where: {
                userId_friendId: { userId, friendId },
            },
        });

        return NextResponse.json({ message: 'Preference deleted' }, { status: 200 });
    } catch (error) {
        // Handle cases where the record doesn't exist gracefully
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ message: 'Preference not found, nothing to delete' }, { status: 200 });
        }
        console.error("Failed to delete weight preference:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 