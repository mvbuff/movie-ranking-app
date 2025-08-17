'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/context/toast-context';
import { useUser } from '@/context/user-context';

interface Author {
  id: string;
  name: string;
}

interface ForumPost {
  id: string;
  content: string;
  isFirstPost: boolean;
  likes: number;
  createdAt: string;
  updatedAt: string;
  author: Author;
  parentId?: string;
  replies?: ForumPost[];
  postLikes?: { userId: string }[];
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
}

export default function ThreadPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { currentUser, isAdmin } = useUser();
  // const router = useRouter(); // Not used currently
  const params = useParams();
  const threadId = params.id as string;
  
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [deletingThread, setDeletingThread] = useState(false);

  useEffect(() => {
    if (threadId) {
      fetchThreadData();
      fetchPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const fetchThreadData = async () => {
    try {
      const response = await fetch(`/api/forum/threads?threadId=${threadId}`);
      if (response.ok) {
        const threads = await response.json();
        if (threads.length > 0) {
          setThread(threads[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch thread:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(`/api/forum/posts?threadId=${threadId}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      showToast('Failed to load posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (content: string, parentId?: string) => {
    if (!session || !currentUser) {
      showToast('Please sign in to post', 'error');
      return;
    }

    if (!content.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }

    try {
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          threadId,
          parentId,
          userId: currentUser.id
        })
      });

      if (response.ok) {
        showToast('Post added successfully!', 'success');
        setNewPostContent('');
        setReplyContent('');
        setReplyingTo(null);
        setEditingPost(null);
        setEditContent('');
        fetchPosts();
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create post', 'error');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      showToast('Failed to create post', 'error');
    }
  };

  const startEditingPost = (post: ForumPost) => {
    setEditingPost(post.id);
    setEditContent(post.content);
    setReplyingTo(null); // Close any open reply forms
  };

  const cancelEditing = () => {
    setEditingPost(null);
    setEditContent('');
  };

  const editPost = async (postId: string, content: string) => {
    if (!session || !currentUser) {
      showToast('Please sign in to edit posts', 'error');
      return;
    }

    if (!content.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }

    try {
      const response = await fetch('/api/forum/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: content.trim(),
          userId: currentUser.id
        })
      });

      if (response.ok) {
        showToast('Post updated successfully!', 'success');
        setEditingPost(null);
        setEditContent('');
        fetchPosts();
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to edit post', 'error');
      }
    } catch (error) {
      console.error('Failed to edit post:', error);
      showToast('Failed to edit post', 'error');
    }
  };

  const deletePost = async (postId: string) => {
    if (!session || !currentUser) {
      showToast('Please sign in to delete posts', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setDeletingPost(postId);
    try {
      const response = await fetch('/api/forum/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId: currentUser.id })
      });

      if (response.ok) {
        showToast('Post deleted successfully!', 'success');
        fetchPosts(); // Refresh posts
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to delete post', 'error');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      showToast('Failed to delete post', 'error');
    } finally {
      setDeletingPost(null);
    }
  };

  const likePost = async (postId: string) => {
    if (!session || !currentUser) {
      showToast('Please sign in to like posts', 'error');
      return;
    }

    // Optimistic update: Update UI immediately
    const updatedPosts = posts.map(post => {
      const updatePostLikes = (p: ForumPost): ForumPost => {
        if (p.id === postId) {
          const postLikes = p.postLikes || [];
          const hasLiked = postLikes.some(like => like.userId === currentUser.id);
          if (hasLiked) {
            // Remove like
            return {
              ...p,
              likes: p.likes - 1,
              postLikes: postLikes.filter(like => like.userId !== currentUser.id)
            };
          } else {
            // Add like
            return {
              ...p,
              likes: p.likes + 1,
              postLikes: [...postLikes, { userId: currentUser.id }]
            };
          }
        }
        // Also update nested replies
        return {
          ...p,
          replies: p.replies ? p.replies.map(updatePostLikes) : []
        };
      };
      return updatePostLikes(post);
    });
    
    setPosts(updatedPosts);

    try {
      const response = await fetch('/api/forum/posts/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          userId: currentUser.id
        })
      });

      if (response.ok) {
        // Successfully liked/unliked - no need to show toast for likes
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to like post', 'error');
        // Revert optimistic update on error
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to like post:', error);
      showToast('Failed to like post', 'error');
      // Revert optimistic update on error
      fetchPosts();
    }
  };

  const deleteThreadFromPage = async () => {
    if (!session || !currentUser || !thread) {
      showToast('Please sign in to delete threads', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this entire thread? This will delete all posts and cannot be undone.')) {
      return;
    }

    setDeletingThread(true);
    try {
      const response = await fetch('/api/forum/threads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, userId: currentUser.id })
      });

      if (response.ok) {
        showToast('Thread deleted successfully!', 'success');
        // Redirect back to forum after successful deletion
        window.location.href = '/forum';
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to delete thread', 'error');
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
      showToast('Failed to delete thread', 'error');
    } finally {
      setDeletingThread(false);
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

  const renderPost = (post: ForumPost, isNested = false) => (
    <div
      key={post.id}
      className={`bg-white rounded-lg shadow-sm p-6 ${
        isNested ? 'ml-8 mt-4 border-l-4 border-blue-200' : ''
      } ${post.isFirstPost ? 'border-2 border-green-200' : 'border'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {post.author.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{post.author.name}</div>
            <div className="text-sm text-gray-500">
              {formatDate(post.createdAt)}
              {post.updatedAt && new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime() + 60000 && (
                <span className="ml-2 text-xs text-blue-600" title={`Last edited: ${formatDate(post.updatedAt)}`}>
                  (edited)
                </span>
              )}
            </div>
          </div>
          {post.isFirstPost && (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
              Original Post
            </span>
          )}
        </div>
        
        {/* Edit and Delete buttons */}
        {currentUser && (post.author.id === currentUser.id || (!post.isFirstPost && isAdmin)) && (
          <div className="flex gap-2">
            {/* Edit button - only for post author */}
            {post.author.id === currentUser.id && (
              <button
                onClick={() => startEditingPost(post)}
                className="p-1 text-blue-500 hover:text-blue-700"
                title="Edit post"
              >
                ✏️
              </button>
            )}
            
            {/* Delete button - show only to author or admin, but not for first post */}
            {!post.isFirstPost && (
              <button
                onClick={() => deletePost(post.id)}
                disabled={deletingPost === post.id}
                className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                title={`Delete post${isAdmin && post.author.id !== currentUser.id ? ' (Admin)' : ''}`}
              >
                {deletingPost === post.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                ) : (
                  '🗑️'
                )}
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Post content or edit form */}
      {editingPost === post.id ? (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800 mb-2">
            Editing post:
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
            placeholder="Edit your post..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={cancelEditing}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => editPost(post.id, editContent)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <div className="prose max-w-none mb-4">
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        {session && !thread?.isLocked && editingPost !== post.id && (
          <button
            onClick={() => {
              if (replyingTo === post.id) {
                setReplyingTo(null);
              } else {
                setReplyingTo(post.id);
                setEditingPost(null); // Close any open edit forms
                setEditContent('');
              }
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {replyingTo === post.id ? 'Cancel Reply' : '💬 Reply'}
          </button>
        )}
        {/* Like button */}
        {session ? (
          <button
            onClick={() => likePost(post.id)}
            className={`flex items-center gap-1 text-sm transition-colors ${
              (post.postLikes || []).some(like => like.userId === currentUser?.id)
                ? 'text-red-600 hover:text-red-700'
                : 'text-gray-500 hover:text-red-600'
            }`}
          >
            {(post.postLikes || []).some(like => like.userId === currentUser?.id) ? '❤️' : '🤍'} {post.likes}
          </button>
        ) : (
          <div className="text-sm text-gray-500">
            ❤️ {post.likes} likes
          </div>
        )}
      </div>

      {/* Reply Form */}
      {replyingTo === post.id && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">
            Replying to {post.author.name}:
          </div>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Write your reply..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setReplyingTo(null)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => createPost(replyContent, post.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Post Reply
            </button>
          </div>
        </div>
      )}

      {/* Nested Replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="mt-4">
          {post.replies.map((reply) => renderPost(reply, true))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading thread...</div>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Thread Not Found</h1>
            <Link 
              href="/forum"
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Forum
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <Link 
              href="/forum"
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Forum
            </Link>
            
            {/* Delete thread button - show only to author or admin */}
            {currentUser && thread && (thread.author.id === currentUser.id || isAdmin) && (
              <button
                onClick={deleteThreadFromPage}
                disabled={deletingThread}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                title={`Delete entire thread${isAdmin && thread.author.id !== currentUser.id ? ' (Admin)' : ''}`}
              >
                {deletingThread ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </div>
                ) : (
                  '🗑️ Delete Thread'
                )}
              </button>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
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
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {thread.title}
            </h1>
            
            <div className="text-sm text-gray-600">
              Started by {thread.author.name} • {formatDate(thread.createdAt)} • {thread.views} views
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4 mb-6">
          {posts.map((post) => renderPost(post))}
        </div>

        {/* New Post Form */}
        {session && !thread.isLocked ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Add Reply</h3>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              placeholder="Share your thoughts..."
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => createPost(newPostContent)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Post Reply
              </button>
            </div>
          </div>
        ) : !session ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-600 mb-4">Sign in to join the discussion</p>
            <Link
              href="/login"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-600">This thread is locked and no longer accepting replies.</p>
          </div>
        )}
      </div>
    </div>
  );
} 