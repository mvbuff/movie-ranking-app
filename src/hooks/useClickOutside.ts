import { useEffect, useRef, RefObject } from 'react';

interface UseClickOutsideOptions {
  enabled?: boolean;
  onClickOutside: () => void;
  ignoreEscapeKey?: boolean;
}

/**
 * Custom hook that handles click-outside-to-close functionality for modals/popups
 * Optimized for mobile UX while maintaining desktop performance
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  options: UseClickOutsideOptions
): RefObject<T | null> {
  const elementRef = useRef<T>(null);
  const { enabled = true, onClickOutside, ignoreEscapeKey = false } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleInteraction = (event: MouseEvent | TouchEvent) => {
      // Don't close if clicking inside the modal content
      if (elementRef.current && elementRef.current.contains(event.target as Node)) {
        return;
      }

      // Only close if clicking on the backdrop/overlay
      const target = event.target as HTMLElement;
      if (target.classList.contains('modal-backdrop') || 
          target.closest('[data-modal-backdrop]')) {
        event.preventDefault();
        event.stopPropagation();
        onClickOutside();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (!ignoreEscapeKey && event.key === 'Escape') {
        event.preventDefault();
        onClickOutside();
      }
    };

    // Use passive listeners for better performance
    const options: AddEventListenerOptions = { passive: true };

    // Listen for both mouse and touch events to support all devices
    document.addEventListener('mousedown', handleInteraction, options);
    document.addEventListener('touchstart', handleInteraction, options);
    
    if (!ignoreEscapeKey) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      if (!ignoreEscapeKey) {
        document.removeEventListener('keydown', handleEscapeKey);
      }
    };
  }, [enabled, onClickOutside, ignoreEscapeKey]);

  return elementRef;
} 