// Script to fix TMDB media type for specific IDs
// Usage: node scripts/fix-tmdb-media-type.js [tmdbId] [mediaType]

const tmdbId = process.argv[2];
const mediaType = process.argv[3];

if (!tmdbId || !mediaType) {
  console.log('Usage: node scripts/fix-tmdb-media-type.js [tmdbId] [movie|tv]');
  console.log('Example: node scripts/fix-tmdb-media-type.js 293160 tv');
  process.exit(1);
}

if (mediaType !== 'movie' && mediaType !== 'tv') {
  console.log('Media type must be either "movie" or "tv"');
  process.exit(1);
}

async function fixMediaType() {
  try {
    const response = await fetch(`http://localhost:3000/api/tmdb-media-type?tmdbId=${tmdbId}&force=${mediaType}`);
    const result = await response.json();
    
    if (result.forced) {
      console.log(`✅ Successfully forced TMDB ID ${tmdbId} to be ${mediaType}`);
    } else {
      console.log(`❌ Failed to force media type: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Make sure your development server is running on http://localhost:3000');
  }
}

fixMediaType(); 