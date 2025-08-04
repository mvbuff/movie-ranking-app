'use client';

import { useTransition } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import { calculateUserAggregateScores } from '@/app/actions';
import { getRatingDisplay } from '@/lib/rating-system';

export function Scorecard({ score, label = "Friend Score", compact = false }: { score: number | null; label?: string; compact?: boolean }) {
  const displayValue = getRatingDisplay(score);
  
  const colorClass = score === null ? 'bg-gray-100 text-gray-500' 
    : score > 7.5 ? 'bg-green-100 text-green-800' 
    : score > 5 ? 'bg-yellow-100 text-yellow-800' 
    : 'bg-red-100 text-red-800';
  
  return (
    <div className={`${compact ? 'p-1' : 'p-2'} text-center rounded-md ${colorClass}`}>
        <p className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase tracking-wider`}>{label}</p>
        <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold`}>{displayValue}</p>
    </div>
  );
}


export function CalculateScoresButton({ onCalculationComplete, compact = false }: { onCalculationComplete: () => void; compact?: boolean }) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleCalculate = () => {
    if (!currentUser) {
      showToast("Please select a user first.", 'error');
      return;
    }
    startTransition(async () => {
      const result = await calculateUserAggregateScores(currentUser.id);
      onCalculationComplete();
      showToast(result.message, 'success');
    });
  };

  const buttonColor = isPending ? 'bg-yellow-500 hover:bg-yellow-600' 
    : !currentUser ? 'bg-gray-400' 
    : 'bg-indigo-600 hover:bg-indigo-700';

  const buttonStyle = compact 
    ? `px-4 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed transition-colors ${buttonColor}`
    : `w-full px-6 py-3 text-white font-semibold rounded-lg shadow-md disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ${buttonColor}`;

  return (
    <button
      onClick={handleCalculate}
      disabled={isPending || !currentUser}
      className={`text-white ${buttonStyle}`}
    >
      {isPending ? 'Calculating...' : compact ? 'Calculate' : 'Calculate My Friend Scores'}
    </button>
  );
} 