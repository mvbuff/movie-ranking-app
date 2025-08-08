'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import MovieList from '@/components/movie-list';
import MovieSearch from '@/components/movie-search';
import FilterControls from '@/components/filter-controls';
import FriendList from '@/components/friend-list';
import ReviewSearchResults from '@/components/review-search-results';
import ActivityFeedPopup from '@/components/activity-feed-popup';
import { useUser } from '@/context/user-context';
import { calculateUserAggregateScores } from '@/app/actions';
import { Maximize2, Minimize2 } from 'lucide-react';

type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL' | 'WATCHLIST' | 'YET_TO_RATE';

export default function Home() {
  const { status: sessionStatus } = useSession();
  const { currentUser, isAdmin } = useUser();
  const [refreshTimestamp, setRefreshTimestamp] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [scoreThreshold, setScoreThreshold] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewSearchTerm, setReviewSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'aggregateScore' | 'currentUserRating' | 'title' | 'addedDate' | 'addedDateThenScore' | 'releaseYearThenScore'>('addedDateThenScore');
  const [isMoviesFullWidth, setIsMoviesFullWidth] = useState(true);
  const [showActivityPopup, setShowActivityPopup] = useState(false);

  // Use ref to prevent auto-calculation from running multiple times
  const autoCalculationRef = useRef<{ hasRun: boolean; lastUserId: string | null }>({
    hasRun: false,
    lastUserId: null
  });

  const isAuthenticated = sessionStatus === 'authenticated';
  const isLoading = sessionStatus === 'loading';

  const triggerDataRefresh = useCallback(() => {
    setRefreshTimestamp(Date.now());
  }, []);

  // Auto-calculate when page loads for authenticated users (improved logic)
  useEffect(() => {
    if (isAuthenticated && currentUser && !isLoading) {
      // Only run auto-calculation once per user session, not on every refresh
      const shouldRunAutoCalculation = 
        !autoCalculationRef.current.hasRun || 
        autoCalculationRef.current.lastUserId !== currentUser.id;

      if (shouldRunAutoCalculation) {
        const autoCalculate = async () => {
          try {
            await calculateUserAggregateScores(currentUser.id);
            autoCalculationRef.current.hasRun = true;
            autoCalculationRef.current.lastUserId = currentUser.id;
            setRefreshTimestamp(Date.now());
          } catch (error) {
            console.error('Auto-calculation failed:', error);
          }
        };

        // Small delay to ensure user context is ready
        const timeoutId = setTimeout(autoCalculate, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isAuthenticated, isLoading]); // Removed currentUser to prevent double refresh

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
          Movie Ranking
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
          Your personalized movie and series leaderboard.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          <Link 
            href="/food"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            🍽️ Restaurant Ranking (Beta)
          </Link>
          <Link 
            href="/forum"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            💬 Discussion Forum
          </Link>
        </div>
        {!isAuthenticated && !isLoading && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
            <p className="text-blue-800 mb-3">
              You&apos;re viewing in read-only mode. 
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => signIn()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Sign In
              </button>
              <Link
                href="/register"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile User Controls - Only visible on mobile */}
      {isAuthenticated && (
        <div className="lg:hidden mb-6 p-4 bg-gray-50 rounded-lg shadow-sm border">
          <div className="flex flex-col gap-4">
            <div className="flex-grow">
              {currentUser && <p className="text-sm text-gray-500">Acting as: <span className="font-bold">{currentUser.name}</span></p>}
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Link href="/admin" className="flex-1 px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 text-center">
                  Admin Panel
                </Link>
              )}
              <button
                onClick={() => signOut()}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 text-center"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Controls & Filters */}
        <div className="lg:col-span-2 space-y-8">
          {isAuthenticated && (
            <>
              <MovieSearch onItemAdded={triggerDataRefresh} />
            </>
          )}
          
          <FilterControls
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            scoreThreshold={scoreThreshold}
            onScoreThresholdChange={setScoreThreshold}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            reviewSearchTerm={reviewSearchTerm}
            onReviewSearchChange={setReviewSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            readOnlyMode={!isAuthenticated}
            setShowActivityPopup={setShowActivityPopup}
          />

          {/* Review Search Results - Show when there's a search term */}
          {reviewSearchTerm.trim() && (
            <div className="mt-12">
              <ReviewSearchResults searchTerm={reviewSearchTerm} />
            </div>
          )}

          {/* Movie List - Only show here if NOT in full-width mode */}
          {!isMoviesFullWidth && (
            <div className="mt-12">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Your Movie Rankings</h2>
                <button
                  onClick={() => setIsMoviesFullWidth(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  title="Expand movies to full width"
                >
                  <Maximize2 size={16} />
                  Full Width
                </button>
              </div>
              <MovieList 
                calculationTimestamp={refreshTimestamp}
                categoryFilter={activeCategory}
                scoreThreshold={scoreThreshold}
                searchTerm={searchTerm}
                sortBy={sortBy}
                readOnlyMode={!isAuthenticated}
              />
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {isAuthenticated && (
            <>
              {/* Desktop User Controls - Hidden on mobile */}
              <div className="hidden lg:block p-4 bg-gray-50 rounded-lg shadow-sm border">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex-grow">
                    {currentUser && <p className="text-sm text-gray-500">Acting as: <span className="font-bold">{currentUser.name}</span></p>}
                  </div>
                  <div className="flex flex-col items-stretch gap-2 flex-shrink-0">
                    {isAdmin && (
                      <Link href="/admin" className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 w-full text-center">
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => signOut()}
                      className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 w-full text-center"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
              
              <FriendList onCalculationComplete={triggerDataRefresh} />
            </>
          )}
        </div>
      </div>

      {/* Full-Width Movie List - Show when in full-width mode */}
      {isMoviesFullWidth && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Movie Rankings</h2>
            <button
              onClick={() => setIsMoviesFullWidth(false)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              title="Minimize movies"
            >
              <Minimize2 size={16} />
              Minimize
            </button>
          </div>
          <MovieList 
            calculationTimestamp={refreshTimestamp}
            categoryFilter={activeCategory}
            scoreThreshold={scoreThreshold}
            searchTerm={searchTerm}
            sortBy={sortBy}
            readOnlyMode={!isAuthenticated}
          />
        </div>
      )}

      {/* Activity Feed Popup */}
      <ActivityFeedPopup 
        isOpen={showActivityPopup}
        onClose={() => setShowActivityPopup(false)} 
      />
    </main>
  );
}
