import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// POST: Seed initial forum data - require authentication
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if categories already exist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingCategories = await (prisma as any).forumCategory.count();
    
    if (existingCategories > 0) {
      return NextResponse.json({ message: 'Forum already seeded' }, { status: 200 });
    }

    // Create default categories
    const categories = [
      {
        name: 'General Discussion',
        description: 'General movie and series discussions',
        color: '#3B82F6', // blue
        isMovieLink: false
      },
      {
        name: 'Movie Reviews',
        description: 'Share and discuss movie reviews',
        color: '#EF4444', // red
        isMovieLink: false
      },
      {
        name: 'Recommendations',
        description: 'Get and give movie recommendations',
        color: '#10B981', // green
        isMovieLink: false
      },
      {
        name: 'Rating System Discussion',
        description: 'Discuss the rating system and scoring methodology',
        color: '#F59E0B', // yellow
        isMovieLink: false
      },
      {
        name: 'Site Feedback',
        description: 'Suggestions and feedback about the website',
        color: '#8B5CF6', // purple
        isMovieLink: false
      }
    ];

    // Create categories
    const createdCategories = [];
    for (const categoryData of categories) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const category = await (prisma as any).forumCategory.create({
        data: categoryData
      });
      createdCategories.push(category);
    }

    // Create a welcome thread in General Discussion
    const generalCategory = createdCategories.find(c => c.name === 'General Discussion');
    if (generalCategory) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const welcomeThread = await (prisma as any).forumThread.create({
        data: {
          title: 'Welcome to the Movie Ranking Forum!',
          isSticky: true,
          authorId: userId,
          categoryId: generalCategory.id,
        }
      });

      // Create welcome post
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).forumPost.create({
        data: {
          content: `Welcome to our discussion forum! 🎬

This is a place where movie enthusiasts can come together to discuss films, share reviews, exchange recommendations, and talk about our rating system.

Here are some guidelines to get you started:

**🎯 Categories:**
• **General Discussion** - Talk about anything movie-related
• **Movie Reviews** - Share detailed reviews and analysis
• **Recommendations** - Ask for or give movie suggestions
• **Rating System Discussion** - Discuss how our scoring works
• **Site Feedback** - Help us improve the platform

**📝 Tips for Great Discussions:**
• Be respectful and constructive in your comments
• Use specific examples when discussing movies
• Feel free to ask questions - everyone's here to help!
• Share your personal experiences and perspectives

**🔗 Integration with Movie Rankings:**
You can create movie-specific discussion threads that link directly to films in our database. Just mention the movie title and year!

Happy discussing! 🍿`,
          isFirstPost: true,
          authorId: userId,
          threadId: welcomeThread.id,
        }
      });
    }

    return NextResponse.json({ 
      message: 'Forum seeded successfully',
      categoriesCreated: createdCategories.length 
    }, { status: 201 });

  } catch (error) {
    console.error("Failed to seed forum:", error);
    return NextResponse.json({ error: 'Failed to seed forum' }, { status: 500 });
  }
} 