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
import ContributionPopup from '@/components/contribution-popup';
import { useUser } from '@/context/user-context';
import { calculateUserAggregateScores } from '@/app/actions';
import {
  Maximize2,
  Minimize2,
  Clapperboard,
  UtensilsCrossed,
  MessagesSquare,
  BarChart3,
  Lock,
} from 'lucide-react';

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
  const [sortBy, setSortBy] = useState<'aggregateScore' | 'currentUserRating' | 'title' | 'addedDate' | 'addedDateThenScore' | 'releaseYearThenScore' | 'mostFeedback'>('addedDateThenScore');
  const [isMoviesFullWidth, setIsMoviesFullWidth] = useState(true);
  const [showActivityPopup, setShowActivityPopup] = useState(false);
  const [showContributionPopup, setShowContributionPopup] = useState(false);

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
  }, [isAuthenticated, isLoading, currentUser]); // Added currentUser back to dependencies

  if (isLoading) {
    return (
      <main className="min-h-screen bg-paper p-4 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-stone-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink p-4 sm:p-8">
      {/* Hero */}
      <div className="relative text-center mb-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(234, 88, 12, 0.10), transparent 70%), radial-gradient(ellipse 35% 30% at 85% 20%, rgba(120, 113, 108, 0.16), transparent 70%)',
          }}
        />
        <span className="chip animate-rise inline-flex items-center gap-1.5">
          <Clapperboard size={14} />
          Community rankings
        </span>
        <h1
          className="animate-rise font-display mt-4 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink"
          style={{ animationDelay: '80ms' }}
        >
          Movie Ranking
        </h1>
        <p
          className="animate-rise mt-4 max-w-2xl mx-auto text-lg text-stone-500"
          style={{ animationDelay: '160ms' }}
        >
          Your personalized movie and series leaderboard.
        </p>
        <div
          className="animate-rise mt-6 flex flex-wrap gap-3 justify-center"
          style={{ animationDelay: '240ms' }}
        >
          <Link
            href="/food"
            className="btn-primary inline-flex items-center gap-2"
          >
            <UtensilsCrossed size={16} />
            Restaurant Ranking (Beta)
          </Link>
          <Link
            href="/forum"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <MessagesSquare size={16} />
            Discussion Forum
          </Link>
          <button
            onClick={() => setShowContributionPopup(true)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <BarChart3 size={16} />
            Contribution
          </button>
        </div>
        {!isAuthenticated && !isLoading && (
          <div
            className="card animate-rise mt-8 p-6 max-w-md mx-auto"
            style={{ animationDelay: '320ms' }}
          >
            <p className="text-stone-600 mb-4 flex items-center justify-center gap-2">
              <Lock size={16} />
              You&apos;re viewing in read-only mode.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => signIn()}
                className="btn-primary text-sm"
              >
                Sign In
              </button>
              <Link
                href="/register"
                className="btn-secondary text-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile User Controls - Only visible on mobile */}
      {isAuthenticated && (
        <div className="lg:hidden mb-6 card p-4">
          <div className="flex flex-col gap-4">
            <div className="flex-grow">
              {currentUser && <p className="text-sm text-stone-500">Acting as: <span className="font-bold text-ink">{currentUser.name}</span></p>}
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Link href="/admin" className="btn-secondary flex-1 text-sm text-center">
                  Admin Panel
                </Link>
              )}
              <button
                onClick={() => signOut()}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors text-center"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-rise" style={{ animationDelay: '360ms' }}>
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
                <h2 className="section-title">Your Movie Rankings</h2>
                <button
                  onClick={() => setIsMoviesFullWidth(true)}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
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
              <div className="hidden lg:block card p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex-grow">
                    {currentUser && <p className="text-sm text-stone-500">Acting as: <span className="font-bold text-ink">{currentUser.name}</span></p>}
                  </div>
                  <div className="flex flex-col items-stretch gap-2 flex-shrink-0">
                    {isAdmin && (
                      <Link href="/admin" className="btn-secondary text-sm w-full text-center">
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => signOut()}
                      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors w-full text-center"
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
        <div className="mt-8 animate-rise">
          <div className="flex justify-between items-center mb-4">
            <h2 className="section-title">Your Movie Rankings</h2>
            <button
              onClick={() => setIsMoviesFullWidth(false)}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
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

      {/* Contribution Popup */}
      <ContributionPopup 
        isOpen={showContributionPopup}
        onClose={() => setShowContributionPopup(false)} 
      />
    </main>
  );
}
