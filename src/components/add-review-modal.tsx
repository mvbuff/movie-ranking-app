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
  onReviewAdded: (reviewText: string) => void;
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
        onReviewAdded(reviewText.trim());
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
      className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-sm flex items-center justify-center p-4"
      data-modal-backdrop="true"
    >
      <div 
        ref={modalContentRef}
        className="bg-white rounded-[1.75rem] shadow-lift w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ animation: 'scaleIn .25s cubic-bezier(.22,1,.36,1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center">
              <MessageSquare size={18} className="text-brand" />
            </span>
            <h2 className="font-display font-bold tracking-tight text-lg text-ink">Add Review</h2>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full hover:bg-stone-100 p-2 text-stone-500 hover:text-stone-700 transition-colors"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-display font-semibold tracking-tight text-ink mb-1">{movieTitle}</h3>
            <p className="text-sm text-stone-500">Share your thoughts about this movie</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="review-text" className="block text-sm font-semibold text-stone-600 mb-2">
                Your Review
              </label>
              <textarea
                id="review-text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="What did you think about this movie? Share your review..."
                maxLength={200}
                className="input-modern w-full resize-none"
                rows={4}
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs ${reviewText.length > 180 ? 'text-red-600' : 'text-stone-400'}`}>
                  {reviewText.length}/200 characters
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reviewText.trim() || isSubmitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
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
