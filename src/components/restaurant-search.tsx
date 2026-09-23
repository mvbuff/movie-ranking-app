'use client';

import { useState } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import { X, MapPin, ExternalLink, ChevronDown } from 'lucide-react';

interface RestaurantSearchProps {
  onItemAdded: () => void;
}

export default function RestaurantSearch({ onItemAdded }: RestaurantSearchProps) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    googleMapsUrl: '',
    cuisine: '',
    description: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      googleMapsUrl: '',
      cuisine: '',
      description: ''
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      showToast('Please sign in to add restaurants', 'error');
      return;
    }

    if (!formData.name.trim()) {
      showToast('Restaurant name is required', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          googleMapsUrl: formData.googleMapsUrl,
          cuisine: formData.cuisine,
          description: formData.description,
          userId: currentUser.id,
        }),
      });

      if (response.ok) {
        const restaurant = await response.json();
        
        // Check if it was a duplicate (status 200) vs new (status 201)
        if (response.status === 200) {
          showToast(`"${restaurant.name}" already exists in the database`, 'info');
        } else {
          showToast(`Successfully added "${restaurant.name}"!`, 'success');
        }
        
        resetForm();
        setIsFormOpen(false);
        onItemAdded();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to add restaurant', 'error');
      }
    } catch (error) {
      console.error('Error adding restaurant:', error);
      showToast('Failed to add restaurant', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cuisineOptions = [
    'Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'American', 
    'Mediterranean', 'French', 'Korean', 'Vietnamese', 'Lebanese', 'Turkish',
    'Brazilian', 'Greek', 'Spanish', 'Ethiopian', 'Moroccan', 'Other'
  ];

  if (!currentUser) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-200/70 shadow-soft p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title text-xl">Add Restaurant</h2>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-primary"
          >
            Add New Restaurant
          </button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Restaurant Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-stone-600 mb-1">
                Restaurant Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-modern w-full pr-10"
                  placeholder="Enter restaurant name"
                  required
                />
                {formData.name && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, name: '' }))}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Cuisine Type */}
            <div>
              <label htmlFor="cuisine" className="block text-sm font-medium text-stone-600 mb-1">
                Cuisine Type
              </label>
              <div className="relative">
                <select
                  id="cuisine"
                  name="cuisine"
                  value={formData.cuisine}
                  onChange={handleInputChange}
                  className="input-modern w-full appearance-none pr-10"
                >
                  <option value="">Select cuisine type</option>
                  {cuisineOptions.map(cuisine => (
                    <option key={cuisine} value={cuisine}>{cuisine}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>
          </div>



          {/* Google Maps URL */}
          <div>
            <label htmlFor="googleMapsUrl" className="block text-sm font-medium text-stone-600 mb-1">
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                Google Maps Link
              </div>
            </label>
            <div className="relative">
              <input
                type="url"
                id="googleMapsUrl"
                name="googleMapsUrl"
                value={formData.googleMapsUrl}
                onChange={handleInputChange}
                className="input-modern w-full pr-10"
                placeholder="https://maps.google.com/..."
              />
              {formData.googleMapsUrl && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, googleMapsUrl: '' }))}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>



          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-stone-600 mb-1">
              Description
            </label>
            <div className="relative">
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="input-modern w-full pr-10"
                placeholder="Brief description of the restaurant, specialties, etc."
              />
              {formData.description && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, description: '' }))}
                  className="absolute right-2 top-3 text-stone-400 hover:text-stone-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isSubmitting ? 'Adding...' : 'Add Restaurant'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="btn-secondary px-4!"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        </form>
      )}

      {/* Google Maps URL Preview */}
      {isFormOpen && formData.googleMapsUrl && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <ExternalLink size={16} />
            <span className="text-sm font-medium">Google Maps Link Preview:</span>
          </div>
          <a
            href={formData.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm break-all"
          >
            {formData.googleMapsUrl}
          </a>
        </div>
      )}
    </div>
  );
}