'use client';

import { useTransition } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import { calculateUserRestaurantAggregateScores } from '@/app/actions';

export function RestaurantCalculateScoresButton({ onCalculationComplete, compact = false }: { onCalculationComplete: () => void; compact?: boolean }) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleCalculate = () => {
    if (!currentUser) {
      showToast("Please select a user first.", 'error');
      return;
    }
    startTransition(async () => {
      const result = await calculateUserRestaurantAggregateScores(currentUser.id);
      onCalculationComplete();
      showToast(result.message, 'success');
    });
  };

  const buttonColor = isPending ? 'bg-yellow-500 hover:bg-yellow-600' 
    : !currentUser ? 'bg-gray-400' 
    : 'bg-green-600 hover:bg-green-700';

  const buttonStyle = compact 
    ? `px-4 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed transition-colors ${buttonColor}`
    : `w-full px-6 py-3 text-white font-semibold rounded-lg shadow-md disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ${buttonColor}`;

  return (
    <button
      onClick={handleCalculate}
      disabled={isPending || !currentUser}
      className={`text-white ${buttonStyle}`}
    >
      {isPending ? 'Calculating...' : compact ? 'Calculate' : 'Calculate My Friend Restaurant Scores'}
    </button>
  );
}