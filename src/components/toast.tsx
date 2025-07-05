'use client';

import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const baseClasses = 'fixed top-5 right-5 w-auto max-w-md p-4 rounded-lg shadow-lg text-white flex items-start justify-between animate-fade-in-down';
  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <div className="flex-1 whitespace-pre-line text-sm leading-relaxed pr-2">
        {message}
      </div>
      <button 
        onClick={onClose} 
        className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
} 