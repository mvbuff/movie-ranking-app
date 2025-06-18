'use client';

import { useState, useEffect } from 'react';
import { letterGrades, modifiers, getScore, getGradeFromScore, LetterGrade, Modifier } from '@/lib/rating-system';

interface CustomRatingInputProps {
  // A callback to inform the parent of the current selection
  onRatingChange: (grade: LetterGrade | null, modifier: Modifier | null) => void;
  disabled: boolean;
}

export default function CustomRatingInput({ onRatingChange, disabled }: CustomRatingInputProps) {
  const [selectedGrade, setSelectedGrade] = useState<LetterGrade | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(null);

  useEffect(() => {
    // Inform the parent component whenever the selection changes.
    onRatingChange(selectedGrade, selectedModifier);
  }, [selectedGrade, selectedModifier, onRatingChange]);
  
  const handleGradeSelect = (grade: LetterGrade) => {
    const newGrade = selectedGrade === grade ? null : grade;
    const newModifier = (newGrade === 'AB' || !newGrade) ? null : selectedModifier;
    
    setSelectedGrade(newGrade);
    setSelectedModifier(newModifier);
  };

  const handleModifierSelect = (modifier: Modifier) => {
    const newModifier = selectedModifier === modifier ? null : modifier;
    setSelectedModifier(newModifier);
  };

  const getButtonClass = (isActive: boolean, isDisabled: boolean = false) => 
    `px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 ${
      isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
      isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;
  
  const displayRating = () => {
    if (!selectedGrade) return 'Not Rated';
    if (selectedGrade === 'AB') return 'AB';
    return `${selectedGrade}${selectedModifier || ''}`;
  };

  const areModifiersDisabled = disabled || selectedGrade === 'AB';

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