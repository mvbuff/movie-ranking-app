'use server';

import prisma from '@/lib/prisma';

export async function calculateUserAggregateScores(userId: string) {
  if (!userId) {
    throw new Error('User ID is required to calculate scores.');
  }

  // 1. Get the current user's friend weight preferences
  const weightPreferences = await prisma.weightPreference.findMany({
    where: { userId },
  });

  if (weightPreferences.length === 0) {
    // No friends selected, so we can clear out any old scores
    await prisma.aggregateScore.deleteMany({ where: { userId } });
    return { message: "No friends selected. Scores cleared." };
  }
  
  const friendWeights = new Map(weightPreferences.map(p => [p.friendId, p.weight]));
  const friendIds = Array.from(friendWeights.keys());

  // 2. Get all ratings from those friends
  const friendRatings = await prisma.rating.findMany({
    where: {
      userId: { in: friendIds },
    },
  });

  // Group ratings by movie for efficient lookup
  const ratingsByMovie = friendRatings.reduce((acc, rating) => {
    const movieRatings = acc.get(rating.movieId) || [];
    movieRatings.push(rating);
    acc.set(rating.movieId, movieRatings);
    return acc;
  }, new Map<string, typeof friendRatings>());


  // 3. Get all movies
  const allMovies = await prisma.movie.findMany();
  const scoresToUpsert = [];

  // 4. Calculate the aggregate score for each movie
  for (const movie of allMovies) {
    const relevantRatings = ratingsByMovie.get(movie.id) || [];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const rating of relevantRatings) {
      const weight = friendWeights.get(rating.userId);
      if (weight !== undefined) {
        totalWeightedScore += rating.score * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight > 0) {
      const finalScore = totalWeightedScore / totalWeight;
      scoresToUpsert.push({
        userId,
        movieId: movie.id,
        score: finalScore,
      });
    }
  }

  // 5. Delete old scores and create new ones in a transaction
  if (scoresToUpsert.length > 0) {
    await prisma.$transaction([
      prisma.aggregateScore.deleteMany({ where: { userId } }),
      prisma.aggregateScore.createMany({ data: scoresToUpsert }),
    ]);
  } else {
    // If no scores could be calculated, still clear out old ones
    await prisma.aggregateScore.deleteMany({ where: { userId } });
  }

  // NOTE: We no longer revalidate here. The client will trigger the refresh.
  return { message: `Calculated scores for ${scoresToUpsert.length} movies.` };
} 