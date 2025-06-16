'use client';

import { useTransition } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import { calculateUserAggregateScores } from '@/app/actions';
import { getRatingDisplay } from '@/lib/rating-system';

export function Scorecard({ score }: { score: number | null }) {
  const displayValue = getRatingDisplay(score);
  
  const colorClass = score === null ? 'bg-gray-100 text-gray-400' 
    : score > 7.5 ? 'bg-green-100 text-green-800' 
    : score > 4 ? 'bg-yellow-100 text-yellow-800' 
    : 'bg-red-100 text-red-800';
  
  return (
    <div className={`p-2 text-center rounded-md ${colorClass}`}>
      <p className="text-xs font-bold uppercase tracking-wider">Friend Score</p>
      <p className="text-2xl font-bold">{displayValue}</p>
    </div>
  );
}


export function CalculateScoresButton({ onCalculationComplete }: { onCalculationComplete: () => void }) {
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

  return (
    <button
      onClick={handleCalculate}
      disabled={isPending || !currentUser}
      className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300"
    >
      {isPending ? 'Calculating...' : 'Calculate My Friend Scores'}
    </button>
  );
} 