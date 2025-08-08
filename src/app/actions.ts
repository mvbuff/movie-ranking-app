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

  // 2. Get all ratings from those friends AND the user themselves
  const allFriendIds = [...friendIds, userId]; // Include user's own ratings
  const friendRatings = await prisma.rating.findMany({
    where: {
      userId: { in: allFriendIds },
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
      let weight;
      if (rating.userId === userId) {
        // User's own rating gets 100% weight (1.0)
        weight = 1.0;
      } else {
        // Friend's rating gets their configured weight
        weight = friendWeights.get(rating.userId);
      }
      
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

export async function calculateUserRestaurantAggregateScores(userId: string) {
  if (!userId) {
    throw new Error('User ID is required to calculate restaurant scores.');
  }

  // Get user's weight preferences (friends and their weights)
  const weightPreferences = await prisma.restaurantWeightPreference.findMany({
    where: { userId },
    include: {
      friend: {
        select: { id: true, name: true, status: true }
      }
    }
  });

  // Get all restaurants
  const restaurants = await prisma.restaurant.findMany({
    select: { id: true }
  });

  const results = [];

  for (const restaurant of restaurants) {
    // Get all ratings for this restaurant from user's friends
    const friendIds = weightPreferences
      .filter(wp => wp.friend.status === 'ACTIVE')
      .map(wp => wp.friend.id);
    
    // Include the user themselves
    friendIds.push(userId);

    const allRatings = await prisma.restaurantRating.findMany({
      where: {
        restaurantId: restaurant.id,
        userId: { in: friendIds },
        availability: 'AVAILABLE'
      },
      include: {
        user: { select: { id: true } }
      }
    });

    // Separate veg and non-veg ratings
    const vegRatings = allRatings.filter(r => r.ratingType === 'VEG' && r.score !== null);
    const nonVegRatings = allRatings.filter(r => r.ratingType === 'NON_VEG' && r.score !== null);

    // Calculate weighted scores with new logic
    let vegScore = null;
    let nonVegScore = null;
    let vegCount = 0;
    let nonVegCount = 0;

    if (vegRatings.length > 0) {
      // Check if there are any friend ratings (excluding user's own rating)
      const friendVegRatings = vegRatings.filter(r => r.userId !== userId);
      const userVegRating = vegRatings.find(r => r.userId === userId);

      if (friendVegRatings.length === 0 && userVegRating) {
        // No friends rated, use user's rating with 100% weightage as friend score
        vegScore = userVegRating.score!;
        vegCount = 1;
      } else {
        // Friends have rated, use weighted calculation
        let totalVegWeight = 0;
        let weightedVegSum = 0;

        vegRatings.forEach(rating => {
          const weight = rating.userId === userId ? 1.0 : 
            (weightPreferences.find(wp => wp.friendId === rating.userId)?.weight || 1.0);
          
          weightedVegSum += (rating.score! * weight);
          totalVegWeight += weight;
          vegCount++;
        });

        vegScore = totalVegWeight > 0 ? weightedVegSum / totalVegWeight : null;
      }
    }

    if (nonVegRatings.length > 0) {
      // Check if there are any friend ratings (excluding user's own rating)
      const friendNonVegRatings = nonVegRatings.filter(r => r.userId !== userId);
      const userNonVegRating = nonVegRatings.find(r => r.userId === userId);

      if (friendNonVegRatings.length === 0 && userNonVegRating) {
        // No friends rated, use user's rating with 100% weightage as friend score
        nonVegScore = userNonVegRating.score!;
        nonVegCount = 1;
      } else {
        // Friends have rated, use weighted calculation
        let totalNonVegWeight = 0;
        let weightedNonVegSum = 0;

        nonVegRatings.forEach(rating => {
          const weight = rating.userId === userId ? 1.0 : 
            (weightPreferences.find(wp => wp.friendId === rating.userId)?.weight || 1.0);
          
          weightedNonVegSum += (rating.score! * weight);
          totalNonVegWeight += weight;
          nonVegCount++;
        });

        nonVegScore = totalNonVegWeight > 0 ? weightedNonVegSum / totalNonVegWeight : null;
      }
    }

    // Calculate confidence based on number of ratings
    const totalRatings = vegCount + nonVegCount;
    const confidence = Math.min(totalRatings / 5, 1.0); // Max confidence at 5+ ratings

    // Only create/update if we have some scores
    if (vegScore !== null || nonVegScore !== null) {
      const aggregateScore = await prisma.restaurantAggregateScore.upsert({
        where: {
          userId_restaurantId: { userId, restaurantId: restaurant.id }
        },
        update: {
          vegScore: vegScore ? Math.round(vegScore * 100) / 100 : null,
          nonVegScore: nonVegScore ? Math.round(nonVegScore * 100) / 100 : null,
          vegCount,
          nonVegCount,
          confidence: Math.round(confidence * 100) / 100
        },
        create: {
          userId,
          restaurantId: restaurant.id,
          vegScore: vegScore ? Math.round(vegScore * 100) / 100 : null,
          nonVegScore: nonVegScore ? Math.round(nonVegScore * 100) / 100 : null,
          vegCount,
          nonVegCount,
          confidence: Math.round(confidence * 100) / 100
        }
      });

      results.push(aggregateScore);
    }
  }

  console.log(`🧮 Calculated restaurant aggregate scores for user ${userId}: ${results.length} restaurants processed`);

  return { 
    success: true,
    message: results.length === 0 
      ? "No restaurant scores calculated. Please rate some restaurants first or select friends who have rated restaurants." 
      : `Calculated scores for ${results.length} restaurants.`,
    results
  };
} 