# Discussion Forum Setup & Usage

## Overview
The discussion forum has been successfully integrated into your Movie Ranking app. Users can now create discussions about movies, share opinions, and engage in community conversations.

## Features Implemented

### 🗂️ Forum Structure
- **Categories**: Organized discussion topics (General, Reviews, Recommendations, etc.)
- **Threads**: Individual discussion topics within categories
- **Posts**: Messages within threads with nested replies
- **Sticky/Locked Threads**: Admin controls for important discussions

### 🎬 Movie Integration
- **Discussion Button**: Purple "Users" icon on each movie card
- **Movie-Specific Discussions**: Link directly from movie cards to forum
- **Context-Aware**: Pre-fills thread titles when creating movie discussions

### 🔐 Access Control
- **Read-Only Access**: Non-authenticated users can browse all discussions
- **Authenticated Features**: Create threads, post replies, nested conversations
- **Thread Management**: View counts, last post tracking

## Getting Started

### 1. Seed Initial Forum Data
When you first run the app, seed the forum with default categories:

```bash
# Start the development server
npm run dev

# In a new terminal, make an authenticated request to seed the forum
# (You'll need to be logged in first through the web interface)
curl -X POST http://localhost:3000/api/forum/seed \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

Alternatively, visit the forum page (`/forum`) while logged in and the app will guide you through initial setup.

### 2. Access the Forum
- Navigate to `/forum` from the main page
- Click the "💬 Discussion Forum" button on the homepage
- Click the purple "Users" icon on any movie card for movie-specific discussions

## Usage Guide

### For Non-Authenticated Users
- Browse all forum categories and threads
- View all posts and discussions
- See community engagement metrics
- **Cannot**: Create threads, post replies, or engage in discussions

### For Authenticated Users
- All read-only features plus:
- Create new discussion threads
- Reply to existing threads
- Create nested reply conversations
- Access movie-specific discussion creation

### Creating Discussions
1. **General Discussion**: Click "New Thread" on the forum page
2. **Movie-Specific**: Click the purple "Users" icon on any movie card
3. **Categories**: Choose from predefined categories or movie-linked discussions

### Thread Features
- **View Counter**: Tracks how many times a thread has been viewed
- **Post Counter**: Shows total number of replies
- **Last Activity**: Displays when the last post was made
- **Author Attribution**: All posts show author and timestamp
- **Nested Replies**: Reply directly to specific posts for organized conversations

## Database Schema

### New Tables Added
- `ForumCategory`: Discussion categories with optional movie linking
- `ForumThread`: Individual discussion topics
- `ForumPost`: Messages within threads (supports nested replies)

### Integration Points
- Links to existing `User` table for authentication
- Optional links to `Movie` table for movie-specific categories
- Maintains referential integrity with cascade deletes

## API Endpoints

- `GET /api/forum/categories` - List all forum categories
- `POST /api/forum/categories` - Create new categories (authenticated)
- `GET /api/forum/threads` - List threads (optional category filter)
- `POST /api/forum/threads` - Create new threads (authenticated)
- `GET /api/forum/posts` - Get posts for a thread
- `POST /api/forum/posts` - Create new posts/replies (authenticated)
- `POST /api/forum/seed` - Seed initial forum data (authenticated)

## Navigation

### From Movie List
- Purple "Users" icon on each movie poster
- Opens forum with movie context for easy discussion creation

### Main Navigation
- "💬 Discussion Forum" button on homepage
- Direct access to `/forum` URL
- Breadcrumb navigation within forum

## Styling & UI

### Design Consistency
- Matches existing app theme with Tailwind CSS
- Responsive design for all screen sizes
- Interactive hover states and transitions
- Clean, modern forum layout

### Visual Indicators
- 📌 Pinned threads (sticky)
- 🔒 Locked threads
- Color-coded categories
- User avatars and timestamps
- Post hierarchy visualization

## Future Enhancements

### Potential Features to Add
- Like/reaction system for posts
- User reputation and moderation
- Search functionality within forum
- Email notifications for replies
- Rich text editor for posts
- File attachments
- User mention system (@username)

### Admin Features to Consider
- Thread moderation tools
- User management in forum context
- Category management interface
- Bulk operations on posts/threads

## Troubleshooting

### Common Issues
1. **Empty Forum**: Run the seed endpoint to create initial categories
2. **Authentication Errors**: Ensure proper session management
3. **Build Errors**: Check for missing Suspense boundaries with useSearchParams

### Performance Notes
- Forum queries are optimized with proper indexing
- Nested replies are loaded efficiently
- View counters update asynchronously
- Categories and threads are cached appropriately

The forum is now fully integrated and ready for use! Users can engage in meaningful discussions about movies while maintaining the seamless experience of your movie ranking platform. 