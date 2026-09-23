'use client';

import { useState, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import RestaurantList from '@/components/restaurant-list';
import RestaurantSearch from '@/components/restaurant-search';
import GooglePlacesRestaurantSearch from '@/components/google-places-restaurant-search';
import RestaurantFriendList from '@/components/restaurant-friend-list';
import RestaurantFilterControls, { DietaryFilter, RestaurantSortKey } from '@/components/restaurant-filter-controls';
import ActivityFeedPopup from '@/components/activity-feed-popup';
import { useUser } from '@/context/user-context';
import {
  Maximize2,
  Minimize2,
  ArrowLeft,
  UtensilsCrossed,
  MessagesSquare,
  BarChart3,
  Lock,
  Search,
  Pencil,
  Leaf,
  Drumstick,
  Map,
} from 'lucide-react';

export default function FoodPage() {
  const { status: sessionStatus } = useSession();
  const { currentUser, isAdmin } = useUser();
  const [refreshTimestamp, setRefreshTimestamp] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<DietaryFilter>('ALL');
  const [sortBy, setSortBy] = useState<RestaurantSortKey>('addedDate');
  const [vegScoreThreshold, setVegScoreThreshold] = useState(3);
  const [nonVegScoreThreshold, setNonVegScoreThreshold] = useState(3);
  const [ignoreNonVegForVeg, setIgnoreNonVegForVeg] = useState(false);
  const [ignoreVegForNonVeg, setIgnoreVegForNonVeg] = useState(false);
  const [isRestaurantsFullWidth, setIsRestaurantsFullWidth] = useState(true);
  const [showActivityPopup, setShowActivityPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'google-places'>('google-places');

  const isAuthenticated = sessionStatus === 'authenticated';
  const isLoading = sessionStatus === 'loading';

  const triggerDataRefresh = useCallback(() => {
    setRefreshTimestamp(Date.now());
  }, []);

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
      {/* Header */}
      <div className="relative text-center mb-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(234, 88, 12, 0.10), transparent 70%), radial-gradient(ellipse 35% 30% at 15% 20%, rgba(120, 113, 108, 0.16), transparent 70%)',
          }}
        />
        <span className="chip animate-rise inline-flex items-center gap-1.5">
          <UtensilsCrossed size={14} />
          Eat with confidence
        </span>
        <div
          className="animate-rise flex flex-wrap items-center justify-center gap-4 mt-4 mb-4"
          style={{ animationDelay: '80ms' }}
        >
          <Link
            href="/"
            className="btn-secondary inline-flex items-center gap-2 text-sm"
            title="Back to Movies"
          >
            <ArrowLeft size={18} />
            Movies
          </Link>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink">
            Restaurant Ranking
          </h1>
        </div>
        <p
          className="animate-rise mt-4 max-w-2xl mx-auto text-lg text-stone-500"
          style={{ animationDelay: '160ms' }}
        >
          Discover and rate restaurants with separate ratings for veg and non-veg food.
        </p>
        <div
          className="animate-rise mt-6 flex flex-wrap gap-3 justify-center"
          style={{ animationDelay: '240ms' }}
        >
          <Link
            href="/forum"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <MessagesSquare size={16} />
            Discussion Forum
          </Link>
          <button
            onClick={() => setShowActivityPopup(true)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <BarChart3 size={16} />
            Activity Feed
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
        {/* Left Column - Controls & Search */}
        <div className="lg:col-span-2 space-y-8">
          {isAuthenticated && (
            <div className="card overflow-hidden">
              {/* Tab Headers */}
              <div className="border-b border-stone-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('google-places')}
                    className={`inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'google-places'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <Search size={16} />
                    Search (Google Places)
                  </button>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className={`inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'manual'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <Pencil size={16} />
                    Add Manually
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'google-places' && (
                  <GooglePlacesRestaurantSearch onRestaurantAdded={triggerDataRefresh} />
                )}
                {activeTab === 'manual' && (
                  <RestaurantSearch onItemAdded={triggerDataRefresh} />
                )}
              </div>
            </div>
          )}

          {/* Enhanced Filter Controls */}
          <RestaurantFilterControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            cuisineFilter={cuisineFilter}
            onCuisineFilterChange={setCuisineFilter}
            locationFilter={locationFilter}
            onLocationFilterChange={setLocationFilter}
            dietaryFilter={dietaryFilter}
            onDietaryFilterChange={setDietaryFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            vegScoreThreshold={vegScoreThreshold}
            onVegScoreThresholdChange={setVegScoreThreshold}
            nonVegScoreThreshold={nonVegScoreThreshold}
            onNonVegScoreThresholdChange={setNonVegScoreThreshold}
            ignoreNonVegForVeg={ignoreNonVegForVeg}
            onIgnoreNonVegForVegChange={setIgnoreNonVegForVeg}
            ignoreVegForNonVeg={ignoreVegForNonVeg}
            onIgnoreVegForNonVegChange={setIgnoreVegForNonVeg}
            readOnlyMode={!isAuthenticated}
          />

          {/* Restaurant List - Only show here if NOT in full-width mode */}
          {!isRestaurantsFullWidth && (
            <div className="mt-12">
              <div className="flex justify-between items-center mb-4">
                <h2 className="section-title">Restaurant Rankings</h2>
                <button
                  onClick={() => setIsRestaurantsFullWidth(true)}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                  title="Expand restaurants to full width"
                >
                  <Maximize2 size={16} />
                  Full Width
                </button>
              </div>
              <RestaurantList
                searchTerm={searchTerm}
                cuisineFilter={cuisineFilter}
                locationFilter={locationFilter}
                dietaryFilter={dietaryFilter}
                sortBy={sortBy}
                vegScoreThreshold={vegScoreThreshold}
                nonVegScoreThreshold={nonVegScoreThreshold}
                ignoreNonVegForVeg={ignoreNonVegForVeg}
                ignoreVegForNonVeg={ignoreVegForNonVeg}
                readOnlyMode={!isAuthenticated}
                refreshTimestamp={refreshTimestamp}
                calculationTimestamp={refreshTimestamp}
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

              <RestaurantFriendList onCalculationComplete={triggerDataRefresh} />
            </>
          )}

          {/* Quick Stats */}
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-ink mb-4">Quick Info</h3>
            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center shrink-0">
                  <Leaf size={16} />
                </span>
                <span>Rate vegetarian food separately</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-red-100 text-red-700 rounded-lg flex items-center justify-center shrink-0">
                  <Drumstick size={16} />
                </span>
                <span>Rate non-vegetarian food separately</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center shrink-0">
                  <Map size={16} />
                </span>
                <span>Add Google Maps links for easy navigation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Restaurant List - Show when in full-width mode */}
      {isRestaurantsFullWidth && (
        <div className="mt-8 animate-rise">
          <div className="flex justify-between items-center mb-4">
            <h2 className="section-title">Restaurant Rankings</h2>
            <button
              onClick={() => setIsRestaurantsFullWidth(false)}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
              title="Minimize restaurants"
            >
              <Minimize2 size={16} />
              Minimize
            </button>
          </div>
          <RestaurantList
            searchTerm={searchTerm}
            cuisineFilter={cuisineFilter}
            locationFilter={locationFilter}
            dietaryFilter={dietaryFilter}
            sortBy={sortBy}
            vegScoreThreshold={vegScoreThreshold}
            nonVegScoreThreshold={nonVegScoreThreshold}
            ignoreNonVegForVeg={ignoreNonVegForVeg}
            ignoreVegForNonVeg={ignoreVegForNonVeg}
            readOnlyMode={!isAuthenticated}
            refreshTimestamp={refreshTimestamp}
            calculationTimestamp={refreshTimestamp}
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
