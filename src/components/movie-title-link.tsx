'use client';

import { useTmdbUrl } from '@/hooks/useTmdbUrl';
import { generateTmdbUrlWithFallback } from '@/lib/tmdb-utils';

interface MovieTitleLinkProps {
  tmdbId: string;
  title: string;
  year: number;
  mediaType?: string; // Optional for backward compatibility
  className?: string;
}

export default function MovieTitleLink({ tmdbId, title, year, mediaType, className }: MovieTitleLinkProps) {
  // Always call the hook, but use stored media type if available
  const fallbackTmdbUrl = useTmdbUrl(tmdbId);
  
  // Handle season IDs correctly
  let tmdbUrl: string;
  if (mediaType) {
    // If this is a season ID, use enhanced URL generation with show title
    if (tmdbId.includes('-s')) {
      // Extract parent show title from season title (e.g., "Modern Family - Season 3" -> "Modern Family")
      const parentShowTitle = title.split(' - ')[0];
      tmdbUrl = generateTmdbUrlWithFallback(tmdbId, mediaType, parentShowTitle);
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
      title={`${title} (${year > 0 ? year : 'N/A'})`}
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
        hyphens: 'auto'
      }}
    >
      {title} ({year > 0 ? year : 'N/A'})
    </a>
  );
} 