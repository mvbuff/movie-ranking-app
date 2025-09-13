// import prisma from '@/lib/prisma';
import prisma from '@/lib/prisma';
import { getRatingDisplay } from '@/lib/rating-system';

// Configuration for number of activities to show
export const ACTIVITY_FEED_LIMIT = 25; // Increased for more community updates

type ActivityType = 
  | 'MOVIE_ADDED'
  | 'MOVIE_RATED'
  | 'REVIEW_ADDED'
  | 'REVIEW_LIKED'
  | 'FORUM_THREAD_CREATED'
  | 'FORUM_POST_ADDED'
  | 'USER_REGISTERED'
  | 'RESTAURANT_ADDED'
  | 'RESTAURANT_RATED'
  | 'RESTAURANT_REVIEW_ADDED'
  | 'RESTAURANT_REVIEW_LIKED';

interface ActivityLogOptions {
  userId: string;
  type: ActivityType;
  description: string;
  movieId?: string;
  reviewId?: string;
  threadId?: string;
  postId?: string;
  restaurantId?: string;
  restaurantReviewId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export async function logActivity(options: ActivityLogOptions) {
  try {
    console.log('🔄 Attempting to log activity:', options.description);
    
    // Use raw SQL to insert activity (bypassing Prisma type issues)
    await prisma.$executeRaw`
      INSERT INTO "Activity" (
        id,
        "userId", 
        type, 
        description, 
        "movieId", 
        "reviewId", 
        "threadId", 
        "postId", 
        "restaurantId",
        "restaurantReviewId",
        metadata, 
        "createdAt"
      ) VALUES (
        gen_random_uuid()::text,
        ${options.userId},
        ${options.type}::"ActivityType",
        ${options.description},
        ${options.movieId},
        ${options.reviewId},
        ${options.threadId},
        ${options.postId},
        ${options.restaurantId},
        ${options.restaurantReviewId},
        ${JSON.stringify(options.metadata || {})}::jsonb,
        NOW()
      )
    `;
    console.log('✅ Activity successfully logged to database:', options.description);
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    console.error('❌ Activity details:', options);
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
    const customRating = getRatingDisplay(score);
    await logActivity({
      userId,
      type: 'MOVIE_RATED',
      description: `Rated "${movieTitle}" as ${customRating}`,
      movieId,
      metadata: { movieTitle, score, customRating }
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

  reviewLiked: async (
    userId: string,
    reviewId: string,
    reviewAuthor: string,
    movieId: string,
    movieTitle: string
  ) => {
    await logActivity({
      userId,
      type: 'REVIEW_LIKED',
      description: `Liked ${reviewAuthor}'s review of "${movieTitle}"`,
      movieId,
      reviewId,
      metadata: { reviewAuthor, movieTitle }
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
  },

  // Restaurant activities
  restaurantAdded: async (userId: string, restaurantId: string, restaurantName: string) => {
    await logActivity({
      userId,
      type: 'RESTAURANT_ADDED',
      description: `Added "${restaurantName}" to the restaurant database`,
      restaurantId,
      metadata: { restaurantName }
    });
  },

  restaurantRated: async (userId: string, restaurantId: string, restaurantName: string, score: number, ratingType: 'VEG' | 'NON_VEG') => {
    const customRating = getRatingDisplay(score);
    const typeLabel = ratingType === 'VEG' ? 'veg' : 'non-veg';
    await logActivity({
      userId,
      type: 'RESTAURANT_RATED',
      description: `Rated "${restaurantName}" ${customRating} for ${typeLabel} food`,
      restaurantId,
      metadata: { restaurantName, score, customRating, ratingType, typeLabel }
    });
  },

  restaurantReviewAdded: async (userId: string, restaurantReviewId: string, restaurantId: string, restaurantName: string) => {
    await logActivity({
      userId,
      type: 'RESTAURANT_REVIEW_ADDED',
      description: `Added a review for "${restaurantName}"`,
      restaurantId,
      restaurantReviewId,
      metadata: { restaurantName }
    });
  },

  restaurantReviewLiked: async (userId: string, restaurantReviewId: string, reviewAuthor: string, restaurantName: string) => {
    await logActivity({
      userId,
      type: 'RESTAURANT_REVIEW_LIKED',
      description: `Liked ${reviewAuthor}'s review of "${restaurantName}"`,
      restaurantReviewId,
      metadata: { reviewAuthor, restaurantName }
    });
  }
}; 