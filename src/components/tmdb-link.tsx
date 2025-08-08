'use client';

import { useTmdbUrl } from '@/hooks/useTmdbUrl';
import { getParentShowTmdbId, generateTmdbUrlWithFallback } from '@/lib/tmdb-utils';
import { ExternalLink } from 'lucide-react';

interface TmdbLinkProps {
  tmdbId: string;
  mediaType?: string; // Optional for backward compatibility
  title?: string; // Optional title for enhanced URL generation
  size?: number;
  className?: string;
}

export default function TmdbLink({ tmdbId, mediaType, title, size = 12, className = "text-gray-400 hover:text-gray-600" }: TmdbLinkProps) {
  // Always call the hook, but use stored media type if available
  const fallbackTmdbUrl = useTmdbUrl(tmdbId);
  
  // Handle season IDs correctly
  let tmdbUrl: string;
  if (mediaType) {
    // If this is a season ID, use enhanced URL generation when title is available
    if (tmdbId.includes('-s')) {
      if (title) {
        // Extract parent show title from season title (e.g., "Modern Family - Season 3" -> "Modern Family")
        const parentShowTitle = title.split(' - ')[0];
        tmdbUrl = generateTmdbUrlWithFallback(tmdbId, mediaType, parentShowTitle);
      } else {
        // Fallback to basic parent show URL
        const parentTmdbId = getParentShowTmdbId(tmdbId);
        tmdbUrl = `https://www.themoviedb.org/tv/${parentTmdbId}`;
      }
    } else {
      tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
    }
  } else {
    tmdbUrl = fallbackTmdbUrl;
  }

  return (
    <a
      href={tmdbUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <ExternalLink size={size} />
    </a>
  );
} 