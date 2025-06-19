import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// GET: Fetch forum threads - allow read-only access
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    
    const whereClause = categoryId ? { categoryId } : {};
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threads = await (prisma as any).forumThread.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true }
        },
        category: {
          select: { id: true, name: true, color: true }
        },
        _count: {
          select: { posts: true }
        },
        posts: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: [
        { isSticky: 'desc' },
        { updatedAt: 'desc' }
      ]
    });
    
    return NextResponse.json(threads);
  } catch (error) {
    console.error("Failed to fetch forum threads:", error);
    return NextResponse.json({ error: 'Failed to fetch forum threads' }, { status: 500 });
  }
}

// POST: Create a new forum thread - require authentication
export async function POST(request: Request) {
  try {
    // Check authentication for write operations (same pattern as ratings/reviews API)
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { title, content, categoryId, userId } = await request.json();

    if (!title || !content || !categoryId || !userId) {
      return NextResponse.json({ 
        error: 'Title, content, category, and user ID are required' 
      }, { status: 400 });
    }

    // Verify category exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const category = await (prisma as any).forumCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Create thread and first post in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thread = await (tx as any).forumThread.create({
        data: {
          title,
          authorId: userId,
          categoryId,
        },
        include: {
          author: {
            select: { id: true, name: true }
          },
          category: {
            select: { id: true, name: true, color: true }
          }
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstPost = await (tx as any).forumPost.create({
        data: {
          content,
          isFirstPost: true,
          authorId: userId,
          threadId: thread.id,
        }
      });

      return { thread, firstPost };
    });

    return NextResponse.json(result.thread, { status: 201 });
  } catch (error) {
    console.error("Failed to create forum thread:", error);
    return NextResponse.json({ error: 'Failed to create forum thread' }, { status: 500 });
  }
}

// DELETE: Delete a forum thread - require authentication (author or admin)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { threadId, userId } = await request.json();

    if (!threadId || !userId) {
      return NextResponse.json({ 
        error: 'Thread ID and user ID are required' 
      }, { status: 400 });
    }

    // Get the thread to check ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      include: {
        author: {
          select: { id: true, role: true }
        }
      }
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Get current user info to check if admin
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is the author or an admin
    const isAuthor = thread.author.id === userId;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ 
        error: 'You can only delete your own threads unless you are an admin' 
      }, { status: 403 });
    }

    // Delete the thread (this will cascade delete all posts due to schema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).forumThread.delete({
      where: { id: threadId }
    });

    return NextResponse.json({ message: 'Thread deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete forum thread:", error);
    return NextResponse.json({ error: 'Failed to delete forum thread' }, { status: 500 });
  }
} 