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
import { Maximize2, Minimize2, ArrowLeft } from 'lucide-react';

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
      <main className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Link 
            href="/"
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Back to Movies"
          >
            <ArrowLeft size={18} />
            Movies
          </Link>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
            Restaurant Ranking
          </h1>
        </div>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
          Discover and rate restaurants with separate ratings for veg and non-veg food.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          <Link 
            href="/forum"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            💬 Discussion Forum
          </Link>
          <button
            onClick={() => setShowActivityPopup(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            📊 Activity Feed
          </button>
        </div>
        
        {!isAuthenticated && !isLoading && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
            <p className="text-green-800 mb-3">
              You&apos;re viewing in read-only mode. 
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => signIn()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
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
        {/* Left Column - Controls & Search */}
        <div className="lg:col-span-2 space-y-8">
          {isAuthenticated && (
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Tab Headers */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('google-places')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'google-places'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🔍 Search (Google Places)
                  </button>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'manual'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    ✏️ Add Manually
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
                <h2 className="text-2xl font-bold text-gray-900">Restaurant Rankings</h2>
                <button
                  onClick={() => setIsRestaurantsFullWidth(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
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
              
              <RestaurantFriendList onCalculationComplete={triggerDataRefresh} />
            </>
          )}
          
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Info</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">🌱</span>
                <span>Rate vegetarian food separately</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-red-100 rounded flex items-center justify-center">🍖</span>
                <span>Rate non-vegetarian food separately</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">🗺️</span>
                <span>Add Google Maps links for easy navigation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Restaurant List - Show when in full-width mode */}
      {isRestaurantsFullWidth && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Restaurant Rankings</h2>
            <button
              onClick={() => setIsRestaurantsFullWidth(false)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
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