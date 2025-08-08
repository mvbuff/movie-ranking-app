const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

async function checkDuplicates() {
  try {
    console.log('🔍 Checking for duplicate shows in your movie list...\n');
    
    // Get the exact query that the movies API uses
    const movies = await prisma.movie.findMany({
      where: {
        isHidden: false, // Should exclude hidden parent shows
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        tmdbId: true,
        seasonNumber: true,
        isHidden: true,
        createdAt: true,
      }
    });
    
    console.log(`📊 Total visible movies returned by API: ${movies.length}\n`);
    
    // Check for the shows you mentioned
    const problematicShows = ['Cassandra', 'Mayasabha', 'Silo', 'Severance'];
    
    for (const showName of problematicShows) {
      const matching = movies.filter(m => m.title.includes(showName));
      
      if (matching.length > 0) {
        console.log(`📺 ${showName} entries in visible list:`);
        matching.forEach((movie, index) => {
          const type = movie.seasonNumber ? `Season ${movie.seasonNumber}` : 'Main Show';
          const age = Math.round((Date.now() - new Date(movie.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          console.log(`   ${index + 1}. ${type}: "${movie.title}" (${movie.tmdbId}) - Hidden: ${movie.isHidden} - ${age} days old`);
        });
        console.log('');
      }
    }
    
    // Check if there are any visible records that should be hidden
    const shouldBeHidden = movies.filter(m => 
      m.seasonNumber === null && // Main shows (not seasons)
      m.tmdbId.match(/^\d+$/) && // Pure TMDB ID (not season format)
      problematicShows.some(show => m.title.includes(show))
    );
    
    if (shouldBeHidden.length > 0) {
      console.log('⚠️  These main shows should probably be hidden:');
      shouldBeHidden.forEach(movie => {
        console.log(`   - "${movie.title}" (${movie.tmdbId}) - Hidden: ${movie.isHidden}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
