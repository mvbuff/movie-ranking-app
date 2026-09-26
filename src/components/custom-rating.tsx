'use client';

import { useState, useEffect } from 'react';
import { letterGrades, modifiers, getScore, getGradeFromScore, LetterGrade, Modifier } from '@/lib/rating-system';

interface CustomRatingInputProps {
  initialScore: number;
  onRatingSubmit: (score: number) => void;
  disabled: boolean;
}

// Rating explanations in Telugu
const ratingExplanations = {
  AB: 'Assalu Bagodhu',
  BB: 'Baguntundhi Bro',
  CB: 'Chala Bagundhi'
};

export default function CustomRatingInput({ initialScore, onRatingSubmit, disabled }: CustomRatingInputProps) {
  const [selectedGrade, setSelectedGrade] = useState<LetterGrade | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(null);

  useEffect(() => {
    const { grade, modifier } = getGradeFromScore(initialScore);
    setSelectedGrade(grade);
    setSelectedModifier(modifier);
  }, [initialScore]);

  const handleRatingUpdate = (grade: LetterGrade | null, modifier: Modifier | null) => {
    if (!grade) {
      onRatingSubmit(0);
      return;
    }
    const newScore = getScore(grade, modifier);
    onRatingSubmit(newScore);
  };
  
  const handleGradeSelect = (grade: LetterGrade) => {
    const newGrade = selectedGrade === grade ? null : grade;
    const newModifier = (newGrade === 'AB' || !newGrade) ? null : selectedModifier;
    
    setSelectedGrade(newGrade);
    setSelectedModifier(newModifier);
    handleRatingUpdate(newGrade, newModifier);
  };

  const handleModifierSelect = (modifier: Modifier) => {
    const newModifier = selectedModifier === modifier ? null : modifier;
    setSelectedModifier(newModifier);
    handleRatingUpdate(selectedGrade, newModifier);
  };

  const getButtonClass = (isActive: boolean, isDisabled: boolean = false) =>
    `flex-1 min-w-0 whitespace-nowrap rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
      isDisabled ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-transparent' :
      isActive ? 'bg-stone-900 text-white border border-stone-900 shadow-sm' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:-translate-y-px'
    }`;
  
  const displayRating = () => {
    if (!selectedGrade) return 'Not Rated';
    if (selectedGrade === 'AB') return 'AB';
    return `${selectedGrade}${selectedModifier || ''}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
         <p className="text-sm text-stone-500">Your Rating:</p>
         <span className="font-bold text-ink text-sm">{displayRating()}</span>
      </div>
      <div className="flex gap-1.5 sm:gap-2">
        {letterGrades.map(grade => (
            <button 
              key={grade} 
              onClick={() => handleGradeSelect(grade)}
              className={getButtonClass(selectedGrade === grade)}
              disabled={disabled}
              title={ratingExplanations[grade]}
            >
              {grade}
            </button>
        ))}
      </div>
      <div className="flex gap-1.5 sm:gap-2">
        {modifiers.map(modifier => {
          const isButtonDisabled = disabled ||
                                   selectedGrade === 'AB' ||
                                   (selectedGrade === 'CB' && modifier === '--');
          return (
            <button 
              key={modifier}
              onClick={() => handleModifierSelect(modifier)}
              className={getButtonClass(selectedModifier === modifier, isButtonDisabled)}
              disabled={isButtonDisabled}
            >
              {modifier}
            </button>
          )
        })}
      </div>
    </div>
  );
} 