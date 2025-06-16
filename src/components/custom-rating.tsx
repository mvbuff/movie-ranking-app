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

  // Set initial state from score
  useEffect(() => {
    // This logic would need to be built out to show the initial selected buttons
    // based on the initialScore prop. For now, it's a placeholder.
  }, [initialScore]);

  const handleRatingUpdate = (grade: LetterGrade | null, modifier: Modifier | null) => {
    if (!grade) {
      // If no grade is selected, there's no rating. Score is 0.
      onRatingSubmit(0);
      return;
    }
    // If a grade is selected but no modifier, default the modifier to '+' for calculation.
    const effectiveModifier = modifier || '+';
    const newScore = getScore(grade, effectiveModifier);
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
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;
  
  return (
    <div className="space-y-2">
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