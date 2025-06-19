'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/context/toast-context';
import { useUser } from '@/context/user-context';

interface Movie {
  id: string;
  title: string;
  year: number;
}

interface ForumCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isMovieLink: boolean;
  movie?: Movie;
  _count: {
    threads: number;
  };
}

interface Author {
  id: string;
  name: string;
}

interface ForumThread {
  id: string;
  title: string;
  isSticky: boolean;
  isLocked: boolean;
  views: number;
  createdAt: string;
  author: Author;
  category: {
    id: string;
    name: string;
    color?: string;
  };
  _count: {
    posts: number;
  };
  posts: Array<{
    id: string;
    createdAt: string;
    author: Author;
  }>;
}

function ForumPageContent() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { currentUser, isAdmin } = useUser();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [deletingThread, setDeletingThread] = useState<string | null>(null);
  const [newThreadData, setNewThreadData] = useState({
    title: '',
    content: '',
    categoryId: ''
  });

  // Get movie context from URL parameters
  const movieId = searchParams.get('movie');
  const movieTitle = searchParams.get('title');

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/forum/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        
        // If no categories exist and user is authenticated, prompt to seed
        if (data.length === 0 && session) {
          showToast('Forum needs to be initialized. Click "Seed Forum" to add default categories.', 'info');
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      showToast('Failed to load forum categories', 'error');
    }
  };

  const fetchThreads = async (categoryId?: string) => {
    try {
      const url = categoryId 
        ? `/api/forum/threads?categoryId=${categoryId}` 
        : '/api/forum/threads';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setThreads(data);
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error);
      showToast('Failed to load forum threads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    fetchThreads(categoryId || undefined);
  };

  useEffect(() => {
    fetchCategories();
    fetchThreads();
    
    // If coming from a movie context, suggest creating a thread about that movie
    if (movieId && movieTitle && session) {
      setNewThreadData(prev => ({
        ...prev,
        title: `Discussion: ${decodeURIComponent(movieTitle)}`,
        content: `What did you think about ${decodeURIComponent(movieTitle)}? Share your thoughts, analysis, and opinions!\n\n`,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, movieTitle, session]);

  const createThread = async () => {
    if (!session || !currentUser) {
      showToast('Please sign in to create threads', 'error');
      return;
    }

    if (categories.length === 0) {
      showToast('Please initialize the forum first by clicking "Seed Forum"', 'error');
      return;
    }

    if (!newThreadData.title || !newThreadData.content || !newThreadData.categoryId) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      const response = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newThreadData,
          userId: currentUser.id
        })
      });

      if (response.ok) {
        showToast('Thread created successfully!', 'success');
        setShowNewThreadForm(false);
        setNewThreadData({ title: '', content: '', categoryId: '' });
        fetchThreads(selectedCategory || undefined);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create thread', 'error');
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
      showToast('Failed to create thread', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const deleteThread = async (threadId: string) => {
    if (!session || !currentUser) {
      showToast('Please sign in to delete threads', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this thread? This action cannot be undone.')) {
      return;
    }

    setDeletingThread(threadId);
    try {
      const response = await fetch('/api/forum/threads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, userId: currentUser.id })
      });

      if (response.ok) {
        showToast('Thread deleted successfully!', 'success');
        fetchThreads(selectedCategory || undefined); // Refresh threads
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to delete thread', 'error');
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
      showToast('Failed to delete thread', 'error');
    } finally {
      setDeletingThread(null);
    }
  };

  const seedForum = async () => {
    if (!session || !currentUser) {
      showToast('Please sign in to seed the forum', 'error');
      return;
    }

    try {
      const response = await fetch('/api/forum/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (response.ok) {
        const result = await response.json();
        showToast(`Forum seeded successfully! ${result.categoriesCreated} categories created.`, 'success');
        fetchCategories(); // Refresh categories
        fetchThreads(); // Refresh threads
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to seed forum', 'error');
      }
    } catch (error) {
      console.error('Failed to seed forum:', error);
      showToast('Failed to seed forum', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">Loading forum...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Movie Context Banner */}
        {movieId && movieTitle && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-purple-800">
                  🎬 Discussing: {decodeURIComponent(movieTitle)}
                </h2>
                <p className="text-purple-600 text-sm mt-1">
                  Looking for discussions about this movie? Browse existing threads or start a new one!
                </p>
              </div>
              {session && (
                <button
                  onClick={() => setShowNewThreadForm(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Start Discussion
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Discussion Forum</h1>
            <p className="text-gray-600 mt-2">
              Join the conversation about movies, rankings, and more
            </p>
          </div>
          <div className="flex gap-4">
            <Link 
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back to Movies
            </Link>
            {session && !movieId && (
              <button
                onClick={() => setShowNewThreadForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Thread
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Categories</h2>
            {categories.length === 0 && session && (
              <button
                onClick={seedForum}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                🌱 Seed Forum
              </button>
            )}
          </div>
          
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                No categories found. The forum needs to be initialized with default categories.
              </p>
              {session ? (
                <button
                  onClick={seedForum}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  🌱 Initialize Forum
                </button>
              ) : (
                <p className="text-gray-400">Sign in to initialize the forum.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryFilter(null)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories ({threads.length})
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryFilter(category.id)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={
                    selectedCategory === category.id && category.color
                      ? { backgroundColor: category.color, color: 'white' }
                      : category.color
                      ? { borderLeft: `4px solid ${category.color}` }
                      : {}
                  }
                >
                  {category.name} ({category._count.threads})
                  {category.isMovieLink && category.movie && (
                    <span className="ml-1 text-xs opacity-75">
                      📽️ {category.movie.title}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Threads */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">
              {selectedCategory 
                ? `Threads in ${categories.find(c => c.id === selectedCategory)?.name}`
                : 'All Threads'
              }
            </h2>
          </div>
          
          {threads.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No threads found. {session ? 'Start a new discussion!' : 'Sign in to start discussions.'}
            </div>
          ) : (
            <div className="divide-y">
              {threads.map((thread) => (
                <div key={thread.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/forum/thread/${thread.id}`}
                      className="flex-1 block"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {thread.isSticky && (
                          <span className="text-yellow-600 text-sm">📌 Pinned</span>
                        )}
                        {thread.isLocked && (
                          <span className="text-red-600 text-sm">🔒 Locked</span>
                        )}
                        <span
                          className="text-xs px-2 py-1 rounded text-white"
                          style={{ backgroundColor: thread.category.color || '#6b7280' }}
                        >
                          {thread.category.name}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {thread.title}
                      </h3>
                      <div className="text-sm text-gray-600">
                        by {thread.author.name} • {formatDate(thread.createdAt)}
                      </div>
                    </Link>
                    
                    <div className="flex items-start gap-4">
                      <div className="text-right text-sm text-gray-500">
                        <div>{thread._count.posts} posts</div>
                        <div>{thread.views} views</div>
                        {thread.posts[0] && (
                          <div className="mt-1">
                            Last: {formatDate(thread.posts[0].createdAt)}
                            <br />
                            by {thread.posts[0].author.name}
                          </div>
                        )}
                      </div>
                      
                      {/* Delete button - show only to author or admin */}
                      {currentUser && (thread.author.id === currentUser.id || isAdmin) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            deleteThread(thread.id);
                          }}
                          disabled={deletingThread === thread.id}
                          className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                          title={`Delete thread${isAdmin && thread.author.id !== currentUser.id ? ' (Admin)' : ''}`}
                        >
                          {deletingThread === thread.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            '🗑️'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Thread Modal */}
        {showNewThreadForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Create New Thread</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    {categories.length === 0 ? (
                      <div className="w-full p-3 border rounded-lg bg-gray-50 text-gray-500">
                        No categories available. Please initialize the forum first.
                      </div>
                    ) : (
                      <select
                        value={newThreadData.categoryId}
                        onChange={(e) => setNewThreadData(prev => ({ ...prev, categoryId: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                            {category.isMovieLink && category.movie && ` - ${category.movie.title}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Thread Title</label>
                    <input
                      type="text"
                      value={newThreadData.title}
                      onChange={(e) => setNewThreadData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter thread title..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Content</label>
                    <textarea
                      value={newThreadData.content}
                      onChange={(e) => setNewThreadData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
                      placeholder="Start the discussion..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => setShowNewThreadForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  {categories.length === 0 ? (
                    <div className="flex flex-col items-end">
                      <button
                        disabled
                        className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                      >
                        Create Thread
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Initialize forum first</p>
                    </div>
                  ) : (
                    <button
                      onClick={createThread}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Thread
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">Loading forum...</div>
        </div>
      </div>
    }>
      <ForumPageContent />
    </Suspense>
  );
} 