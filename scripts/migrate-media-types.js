// Migration script to update existing movies with correct media types
// This will use the TMDB API to determine the correct media type for existing entries

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = 'https://api.themoviedb.org/3';

async function getTmdbMediaType(tmdbId) {
  // Skip manual entries
  if (tmdbId.startsWith('manual_')) {
    return 'movie';
  }

  if (!TMDB_API_KEY) {
    console.warn('TMDB_API_KEY not found, defaulting to movie');
    return 'movie';
  }

  try {
    // Check both endpoints simultaneously
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`${TMDB_API_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_API_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`)
    ]);

    const movieValid = movieResponse.ok;
    const tvValid = tvResponse.ok;

    if (movieValid && tvValid) {
      // Ambiguous case - both endpoints return valid results
      try {
        const [movieData, tvData] = await Promise.all([
          movieResponse.json(),
          tvResponse.json()
        ]);

        // Prefer TV shows if they have a more recent release date
        const movieYear = movieData.release_date ? new Date(movieData.release_date).getFullYear() : 0;
        const tvYear = tvData.first_air_date ? new Date(tvData.first_air_date).getFullYear() : 0;

        if (tvYear > movieYear) {
          console.log(`Ambiguous ID ${tmdbId}: Choosing TV (${tvYear}) over movie (${movieYear})`);
          return 'tv';
        } else if (movieYear > tvYear) {
          console.log(`Ambiguous ID ${tmdbId}: Choosing movie (${movieYear}) over TV (${tvYear})`);
          return 'movie';
        } else {
          // If same year or no dates, prefer TV
          console.log(`Ambiguous ID ${tmdbId}: Defaulting to TV`);
          return 'tv';
        }
      } catch (parseError) {
        console.warn(`Parse error for ${tmdbId}, defaulting to TV`);
        return 'tv';
      }
    }

    if (movieValid) {
      return 'movie';
    }

    if (tvValid) {
      return 'tv';
    }

    // Default to movie if both fail
    console.warn(`Could not determine media type for ${tmdbId}, defaulting to movie`);
    return 'movie';
  } catch (error) {
    console.error(`Error determining media type for ${tmdbId}:`, error.message);
    return 'movie';
  }
}

async function migrateMediaTypes() {
  console.log('🚀 Starting media type migration...');
  
  try {
    // Get all movies that need media type verification
    // This includes movies with default "movie" value that might actually be TV shows
    const movies = await prisma.movie.findMany({
      where: {
        OR: [
          { mediaType: null },
          { mediaType: "" },
          { mediaType: "movie" } // Re-evaluate movies with default value
        ]
      },
      select: {
        id: true,
        title: true,
        tmdbId: true,
        year: true,
        mediaType: true
      }
    });

    console.log(`Found ${movies.length} movies without media type`);

    if (movies.length === 0) {
      console.log('✅ No movies to migrate');
      return;
    }

    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    for (const movie of movies) {
      try {
        console.log(`Processing: ${movie.title} (${movie.year}) - TMDB ID: ${movie.tmdbId}`);
        console.log(`  Current: ${movie.mediaType}`);
        
        const newMediaType = await getTmdbMediaType(movie.tmdbId);
        
        if (newMediaType !== movie.mediaType) {
          await prisma.movie.update({
            where: { id: movie.id },
            data: { mediaType: newMediaType }
          });

          console.log(`✅ Updated ${movie.title}: ${movie.mediaType} -> ${newMediaType}`);
          updated++;
        } else {
          console.log(`⚪ No change needed for ${movie.title} (${newMediaType})`);
          unchanged++;
        }

        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error updating ${movie.title}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Migration complete:`);
    console.log(`   Updated: ${updated} movies`);
    console.log(`   Unchanged: ${unchanged} movies`);
    console.log(`   Errors: ${errors} movies`);
    console.log(`   Total processed: ${movies.length} movies`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateMediaTypes(); 