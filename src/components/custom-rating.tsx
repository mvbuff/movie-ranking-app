'use client';

import { useState, useEffect } from 'react';
import { letterGrades, modifiers, getScore, LetterGrade, Modifier } from '@/lib/rating-system';

interface CustomRatingInputProps {
  initialScore: number;
  onRatingSubmit: (score: number) => void;
  disabled: boolean;
}

export default function CustomRatingInput({ initialScore, onRatingSubmit, disabled }: CustomRatingInputProps) {
  const [selectedGrade, setSelectedGrade] = useState<LetterGrade | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(null);

  useEffect(() => {
    // This is a simple reverse-lookup to set the initial state.
    // In a real app, this might be more complex if scores can be floats.
    // For now, we find the first match.
    if (initialScore > 0) {
        // This part would need to be built out if we need to pre-load ratings
    }
  }, [initialScore]);

  const handleSelect = (grade: LetterGrade, modifier: Modifier) => {
    if (disabled) return;
    const newScore = getScore(grade, modifier);
    onRatingSubmit(newScore);
    // Note: The parent component's optimistic update will handle the visual feedback.
    setSelectedGrade(grade);
    setSelectedModifier(modifier);
  };

  const getButtonClass = (isActive: boolean) => 
    `px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-lg'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-around">
        {letterGrades.map(grade => (
            <button 
              key={grade} 
              onClick={() => {
                const modifier = selectedModifier || '+'; // Default to '+' if no modifier is selected
                setSelectedGrade(grade);
                handleSelect(grade, modifier);
              }}
              className={getButtonClass(selectedGrade === grade)}
              disabled={disabled}
            >
              {grade}
            </button>
        ))}
      </div>
      <div className="flex justify-around">
        {modifiers.map(modifier => (
            <button 
              key={modifier}
              onClick={() => {
                  const grade = selectedGrade || 'BB'; // Default to 'BB' if no grade is selected
                  setSelectedModifier(modifier);
                  handleSelect(grade, modifier);
              }}
              className={getButtonClass(selectedModifier === modifier)}
              disabled={disabled}
            >
              {modifier}
            </button>
        ))}
      </div>
    </div>
  );
} 