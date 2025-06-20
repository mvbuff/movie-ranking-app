'use client';

import { useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { useToast } from '@/context/toast-context';
import { useClickOutside } from '@/hooks/useClickOutside';

interface AddReviewModalProps {
  movieId: string;
  movieTitle: string;
  userId: string;
  onClose: () => void;
  onReviewAdded: () => void;
}

export default function AddReviewModal({ 
  movieId, 
  movieTitle, 
  userId, 
  onClose, 
  onReviewAdded 
}: AddReviewModalProps) {
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
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          movieId,
          text: reviewText.trim(),
        }),
      });

      if (response.ok) {
        showToast('Review added successfully!', 'success');
        onReviewAdded();
        onClose();
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to add review', 'error');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      showToast('Failed to add review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReviewText('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop"
      data-modal-backdrop="true"
    >
      <div 
        ref={modalContentRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-md animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-blue-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Add Review</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{movieTitle}</h3>
            <p className="text-sm text-gray-600">Share your thoughts about this movie</p>
          </div>

          <div className="space-y-4">
            <div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="What did you think about this movie? Share your review..."
                maxLength={100}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs ${reviewText.length > 90 ? 'text-red-600' : 'text-gray-500'}`}>
                  {reviewText.length}/100 characters
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reviewText.trim() || isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  'Add Review'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 