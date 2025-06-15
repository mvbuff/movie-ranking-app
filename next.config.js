/** @type {import('next').NextConfig} */

// Note: If your repository name is different from "movie-ranking-app",
// you'll need to update the basePath value to match your repository name.
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/w500/**',
      },
    ],
  },
};

module.exports = nextConfig; 