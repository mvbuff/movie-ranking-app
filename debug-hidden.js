const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database schema and data...\n');
    
    // Check if isHidden field exists
    const sampleRecord = await prisma.movie.findFirst({
      select: {
        id: true,
        title: true,
        tmdbId: true,
        isHidden: true
      }
    });
    
    console.log('Sample record with isHidden field:', sampleRecord);
    
    // Check all the shows from your screenshot
    const showsToCheck = ['Silo', 'Mayasabha', 'The Last of Us', 'Severance', 'Cassandra'];
    
    for (const showTitle of showsToCheck) {
      const shows = await prisma.movie.findMany({
        where: {
          title: {
            contains: showTitle,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          title: true,
          tmdbId: true,
          isHidden: true,
          seasonNumber: true
        }
      });
      
      console.log(`\n📺 ${showTitle}:`);
      shows.forEach(show => {
        const type = show.seasonNumber ? 'Season' : 'Main Show';
        const hidden = show.isHidden ? '🙈 HIDDEN' : '👁️ VISIBLE';
        console.log(`   ${type}: ${show.title} (${show.tmdbId}) - ${hidden}`);
      });
    }
    
  } catch (error) {
    if (error.message.includes('Unknown field `isHidden`')) {
      console.log('❌ ERROR: isHidden field does not exist in database!');
      console.log('   The schema migration was not applied properly.');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
