'use client';

import React, { useState } from 'react';
import { Search, Menu } from 'lucide-react';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationDropdown } from './NotificationDropdown';
import { UserProfileDropdown } from './UserProfileDropdown';
import { AuthUser } from '@/src/lib/auth-context';
import { PwaInstallButton } from '@/src/components/pwa/PwaInstallButton';

interface TopHeaderProps {
  user?: AuthUser | null;
  onToggleMobileMenu?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ user, onToggleMobileMenu }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs gap-2">
        {/* Left: Mobile Menu Trigger + Global Search */}
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Global Search Trigger Bar */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 sm:gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 rounded-md px-2.5 sm:px-3.5 py-1.5 text-xs text-slate-500 w-full sm:w-64 md:w-80 transition-all shadow-2xs"
            aria-label="Open quick search"
          >
            <Search className="w-4 h-4 text-blue-700 shrink-0" />
            <span className="flex-1 text-left font-medium truncate">
              <span className="hidden sm:inline">Quick Search (Ctrl+K)...</span>
              <span className="sm:hidden">Search...</span>
            </span>
            <kbd className="hidden sm:inline-block bg-white border border-slate-300 text-slate-600 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right User Controls */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs shrink-0">
          {/* PWA Install Action */}
          <PwaInstallButton variant="header" />

          {/* Notifications Trigger */}
          <NotificationDropdown user={user} />

          {/* User Profile & Personal Workspace Dropdown */}
          <UserProfileDropdown user={user} />
        </div>
      </header>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
