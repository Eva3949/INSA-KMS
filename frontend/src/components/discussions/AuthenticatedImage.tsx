'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { getAuthenticatedMediaUrl } from '@/src/lib/api';

interface AuthenticatedImageProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  src,
  alt = 'Image attachment',
  className = '',
  imgClassName = '',
  onClick,
}) => {
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const activeBlobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    // Direct blob or data URLs don't need authentication
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobSrc(src);
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);
    setHasError(false);

    const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;

    fetch(src, {
      signal: abortController.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (activeBlobRef.current) {
          URL.revokeObjectURL(activeBlobRef.current);
        }
        const newUrl = URL.createObjectURL(blob);
        activeBlobRef.current = newUrl;
        setBlobSrc(newUrl);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (abortController.signal.aborted) return;
        setHasError(true);
        setIsLoading(false);
      });

    return () => {
      abortController.abort();
      if (activeBlobRef.current) {
        URL.revokeObjectURL(activeBlobRef.current);
        activeBlobRef.current = null;
      }
    };
  }, [src]);

  return (
    <div
      onClick={onClick}
      className={`relative inline-block overflow-hidden ${className}`}
    >
      {isLoading && (
        <div className="w-56 h-44 sm:w-64 sm:h-52 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-400 animate-bounce" />
        </div>
      )}

      {hasError ? (
        <div className="w-56 h-36 bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5 text-rose-600">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <span className="text-xs font-medium">Image unavailable</span>
        </div>
      ) : (
        blobSrc && (
          <img
            src={blobSrc}
            alt={alt}
            decoding="async"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            className={`${imgClassName} ${isLoading ? 'hidden' : 'block'}`}
          />
        )
      )}
    </div>
  );
};
