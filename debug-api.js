const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

async function checkMoviesAPI() {
  try {
    console.log('🔍 Simulating movies API query...\n');
    
    // Simulate the actual API query from /api/movies
    const movies = await prisma.movie.findMany({
      where: {
        isHidden: false, // This should exclude hidden parent shows
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        year: true,
        posterUrl: true,
        tmdbId: true,
        tmdbRating: true,
        tmdbVoteCount: true,
        category: true,
        mediaType: true,
        createdAt: true,
        // Season-specific fields
        seasonNumber: true,
        episodeCount: true,
        parentShowId: true,
        isHidden: true,
      }
    });
    
    console.log(`📊 Total visible movies/shows: ${movies.length}\n`);
    
    // Filter for the problematic shows
    const problematicShows = movies.filter(movie => 
      ['Silo', 'Mayasabha', 'Severance', 'Cassandra'].some(show => 
        movie.title.includes(show)
      )
    );
    
    console.log('🎬 Shows that might be confusing in the UI:');
    problematicShows.forEach(movie => {
      const type = movie.seasonNumber ? `Season ${movie.seasonNumber}` : 'Main Show';
      const hidden = movie.isHidden ? '🙈 HIDDEN' : '👁️ VISIBLE';
      console.log(`   ${type}: ${movie.title} (${movie.tmdbId}) - ${hidden}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMoviesAPI();
