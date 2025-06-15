'use client';

import { useState } from 'react';
import MovieSearch from "@/components/movie-search";
import MovieList from "@/components/movie-list";
import UserSwitcher from "@/components/user-switcher";
import FriendList from "@/components/friend-list";
import FilterControls from '@/components/filter-controls';
import type { Category } from '@/components/filter-controls';

type FilterCategory = Category | 'ALL';

export default function Home() {
  const [refreshTimestamp, setRefreshTimestamp] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [scoreThreshold, setScoreThreshold] = useState<number>(0);

  const triggerDataRefresh = () => {
    setRefreshTimestamp(new Date().getTime());
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
            Movie Ranking
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Your personalized movie and series leaderboard.
          </p>
        </div>
        <UserSwitcher />
        <FriendList onCalculationComplete={triggerDataRefresh} />
        <MovieSearch onItemAdded={triggerDataRefresh} />
      </div>
      <FilterControls 
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        scoreThreshold={scoreThreshold}
        onScoreThresholdChange={setScoreThreshold}
      />
      <MovieList
        calculationTimestamp={refreshTimestamp}
        categoryFilter={activeCategory}
        scoreThreshold={scoreThreshold}
      />
    </main>
  );
}
