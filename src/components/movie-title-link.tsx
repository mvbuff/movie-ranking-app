'use client';

import { useTmdbUrl } from '@/hooks/useTmdbUrl';

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
  const tmdbUrl = mediaType 
    ? `https://www.themoviedb.org/${mediaType}/${tmdbId}`
    : fallbackTmdbUrl;

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