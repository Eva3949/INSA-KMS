'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-kms-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white border border-kms-slate-300 rounded-md shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-3 border-b border-kms-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-700 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quick search across documents, metadata, OCR text, and tags (Ctrl+K)..."
            className="w-full text-sm text-kms-slate-900 placeholder:text-kms-slate-400 focus:outline-none bg-transparent"
          />
          <button onClick={onClose} className="p-1 text-kms-slate-400 hover:text-kms-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 text-xs text-kms-slate-600 bg-kms-slate-50 border-t border-kms-slate-100 flex items-center justify-between">
          <span>Press <strong>ESC</strong> to exit or <strong>Enter</strong> for advanced search</span>
          <Link href={`/search`} onClick={onClose} className="text-blue-700 hover:underline font-semibold flex items-center gap-1">
            Open Advanced Search Engine <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
