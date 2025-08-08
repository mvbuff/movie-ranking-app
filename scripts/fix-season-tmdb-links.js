#!/usr/bin/env node

/**
 * Migration script to fix existing TV show season TMDB links in the database
 * 
 * Problem: Existing seasons were stored with TMDB IDs like "12345-s1" 
 * which don't work for TMDB links. The frontend now handles these correctly,
 * but this script ensures the database is consistent.
 * 
 * This script will:
 * 1. Find all TV show seasons (records with seasonNumber)
 * 2. Verify they have the correct TMDB ID format
 * 3. Update any that need fixing
 */

// Load environment variables from .env files
try {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
} catch (error) {
  console.log('⚠️ dotenv not available, using system environment variables only');
}

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSeasonTmdbLinks() {
  console.log('🔍 Starting migration to fix season TMDB links...\n');

  // Check database connection
  console.log('🔗 Checking database connection...');
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not found!');
    console.log('   Make sure you have .env or .env.local file with DATABASE_URL');
    process.exit(1);
  }
  console.log('✅ Database URL found');
  
  // Check for TMDB API key
  if (!process.env.TMDB_API_KEY) {
    console.log('⚠️ TMDB_API_KEY not found - will skip creating missing parent shows');
  } else {
    console.log('✅ TMDB API key found');
  }
  console.log('');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database\n');

    // First, let's see what's in the database
    const totalMovies = await prisma.movie.count();
    console.log(`📊 Total movies/shows in database: ${totalMovies}`);
    
    const tvShows = await prisma.movie.count({
      where: { mediaType: 'tv' }
    });
    console.log(`📺 Total TV shows: ${tvShows}`);
    
    const withSeasonNumber = await prisma.movie.count({
      where: { 
        seasonNumber: { not: null }
      }
    });
    console.log(`🎬 Records with season numbers: ${withSeasonNumber}\n`);

    // Let's examine those records with season numbers
    const recordsWithSeasons = await prisma.movie.findMany({
      where: { 
        seasonNumber: { not: null }
      },
      select: {
        id: true,
        title: true,
        tmdbId: true,
        mediaType: true,
        seasonNumber: true,
        parentShowId: true
      }
    });

    console.log('🔍 Records with season numbers:');
    recordsWithSeasons.forEach(record => {
      console.log(`   - ${record.title} (ID: ${record.tmdbId}, Season: ${record.seasonNumber}, Media: ${record.mediaType}, Parent: ${record.parentShowId})`);
    });
    console.log('');

    // Find all TV show seasons (records with seasonNumber that are not null)
    const seasons = await prisma.movie.findMany({
      where: {
        seasonNumber: {
          not: null
        }
        // Removing mediaType restriction to see all season records
      },
      select: {
        id: true,
        tmdbId: true,
        title: true,
        seasonNumber: true,
        parentShowId: true,
        parentShow: {
          select: {
            tmdbId: true,
            title: true
          }
        }
      }
    });

    console.log(`📊 Found ${seasons.length} TV show seasons in database\n`);

    if (seasons.length === 0) {
      console.log('✅ No TV show seasons found in database. Nothing to fix!');
      return;
    }

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;

    for (const season of seasons) {

      // Extract parent show TMDB ID from season TMDB ID
      const parentTmdbIdMatch = season.tmdbId.match(/^(\d+)-s\d+$/);
      if (!parentTmdbIdMatch) {
        console.log(`⚠️  ${season.title} - Invalid season TMDB ID format: ${season.tmdbId}, skipping`);
        errorCount++;
        continue;
      }
      
      const parentTmdbId = parentTmdbIdMatch[1];
      
      // Check if parent show exists in database
      let parentShow = await prisma.movie.findUnique({
        where: { tmdbId: parentTmdbId }
      });
      
      if (!parentShow) {
        console.log(`🔍 ${season.title} - Parent show (${parentTmdbId}) not found in database`);
        console.log(`   Creating parent show from TMDB API...`);
        
        try {
          // Fetch show data from TMDB API
          const tmdbResponse = await fetch(`https://api.themoviedb.org/3/tv/${parentTmdbId}?api_key=${process.env.TMDB_API_KEY}`);
          
          if (!tmdbResponse.ok) {
            console.log(`   ❌ Failed to fetch show data from TMDB API for ID ${parentTmdbId}`);
            errorCount++;
            continue;
          }
          
          const showData = await tmdbResponse.json();
          
          // Create the parent show record as hidden (for TMDB link resolution only)
          const createdParentShow = await prisma.movie.create({
            data: {
              tmdbId: parentTmdbId,
              title: showData.name,
              year: showData.first_air_date ? parseInt(showData.first_air_date.substring(0, 4)) : 0,
              posterUrl: showData.poster_path ? `https://image.tmdb.org/t/p/w500${showData.poster_path}` : null,
              category: 'SERIES',
              mediaType: 'tv',
              tmdbRating: showData.vote_average,
              tmdbVoteCount: showData.vote_count,
              isHidden: true // Mark as hidden so it doesn't appear in main list
            }
          });
          
          console.log(`   ✅ Created parent show: ${createdParentShow.title}`);
          
          // Use the newly created parent show
          parentShow = createdParentShow;
          
        } catch (error) {
          console.log(`   ❌ Error creating parent show: ${error.message}`);
          errorCount++;
          continue;
        }
      }

      try {
        // Update the season record to fix multiple issues
        const updateData = {};
        
        // Fix media type if needed
        if (season.mediaType !== 'tv') {
          updateData.mediaType = 'tv';
        }
        
        // Fix parent relationship if needed
        if (!season.parentShowId) {
          updateData.parentShowId = parentShow.id;
        }
        
        // Only update if there's something to fix
        if (Object.keys(updateData).length > 0) {
          await prisma.movie.update({
            where: { id: season.id },
            data: updateData
          });

          console.log(`🔧 Fixed: ${season.title}`);
          if (updateData.mediaType) {
            console.log(`   ✅ Media type: ${season.mediaType} → tv`);
          }
          if (updateData.parentShowId) {
            console.log(`   ✅ Parent show: ${season.parentShowId || 'null'} → ${parentShow.id} (${parentShow.title})`);
          }
          console.log('');
          
          fixedCount++;
        } else {
          console.log(`✅ ${season.title} - Already properly configured`);
          alreadyCorrectCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${season.title}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Already correct: ${alreadyCorrectCount}`);
    console.log(`   🔧 Fixed: ${fixedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total processed: ${seasons.length}\n`);

    if (fixedCount > 0) {
      console.log('🎉 Season TMDB links have been fixed!');
      console.log('   The frontend will now correctly link to parent shows on TMDB.');
      
      // Mark existing visible parent shows as hidden if they only exist for seasons
      console.log('\n🔍 Checking for parent shows that should be hidden...');
      await markOrphanParentShowsAsHidden();
    } else if (alreadyCorrectCount === seasons.length) {
      console.log('✨ All season TMDB links were already correct!');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Additional function to verify the fix worked
async function verifyFix() {
  console.log('\n🔍 Verifying the fix...');
  
  try {
    const seasons = await prisma.movie.findMany({
      where: {
        seasonNumber: { not: null },
        mediaType: 'tv'
      },
      include: {
        parentShow: {
          select: { tmdbId: true, title: true }
        }
      }
    });

    let correctCount = 0;
    let incorrectCount = 0;

    for (const season of seasons) {
      const expectedFormat = season.parentShow?.tmdbId ? 
        `${season.parentShow.tmdbId}-s${season.seasonNumber}` : 
        null;

      if (season.tmdbId === expectedFormat) {
        correctCount++;
      } else {
        incorrectCount++;
        console.log(`❌ Still incorrect: ${season.title} - ${season.tmdbId}`);
      }
    }

    console.log(`\n📊 Verification Results:`);
    console.log(`   ✅ Correct format: ${correctCount}`);
    console.log(`   ❌ Still incorrect: ${incorrectCount}`);

    if (incorrectCount === 0) {
      console.log('🎉 All season TMDB IDs are now in correct format!');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Function to mark parent shows as hidden if they only exist for season linking
async function markOrphanParentShowsAsHidden() {
  try {
    // Find parent shows that have seasons but no ratings/reviews themselves
    const parentShows = await prisma.movie.findMany({
      where: {
        seasonNumber: null, // Main shows (not seasons)
        mediaType: 'tv',
        isHidden: false, // Currently visible
        seasons: {
          some: {} // Has at least one season
        }
      },
      include: {
        ratings: true,
        reviews: true,
        seasons: true
      }
    });

    let hiddenCount = 0;

    for (const show of parentShows) {
      // If parent show has no ratings/reviews of its own, it was likely created just for season linking
      if (show.ratings.length === 0 && show.reviews.length === 0) {
        await prisma.movie.update({
          where: { id: show.id },
          data: { isHidden: true }
        });
        
        console.log(`   🙈 Marked as hidden: ${show.title} (only used for season linking)`);
        hiddenCount++;
      }
    }

    if (hiddenCount > 0) {
      console.log(`\n✅ Marked ${hiddenCount} parent show(s) as hidden`);
    } else {
      console.log('   ✅ No parent shows need to be hidden');
    }

  } catch (error) {
    console.error('❌ Error marking parent shows as hidden:', error);
  }
}

// Run the migration
if (require.main === module) {
  fixSeasonTmdbLinks()
    .then(() => verifyFix())
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixSeasonTmdbLinks, verifyFix, markOrphanParentShowsAsHidden };
