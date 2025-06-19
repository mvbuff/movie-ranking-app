import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Fetch all forum categories - allow read-only access
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categories = await (prisma as any).forumCategory.findMany({
      include: {
        movie: {
          select: { id: true, title: true, year: true }
        },
        _count: {
          select: { threads: true }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch forum categories:", error);
    return NextResponse.json({ error: 'Failed to fetch forum categories' }, { status: 500 });
  }
}

// POST: Create a new forum category - require admin authentication
export async function POST(request: Request) {
  try {
    // Check authentication and admin privileges
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Note: You might want to add admin role check here
    // if (session.user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    // }

    const { name, description, color, isMovieLink, movieId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const category = await (prisma as any).forumCategory.create({
      data: {
        name,
        description,
        color,
        isMovieLink: isMovieLink || false,
        movieId: isMovieLink ? movieId : null,
      },
      include: {
        movie: {
          select: { id: true, title: true, year: true }
        },
        _count: {
          select: { threads: true }
        }
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create forum category:", error);
    return NextResponse.json({ error: 'Failed to create forum category' }, { status: 500 });
  }
} 