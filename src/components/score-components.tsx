'use client';

import { useTransition } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import { calculateUserAggregateScores } from '@/app/actions';
import { getRatingDisplay } from '@/lib/rating-system';

export function Scorecard({ score, label = "Friend Score" }: { score: number | null; label?: string }) {
  const displayValue = getRatingDisplay(score);
  
  const colorClass = score === null ? 'bg-gray-100 text-gray-500' 
    : score > 7.5 ? 'bg-green-100 text-green-800' 
    : score > 5 ? 'bg-yellow-100 text-yellow-800' 
    : 'bg-red-100 text-red-800';
  
  return (
    <div className={`p-1 text-center rounded-md ${colorClass}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold">{displayValue}</p>
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

  const buttonColor = isPending ? 'bg-yellow-500 hover:bg-yellow-600' 
    : !currentUser ? 'bg-gray-400' 
    : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <button
      onClick={handleCalculate}
      disabled={isPending || !currentUser}
      className={`w-full px-6 py-3 text-white font-semibold rounded-lg shadow-md disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ${buttonColor}`}
    >
      {isPending ? 'Calculating...' : 'Calculate My Friend Scores'}
    </button>
  );
} 