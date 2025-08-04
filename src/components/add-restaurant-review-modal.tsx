'use client';

import { useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { useToast } from '@/context/toast-context';
import { useClickOutside } from '@/hooks/useClickOutside';

interface AddRestaurantReviewModalProps {
  restaurantId: string;
  restaurantName: string;
  userId: string;
  onClose: () => void;
  onReviewAdded: (reviewText: string) => void;
}

export default function AddRestaurantReviewModal({ 
  restaurantId, 
  restaurantName, 
  userId, 
  onClose, 
  onReviewAdded 
}: AddRestaurantReviewModalProps) {
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  // Click outside to close functionality
  const modalContentRef = useClickOutside<HTMLDivElement>({
    onClickOutside: onClose,
    enabled: true
  });

  const handleSubmit = async () => {
    if (!reviewText.trim()) {
      showToast('Please enter a review', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/restaurant-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          restaurantId,
          text: reviewText.trim(),
        }),
      });

      if (response.ok) {
        showToast('Restaurant review added successfully!', 'success');
        onReviewAdded(reviewText.trim());
        onClose();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to add review', 'error');
      }
    } catch (error) {
      console.error('Error adding restaurant review:', error);
      showToast('Failed to add review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = 500 - reviewText.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalContentRef}
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-green-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">
              Add Review
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">
              {restaurantName}
            </h3>
            <p className="text-gray-600 text-sm">
              Share your experience at this restaurant to help others make informed decisions.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                id="review"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
                placeholder="Tell others about your experience at this restaurant - the food, service, atmosphere, or anything that would help them decide..."
              />
              <div className="flex justify-between items-center mt-1">
                <div className="text-xs text-gray-500">
                  Maximum 500 characters
                </div>
                <div className={`text-xs ${
                  remainingChars < 50 ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {remainingChars} characters remaining
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reviewText.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Adding Review...' : 'Add Review'}
          </button>
        </div>
      </div>
    </div>
  );
}