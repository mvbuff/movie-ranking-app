import prisma from '@/lib/prisma';

/**
 * Safely delete a movie and all its related records
 * This handles the foreign key constraint issue by deleting related records first
 */
export async function safeDeleteMovie(movieId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`🗑️ Starting safe deletion of movie: ${movieId}`);

    // Step 1: Delete all AggregateScores for this movie
    const deletedAggregateScores = await prisma.aggregateScore.deleteMany({
      where: { movieId }
    });
    console.log(`✅ Deleted ${deletedAggregateScores.count} aggregate scores`);

    // Step 2: Delete all Ratings for this movie
    const deletedRatings = await prisma.rating.deleteMany({
      where: { movieId }
    });
    console.log(`✅ Deleted ${deletedRatings.count} ratings`);

    // Step 3: Delete all Reviews for this movie (and their likes will cascade)
    const deletedReviews = await prisma.review.deleteMany({
      where: { movieId }
    });
    console.log(`✅ Deleted ${deletedReviews.count} reviews`);

    // Step 4: Delete all Watchlist entries for this movie
    const deletedWatchlist = await prisma.watchlist.deleteMany({
      where: { movieId }
    });
    console.log(`✅ Deleted ${deletedWatchlist.count} watchlist entries`);

    // Step 5: Delete any forum categories linked to this movie
    const deletedForumCategories = await prisma.forumCategory.deleteMany({
      where: { movieId }
    });
    console.log(`✅ Deleted ${deletedForumCategories.count} forum categories`);

    // Step 6: Finally delete the movie itself
    const deletedMovie = await prisma.movie.delete({
      where: { id: movieId }
    });
    console.log(`✅ Successfully deleted movie: ${deletedMovie.title}`);

    return {
      success: true,
      message: `Successfully deleted movie "${deletedMovie.title}" and all related data`
    };

  } catch (error) {
    console.error('❌ Error during safe movie deletion:', error);
    return {
      success: false,
      message: `Failed to delete movie: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check what would be deleted before actually deleting (dry run)
 */
export async function previewMovieDeletion(movieId: string) {
  try {
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { title: true, year: true }
    });

    if (!movie) {
      return { found: false, message: 'Movie not found' };
    }

    const [aggregateScores, ratings, reviews, watchlist, forumCategories] = await Promise.all([
      prisma.aggregateScore.count({ where: { movieId } }),
      prisma.rating.count({ where: { movieId } }),
      prisma.review.count({ where: { movieId } }),
      prisma.watchlist.count({ where: { movieId } }),
      prisma.forumCategory.count({ where: { movieId } })
    ]);

    return {
      found: true,
      movie: `${movie.title} (${movie.year})`,
      toDelete: {
        aggregateScores,
        ratings,
        reviews,
        watchlistEntries: watchlist,
        forumCategories
      }
    };

  } catch (error) {
    return { found: false, message: `Error previewing deletion: ${error}` };
  }
} 