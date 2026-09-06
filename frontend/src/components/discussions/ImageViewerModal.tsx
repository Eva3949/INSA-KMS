'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getAuthenticatedMediaUrl } from '@/src/lib/api';

interface ImageViewerModalProps {
  isOpen: boolean;
  src: string;
  alt?: string;
  filename?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  src,
  alt = 'Discussion image attachment',
  filename = 'image.png',
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const authenticatedSrc = getAuthenticatedMediaUrl(src);


  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetZoom();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, resetZoom]);

  if (!isOpen) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none"
    >
      {/* Top Action Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 inset-x-4 max-w-4xl mx-auto flex items-center justify-between text-white bg-slate-900/60 backdrop-blur-md border border-slate-700/60 px-4 py-2.5 rounded-2xl shadow-xl z-10"
      >
        <div className="flex items-center gap-2 truncate pr-4">
          <span className="text-sm font-medium text-slate-200 truncate">{filename}</span>
          <span className="text-xs text-slate-400 font-mono">({Math.round(scale * 100)}%)</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetZoom();
            }}
            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-slate-300 hover:text-white"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <a
            href={authenticatedSrc}
            download={filename}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-slate-300 hover:text-white"
            title="Download Image"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-rose-600/80 rounded-lg transition-colors text-slate-300 hover:text-white"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Preview Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-full max-h-[85vh] overflow-auto flex items-center justify-center p-2"
      >
        <img
          src={authenticatedSrc}
          alt={alt}
          style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease-out' }}
          className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl origin-center"
        />
      </div>
    </div>
  );
};
