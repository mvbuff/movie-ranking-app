'use client';

import { useTmdbUrl } from '@/hooks/useTmdbUrl';
import { generateTmdbUrlWithFallback } from '@/lib/tmdb-utils';

interface MovieTitleLinkProps {
  tmdbId: string;
  title: string;
  year: number;
  mediaType?: string; // Optional for backward compatibility
  tmdbUrl?: string | null; // Optional stored canonical URL
  className?: string;
}

export default function MovieTitleLink({ tmdbId, title, year, mediaType, tmdbUrl: storedTmdbUrl, className }: MovieTitleLinkProps) {
  // Always call the hook, but use stored media type if available
  const fallbackTmdbUrl = useTmdbUrl(tmdbId);
  
  // Use stored URL if available, otherwise generate
  let tmdbUrl: string;
  if (storedTmdbUrl) {
    // Use the canonical URL stored in database (most reliable)
    tmdbUrl = storedTmdbUrl;
  } else if (mediaType) {
    // Fallback to generated URL
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