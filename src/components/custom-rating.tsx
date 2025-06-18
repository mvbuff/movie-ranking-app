'use client';

import { useState, useEffect } from 'react';
import { letterGrades, modifiers, getScore, getGradeFromScore, LetterGrade, Modifier } from '@/lib/rating-system';

interface CustomRatingInputProps {
  initialScore: number;
  onRatingSubmit: (score: number) => void;
  disabled: boolean;
}

export default function CustomRatingInput({ initialScore, onRatingSubmit, disabled }: CustomRatingInputProps) {
  const [selectedGrade, setSelectedGrade] = useState<LetterGrade | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(null);

  // Set initial state from score
  useEffect(() => {
    const { grade, modifier } = getGradeFromScore(initialScore);
    setSelectedGrade(grade);
    setSelectedModifier(modifier);
  }, [initialScore]);

  const handleRatingUpdate = (grade: LetterGrade | null, modifier: Modifier | null) => {
    if (!grade) {
      // If no grade is selected, there's no rating. Score is 0.
      onRatingSubmit(0);
      return;
    }
    const newScore = getScore(grade, modifier);
    onRatingSubmit(newScore);
  };
  
  const handleGradeSelect = (grade: LetterGrade) => {
    const newGrade = selectedGrade === grade ? null : grade;
    setSelectedGrade(newGrade);
    handleRatingUpdate(newGrade, selectedModifier);
  };

  const handleModifierSelect = (modifier: Modifier) => {
    const newModifier = selectedModifier === modifier ? null : modifier;
    setSelectedModifier(newModifier);
    handleRatingUpdate(selectedGrade, newModifier);
  };

  const getButtonClass = (isActive: boolean) => 
    `px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-lg'
        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
    }`;
  
  const displayRating = () => {
    if (!selectedGrade) return 'Not Rated';
    return `${selectedGrade}${selectedModifier || ''}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
         <p className="text-sm text-slate-400">Your Rating:</p>
         <span className="font-bold text-slate-100 text-sm">{displayRating()}</span>
      </div>
      <div className="flex justify-around">
        {letterGrades.map(grade => (
            <button 
              key={grade} 
              onClick={() => handleGradeSelect(grade)}
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
              onClick={() => handleModifierSelect(modifier)}
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