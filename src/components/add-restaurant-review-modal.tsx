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
    <div 
      className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-sm flex items-center justify-center p-4"
      data-modal-backdrop="true"
    >
      <div
        ref={modalContentRef}
        className="bg-white rounded-[1.75rem] shadow-lift w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        style={{ animation: 'scaleIn .25s cubic-bezier(.22,1,.36,1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center">
              <MessageSquare className="text-brand" size={18} />
            </span>
            <h2 className="font-display font-bold tracking-tight text-lg text-ink">
              Add Review
            </h2>
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
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="mb-4">
            <h3 className="font-display font-semibold tracking-tight text-ink mb-1">
              {restaurantName}
            </h3>
            <p className="text-stone-500 text-sm">
              Share your experience at this restaurant to help others make informed decisions.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="review" className="block text-sm font-semibold text-stone-600 mb-2">
                Your Review
              </label>
              <textarea
                id="review"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="input-modern w-full resize-none"
                rows={4}
                maxLength={500}
                placeholder="Tell others about your experience at this restaurant - the food, service, atmosphere, or anything that would help them decide..."
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-stone-400">
                  Maximum 500 characters
                </div>
                <div className={`text-xs ${
                  remainingChars < 50 ? 'text-red-500' : 'text-stone-400'
                }`}>
                  {remainingChars} characters remaining
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-stone-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reviewText.trim()}
            className="btn-primary"
          >
            {isSubmitting ? 'Adding Review...' : 'Add Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
