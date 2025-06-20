// import prisma from '@/lib/prisma';

// Configuration for number of activities to show
export const ACTIVITY_FEED_LIMIT = 10; // Reduced for popup display

type ActivityType = 
  | 'MOVIE_ADDED'
  | 'MOVIE_RATED'
  | 'REVIEW_ADDED'
  | 'REVIEW_LIKED'
  | 'FORUM_THREAD_CREATED'
  | 'FORUM_POST_ADDED'
  | 'USER_REGISTERED';

interface ActivityLogOptions {
  userId: string;
  type: ActivityType;
  description: string;
  movieId?: string;
  reviewId?: string;
  threadId?: string;
  postId?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(options: ActivityLogOptions) {
  try {
    // TODO: Uncomment once Prisma types are available
    // await prisma.activity.create({
    //   data: {
    //     userId: options.userId,
    //     type: options.type,
    //     description: options.description,
    //     movieId: options.movieId,
    //     reviewId: options.reviewId,
    //     threadId: options.threadId,
    //     postId: options.postId,
    //     metadata: options.metadata,
    //   },
    // });
    console.log('Activity logged:', options.description);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error as activity logging should not break main functionality
  }
}

// Convenience functions for common activities (removed watchlist functions for privacy)
export const ActivityLogger = {
  movieAdded: async (userId: string, movieId: string, movieTitle: string) => {
    await logActivity({
      userId,
      type: 'MOVIE_ADDED',
      description: `Added "${movieTitle}" to the database`,
      movieId,
      metadata: { movieTitle }
    });
  },

  movieRated: async (userId: string, movieId: string, movieTitle: string, score: number) => {
    await logActivity({
      userId,
      type: 'MOVIE_RATED',
      description: `Rated "${movieTitle}" with score ${score}`,
      movieId,
      metadata: { movieTitle, score }
    });
  },

  reviewAdded: async (userId: string, reviewId: string, movieId: string, movieTitle: string) => {
    await logActivity({
      userId,
      type: 'REVIEW_ADDED',
      description: `Added a review for "${movieTitle}"`,
      movieId,
      reviewId,
      metadata: { movieTitle }
    });
  },

  reviewLiked: async (userId: string, reviewId: string, reviewAuthor: string) => {
    await logActivity({
      userId,
      type: 'REVIEW_LIKED',
      description: `Liked ${reviewAuthor}'s review`,
      reviewId,
      metadata: { reviewAuthor }
    });
  },

  forumThreadCreated: async (userId: string, threadId: string, threadTitle: string) => {
    await logActivity({
      userId,
      type: 'FORUM_THREAD_CREATED',
      description: `Created forum thread "${threadTitle}"`,
      threadId,
      metadata: { threadTitle }
    });
  },

  forumPostAdded: async (userId: string, postId: string, threadId: string, threadTitle: string) => {
    await logActivity({
      userId,
      type: 'FORUM_POST_ADDED',
      description: `Replied to "${threadTitle}"`,
      threadId,
      postId,
      metadata: { threadTitle }
    });
  },

  userRegistered: async (userId: string, userName: string) => {
    await logActivity({
      userId,
      type: 'USER_REGISTERED',
      description: `${userName} joined Movie Ranking!`,
      metadata: { userName }
    });
  }
}; 