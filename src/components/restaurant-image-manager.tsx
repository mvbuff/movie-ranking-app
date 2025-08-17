'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/toast-context';
import { X, RefreshCw, Trash2, Check, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface RestaurantImageManagerProps {
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
  onImagesUpdated: () => void;
}

interface RestaurantImageData {
  restaurant: {
    id: string;
    name: string;
    address: string | null;
    location: string | null;
    currentImageUrl: string | null;
  };
  images: {
    existing: string[];
    fresh: string[];
    all: string[];
    currentImageUrl: string | null;
  };
}

export default function RestaurantImageManager({
  restaurantId,
  restaurantName,
  onClose,
  onImagesUpdated
}: RestaurantImageManagerProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<RestaurantImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchImageData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/restaurant-images?restaurantId=${restaurantId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch restaurant images');
      }
      const imageData = await response.json();
      setData(imageData);
      setSelectedImages(imageData.images.existing || []);
    } catch (error) {
      console.error('Error fetching image data:', error);
      showToast('Failed to load restaurant images', 'error');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    fetchImageData();
  }, [restaurantId, fetchImageData]);

  const handleAction = async (action: string, imageUrl?: string) => {
    setProcessing(action);
    try {
      const requestBody: {
        restaurantId: string;
        action: string;
        imageUrl?: string;
        selectedImages?: string[];
      } = {
        restaurantId,
        action
      };

      if (action === 'setMainImage' && imageUrl) {
        requestBody.imageUrl = imageUrl;
      } else if (action === 'updateImages') {
        requestBody.selectedImages = selectedImages;
      }

      const response = await fetch('/api/admin/restaurant-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update images');
      }

      const result = await response.json();
      showToast(result.message, 'success');
      
      // Refresh data and notify parent
      await fetchImageData();
      
      // Add cache busting for restaurant list refresh
      onImagesUpdated();
      
    } catch (error) {
      console.error('Error updating images:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update images', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages(prev => 
      prev.includes(imageUrl) 
        ? prev.filter(url => url !== imageUrl)
        : [...prev, imageUrl]
    );
  };

  const selectAllImages = () => {
    setSelectedImages(data?.images.all || []);
  };

  const clearSelection = () => {
    setSelectedImages([]);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading restaurant images...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-6 text-center">
            <p className="text-red-600">Failed to load restaurant data</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasImages = data.images.all.length > 0;
  const hasChanges = JSON.stringify(selectedImages.sort()) !== JSON.stringify(data.images.existing.sort());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Manage Restaurant Images</h2>
            <p className="text-sm text-gray-600 mt-1">{restaurantName}</p>
            <p className="text-xs text-gray-500">{data.restaurant.address}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Current Main Image */}
          {data.images.currentImageUrl && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Current Main Image</h3>
              <div className="relative w-48 h-32 border-2 border-green-500 rounded-lg overflow-hidden">
                <Image
                  src={data.images.currentImageUrl}
                  alt="Current main image"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                  MAIN
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleAction('refreshImages')}
                disabled={processing !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {processing === 'refreshImages' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <RefreshCw size={16} />
                )}
                Refresh from Google Places
              </button>
              
              <button
                onClick={() => handleAction('clearImages')}
                disabled={processing !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {processing === 'clearImages' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Trash2 size={16} />
                )}
                Clear All Images
              </button>

              {hasChanges && (
                <button
                  onClick={() => handleAction('updateImages')}
                  disabled={processing !== null}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {processing === 'updateImages' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check size={16} />
                  )}
                  Save Selected Images
                </button>
              )}
            </div>
          </div>

          {/* Image Selection */}
          {hasImages ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  Available Images ({data.images.all.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllImages}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.images.all.map((imageUrl, index) => {
                  const isSelected = selectedImages.includes(imageUrl);
                  const isExisting = data.images.existing.includes(imageUrl);
                  const isFresh = data.images.fresh.includes(imageUrl);
                  const isMainImage = imageUrl === data.images.currentImageUrl;

                  return (
                    <div
                      key={index}
                      className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleImageSelection(imageUrl)}
                    >
                      <div className="aspect-[4/3] relative">
                        <Image
                          src={imageUrl}
                          alt={`Restaurant image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        
                        {/* Selection indicator */}
                        <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-white ${
                          isSelected ? 'bg-blue-500' : 'bg-gray-400 bg-opacity-50'
                        } flex items-center justify-center`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>

                        {/* Status badges */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                          {isMainImage && (
                            <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                              MAIN
                            </span>
                          )}
                          {isFresh && !isExisting && (
                            <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                              NEW
                            </span>
                          )}
                        </div>

                        {/* Set as main button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('setMainImage', imageUrl);
                          }}
                          disabled={processing !== null || isMainImage}
                          className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded hover:bg-opacity-80 disabled:opacity-50"
                        >
                          {isMainImage ? 'Main' : 'Set Main'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected count */}
              <div className="mt-4 text-sm text-gray-600">
                Selected: {selectedImages.length} / {data.images.all.length} images
                {data.images.fresh.length > 0 && (
                  <span className="ml-4 text-blue-600">
                    {data.images.fresh.length} new image{data.images.fresh.length !== 1 ? 's' : ''} found
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Images Available</h3>
              <p className="text-gray-600 mb-4">
                No images found for this restaurant. Try refreshing from Google Places.
              </p>
              <button
                onClick={() => handleAction('refreshImages')}
                disabled={processing !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {processing === 'refreshImages' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <RefreshCw size={16} />
                )}
                Search for Images
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
