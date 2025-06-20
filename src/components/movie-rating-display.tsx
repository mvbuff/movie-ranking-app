'use client';

import { useState, useEffect } from 'react';
import { letterGrades, modifiers, getGradeFromScore, LetterGrade, Modifier } from '@/lib/rating-system';

interface MovieRatingDisplayProps {
  score: number;
}

// Rating explanations in Telugu
const ratingExplanations = {
  AB: 'Assalu Bagodhu',
  BB: 'Baguntundhi Bro',
  CB: 'Chala Bagundhi'
};

export default function MovieRatingDisplay({ score }: MovieRatingDisplayProps) {
  const [selectedGrade, setSelectedGrade] = useState<LetterGrade | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(null);

  useEffect(() => {
    const { grade, modifier } = getGradeFromScore(score);
    setSelectedGrade(grade);
    setSelectedModifier(modifier);
  }, [score]);

  const getButtonClass = (isActive: boolean) => 
    `px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 ${
      isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-400'
    }`;
  
  const displayRating = () => {
    if (!selectedGrade) return 'Not Rated';
    return `${selectedGrade}${selectedModifier || ''}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
         <p className="text-sm text-gray-500">Your Rating:</p>
         <span className="font-bold text-gray-700 text-sm">{displayRating()}</span>
      </div>
      <div className="flex justify-around">
        {letterGrades.map(grade => (
            <button 
              key={grade} 
              className={getButtonClass(selectedGrade === grade)}
              disabled={true}
              title={ratingExplanations[grade]}
            >
              {grade}
            </button>
        ))}
      </div>
      <div className="flex justify-around">
        {modifiers.map(modifier => (
            <button 
              key={modifier}
              className={getButtonClass(selectedModifier === modifier)}
              disabled={true}
            >
              {modifier}
            </button>
        ))}
      </div>
    </div>
  );
} 