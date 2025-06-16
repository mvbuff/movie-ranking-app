'use client';

import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const baseClasses = 'fixed top-5 right-5 w-auto max-w-sm p-4 rounded-lg shadow-lg text-white flex items-center justify-between animate-fade-in-down';
  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white/20">
        <X size={20} />
      </button>
    </div>
  );
} 