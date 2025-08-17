import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// POST: Like or unlike a forum post
export async function POST(request: Request) {
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

    // Verify post exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = await (prisma as any).forumPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user has already liked this post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingLike = await (prisma as any).forumPostLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (existingLike) {
      // Unlike: Remove the like and decrease count
      await prisma.$transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).forumPostLike.delete({
          where: { id: existingLike.id }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).forumPost.update({
          where: { id: postId },
          data: { likes: { decrement: 1 } }
        });
      });

      return NextResponse.json({ 
        liked: false, 
        likes: post.likes - 1,
        message: 'Post unliked successfully' 
      });
    } else {
      // Like: Add the like and increase count
      await prisma.$transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).forumPostLike.create({
          data: {
            userId,
            postId
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).forumPost.update({
          where: { id: postId },
          data: { likes: { increment: 1 } }
        });

        // Log activity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).activity.create({
          data: {
            type: 'FORUM_POST_LIKED',
            description: `Liked a forum post`,
            userId: userId,
            postId: postId
          }
        });
      });

      return NextResponse.json({ 
        liked: true, 
        likes: post.likes + 1,
        message: 'Post liked successfully' 
      });
    }
  } catch (error) {
    console.error("Failed to like/unlike forum post:", error);
    return NextResponse.json({ error: 'Failed to like/unlike forum post' }, { status: 500 });
  }
}

// GET: Get like status for a post by a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const userId = searchParams.get('userId');

    if (!postId || !userId) {
      return NextResponse.json({ 
        error: 'Post ID and user ID are required' 
      }, { status: 400 });
    }

    // Check if user has liked this post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingLike = await (prisma as any).forumPostLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    return NextResponse.json({ 
      liked: !!existingLike 
    });
  } catch (error) {
    console.error("Failed to check like status:", error);
    return NextResponse.json({ error: 'Failed to check like status' }, { status: 500 });
  }
}
