'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Review {
  id: string;
  text: string;
  createdAt: string;
  user: {
    name: string | null;
  };
}

interface ReviewsModalProps {
  movieId: string;
  movieTitle: string;
  onClose: () => void;
}

export default function ReviewsModal({ movieId, movieTitle, onClose }: ReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const response = await fetch(`/api/reviews?movieId=${movieId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }
        const data = await response.json();
        setReviews(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, [movieId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg animate-fade-in-up">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Reviews for {movieTitle}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-gray-500 text-center">No reviews yet for this movie.</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((review) => (
                <li key={review.id} className="border p-4 rounded-md bg-gray-50">
                  <p className="text-gray-800">&quot;{review.text}&quot;</p>
                  <p className="text-right text-xs text-gray-400 mt-2">
                    - {review.user.name || 'Anonymous'} on {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 