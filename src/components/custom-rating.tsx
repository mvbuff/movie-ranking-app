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
    
    // If selecting AB, or deselecting the current grade, clear modifier
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
    `px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 ${
      isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
      isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
              onClick={() => handleGradeSelect(grade)}
              className={getButtonClass(selectedGrade === grade)}
              disabled={disabled}
            >
              {grade}
            </button>
        ))}
      </div>
      <div className="flex justify-around">
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