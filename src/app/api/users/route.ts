import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcrypt';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
} 

export async function POST(request: Request) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const hashedPassword = await hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        password: hashedPassword,
        // Role and status will use the default values 'USER' and 'PENDING'
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    // Check if the error is a Prisma unique constraint violation
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A user with this name already exists.' }, { status: 409 });
    }
    // For all other errors
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
} 