import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// GET: Fetch forum posts for a thread - allow read-only access
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    // Increment thread view count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).forumThread.update({
      where: { id: threadId },
      data: { views: { increment: 1 } }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = await (prisma as any).forumPost.findMany({
      where: { threadId },
      include: {
        author: {
          select: { id: true, name: true }
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: [
        { isFirstPost: 'desc' },
        { createdAt: 'asc' }
      ]
    });
    
    return NextResponse.json(posts);
  } catch (error) {
    console.error("Failed to fetch forum posts:", error);
    return NextResponse.json({ error: 'Failed to fetch forum posts' }, { status: 500 });
  }
}

// POST: Create a new forum post - require authentication
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { content, threadId, parentId, userId } = await request.json();

    if (!content || !threadId || !userId) {
      return NextResponse.json({ 
        error: 'Content, thread ID, and user ID are required' 
      }, { status: 400 });
    }

    // Verify thread exists and is not locked
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId }
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread.isLocked) {
      return NextResponse.json({ error: 'Thread is locked' }, { status: 403 });
    }

    // If parentId is provided, verify parent post exists
    if (parentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parentPost = await (prisma as any).forumPost.findUnique({
        where: { id: parentId }
      });

      if (!parentPost) {
        return NextResponse.json({ error: 'Parent post not found' }, { status: 404 });
      }
    }

    // Create post and update thread's updatedAt in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const post = await (tx as any).forumPost.create({
        data: {
          content,
          authorId: userId,
          threadId,
          parentId: parentId || null,
        },
        include: {
          author: {
            select: { id: true, name: true }
          }
        }
      });

      // Update thread's updatedAt timestamp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any).forumThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() }
      });

      return post;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create forum post:", error);
    return NextResponse.json({ error: 'Failed to create forum post' }, { status: 500 });
  }
}

// DELETE: Delete a forum post - require authentication (author or admin)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { postId, userId } = await request.json();

    if (!postId || !userId) {
      return NextResponse.json({ 
        error: 'Post ID and user ID are required' 
      }, { status: 400 });
    }

    // Get the post to check ownership and if it's the first post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = await (prisma as any).forumPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true, role: true }
        },
        thread: {
          select: { id: true, title: true }
        }
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Prevent deletion of first post (would break thread structure)
    if (post.isFirstPost) {
      return NextResponse.json({ 
        error: 'Cannot delete the first post of a thread. Delete the entire thread instead.' 
      }, { status: 400 });
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
    const isAuthor = post.author.id === userId;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ 
        error: 'You can only delete your own posts unless you are an admin' 
      }, { status: 403 });
    }

    // Delete the post (this will cascade delete any replies due to schema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).forumPost.delete({
      where: { id: postId }
    });

    return NextResponse.json({ message: 'Post deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete forum post:", error);
    return NextResponse.json({ error: 'Failed to delete forum post' }, { status: 500 });
  }
} 