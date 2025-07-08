'use client';

import { useTmdbUrl } from '@/hooks/useTmdbUrl';
import { ExternalLink } from 'lucide-react';

interface TmdbLinkProps {
  tmdbId: string;
  mediaType?: string; // Optional for backward compatibility
  size?: number;
  className?: string;
}

export default function TmdbLink({ tmdbId, mediaType, size = 12, className = "text-gray-400 hover:text-gray-600" }: TmdbLinkProps) {
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
    >
      <ExternalLink size={size} />
    </a>
  );
} 