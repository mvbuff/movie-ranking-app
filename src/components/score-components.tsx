'use client';

import { useTransition } from 'react';
import { useUser } from '@/context/user-context';
import { calculateUserAggregateScores } from '@/app/actions';

export function Scorecard({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="p-2 text-center bg-gray-100 rounded-md">
        <p className="text-sm font-medium text-gray-400">Not Calculated</p>
      </div>
    );
  }

  const colorClass = score > 7.5 ? 'bg-green-100 text-green-800' : score > 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
  
  return (
    <div className={`p-2 text-center rounded-md ${colorClass}`}>
      <p className="text-xs font-bold uppercase tracking-wider">Friend Score</p>
      <p className="text-2xl font-bold">{score.toFixed(2)}</p>
    </div>
  );
}


export function CalculateScoresButton({ onCalculationComplete }: { onCalculationComplete: () => void }) {
  const { currentUser } = useUser();
  const [isPending, startTransition] = useTransition();

  const handleCalculate = () => {
    if (!currentUser) {
      alert("Please select a user first.");
      return;
    }
    startTransition(async () => {
      const result = await calculateUserAggregateScores(currentUser.id);
      onCalculationComplete();
      alert(result.message);
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