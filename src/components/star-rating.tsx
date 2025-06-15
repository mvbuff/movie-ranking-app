'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  initialRating: number; // The rating from the database (0 if not rated)
  onRatingSubmit: (rating: number) => void;
  disabled?: boolean;
}

export default function StarRating({ initialRating, onRatingSubmit, disabled = false }: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  // Sync with external changes
  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleClick = (rate: number) => {
    if (disabled) return;
    
    // If clicking the same star again, reset to 0
    const newRating = rate === rating ? 0 : rate;
    
    setRating(newRating);
    onRatingSubmit(newRating);
  };

  return (
    <div className="flex items-center">
      {[...Array(10)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverRating || rating);
        
        return (
          <Star
            key={starValue}
            size={20}
            className={`cursor-pointer transition-colors duration-200 ${
              isFilled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:text-yellow-300'}`}
            onMouseEnter={() => !disabled && setHoverRating(starValue)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            onClick={() => handleClick(starValue)}
          />
        );
      })}
    </div>
  );
} 