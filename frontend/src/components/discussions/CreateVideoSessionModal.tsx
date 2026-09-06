'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/src/components/ui/Button';
import {
  Video,
  Calendar,
  Clock,
  Users,
  X,
  Plus,
  Search,
  Loader2,
  Check,
  User as UserIcon,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';

interface SelectedUser {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  department?: string;
  jobTitle?: string;
}

interface CreateVideoSessionModalProps {
  discussionId: string;
  discussionTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (session: any) => void;
}

export const CreateVideoSessionModal: React.FC<CreateVideoSessionModalProps> = ({
  discussionId,
  discussionTitle,
  isOpen,
  onClose,
  onCreated,
}) => {
  const { user: currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);

  // Participant selection state
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [defaultUsers, setDefaultUsers] = useState<SelectedUser[]>([]);
  const [loadingDefaultUsers, setLoadingDefaultUsers] = useState(false);
  const [searchResults, setSearchResults] = useState<SelectedUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [hostWarning, setHostWarning] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when opened
  useEffect(() => {
    if (isOpen) {
      setTitle(`Video Sync: ${discussionTitle}`);
      setDescription(`Interactive video discussion for topic: ${discussionTitle}`);
      setIsScheduled(false);
      setDurationMinutes(30);

      // Default start 15 mins in future for scheduling
      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      const isoNow = now.toISOString().slice(0, 16);
      setScheduledStart(isoNow);

      const end = new Date(now.getTime() + 30 * 60 * 1000);
      setScheduledEnd(end.toISOString().slice(0, 16));

      setSelectedUsers([]);
      setUserQuery('');
      setSearchResults([]);
      setSearchError(null);
      setIsDropdownOpen(false);
      setActiveIndex(-1);
      setHostWarning(null);
      setError(null);
    }
  }, [isOpen, discussionTitle]);

  // Load default available active KMS users whenever modal is opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchDefaultUsers = async () => {
      setLoadingDefaultUsers(true);
      try {
        const users = await kmsApi.videoSessions.getAvailableUsers();
        if (isMounted) {
          setDefaultUsers(users || []);
        }
      } catch (err: any) {
        console.error('Failed to load default users:', err);
      } finally {
        if (isMounted) {
          setLoadingDefaultUsers(false);
        }
      }
    };

    fetchDefaultUsers();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for KMS users when query is entered
  useEffect(() => {
    if (!isOpen) return;

    if (!userQuery.trim()) {
      setSearchResults([]);
      setSearchingUsers(false);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      setSearchError(null);
      try {
        const users = await kmsApi.videoSessions.getAvailableUsers(userQuery.trim());
        const safeUsers = users || [];
        setSearchResults(safeUsers);
      } catch (err: any) {
        setSearchError('Unable to load users. Please try again.');
        setSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [userQuery, isOpen]);

  // Determine active display list: filtered search results when query entered, else default available users
  const isFiltering = userQuery.trim().length > 0;
  const displayUsers = isFiltering ? searchResults : defaultUsers;
  const isLoadingUsers = isFiltering ? searchingUsers : loadingDefaultUsers;

  // Sync activeIndex with active display list
  useEffect(() => {
    if (displayUsers.length > 0) {
      setActiveIndex((prev) => (prev >= 0 && prev < displayUsers.length ? prev : 0));
    } else {
      setActiveIndex(-1);
    }
  }, [displayUsers.length, isFiltering]);

  // Scroll active item into view when navigating via keyboard
  useEffect(() => {
    if (activeIndex >= 0) {
      const el = document.getElementById(`user-search-item-${activeIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  const isUserHost = (targetUser: SelectedUser): boolean => {
    if (!currentUser) return false;
    if (currentUser.id && targetUser.id && currentUser.id === targetUser.id) return true;
    if (currentUser.username && targetUser.username && currentUser.username.toLowerCase() === targetUser.username.toLowerCase()) return true;
    return false;
  };

  const isUserSelected = (targetUser: SelectedUser): boolean => {
    return selectedUsers.some(
      (u) => u.id === targetUser.id || u.username.toLowerCase() === targetUser.username.toLowerCase()
    );
  };

  const handleSelectUser = (userToSelect: SelectedUser) => {
    setHostWarning(null);

    // Rule 4 / 6: Host must never become a normal participant
    if (isUserHost(userToSelect)) {
      setHostWarning(`You are the host (${userToSelect.fullName || userToSelect.username}) and cannot be invited as a participant.`);
      return;
    }

    // Rule 2: Prevent duplicate selection
    if (isUserSelected(userToSelect)) {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      return;
    }

    setSelectedUsers((prev) => [...prev, userToSelect]);
    setIsDropdownOpen(true); // Keep dropdown open for continuous selection

    // Keep the search input active so the host can immediately search or select another user
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      if (userQuery) {
        searchInputRef.current.select();
      }
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
    setHostWarning(null);
  };

  const handleClearAll = () => {
    setSelectedUsers([]);
    setHostWarning(null);
  };

  const handleDurationPreset = (mins: number) => {
    setDurationMinutes(mins);
    if (scheduledStart) {
      const baseDate = new Date(scheduledStart);
      const newEnd = new Date(baseDate.getTime() + mins * 60 * 1000);
      setScheduledEnd(newEnd.toISOString().slice(0, 16));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Session title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Build creation payload
      // Primary: participantUserIds (UUIDs)
      // Backward compatibility: invitedUsernames
      const payload: {
        title: string;
        description?: string;
        scheduledStart?: string;
        scheduledEnd?: string;
        durationMinutes?: number;
        participantUserIds?: string[];
        invitedUsernames?: string[];
      } = {
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
        participantUserIds: selectedUsers.length > 0 ? selectedUsers.map((u) => u.id) : undefined,
        invitedUsernames: selectedUsers.length > 0 ? selectedUsers.map((u) => u.username) : undefined,
      };

      if (isScheduled && scheduledStart) {
        payload.scheduledStart = new Date(scheduledStart).toISOString();
        if (scheduledEnd) {
          payload.scheduledEnd = new Date(scheduledEnd).toISOString();
        }
      } else {
        payload.scheduledStart = new Date().toISOString();
        if (durationMinutes > 0) {
          const autoEnd = new Date(Date.now() + durationMinutes * 60 * 1000);
          payload.scheduledEnd = autoEnd.toISOString();
        }
      }

      const created = await kmsApi.discussions.createVideoSession(discussionId, payload);
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create video session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Virtual Video Discussion</h2>
              <p className="text-[11px] text-slate-300">Create or schedule a secure live video sync for this thread</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Session Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Session Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily Standup / Architecture Review"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs transition-all"
            />
          </div>

          {/* Agenda / Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Agenda / Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what will be discussed..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs transition-all"
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsScheduled(false)}
              className={`flex-1 py-2 px-3 rounded-lg border font-bold text-center transition-all ${
                !isScheduled
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Start Instantly Now
            </button>
            <button
              type="button"
              onClick={() => setIsScheduled(true)}
              className={`flex-1 py-2 px-3 rounded-lg border font-bold text-center transition-all ${
                isScheduled
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Schedule for Later
            </button>
          </div>

          {/* Duration Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Estimated Duration</span>
              </label>
              <span className="text-[11px] font-semibold text-blue-600">{durationMinutes} min</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleDurationPreset(mins)}
                  className={`py-1 px-2 rounded-md border text-center font-semibold text-[11px] transition-all ${
                    durationMinutes === mins
                      ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Pickers */}
          {isScheduled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Start Time</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledStart}
                  onChange={(e) => {
                    setScheduledStart(e.target.value);
                    if (e.target.value && durationMinutes > 0) {
                      const base = new Date(e.target.value);
                      const nEnd = new Date(base.getTime() + durationMinutes * 60 * 1000);
                      setScheduledEnd(nEnd.toISOString().slice(0, 16));
                    }
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>End Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* PARTICIPANT INVITATION COMPONENT */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Invite Participants (Optional)</span>
              </label>
              {selectedUsers.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                >
                  Clear All ({selectedUsers.length})
                </button>
              )}
            </div>

            {/* Host notice banner if attempted self-selection */}
            {hostWarning && (
              <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] flex items-center gap-1.5 animate-in fade-in">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{hostWarning}</span>
              </div>
            )}

            {/* Search Input Container with Dropdown DIRECTLY BELOW */}
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={userQuery}
                  onChange={(e) => {
                    setUserQuery(e.target.value);
                    setIsDropdownOpen(true);
                    setHostWarning(null);
                  }}
                  onFocus={() => {
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      if (!isDropdownOpen) {
                        setIsDropdownOpen(true);
                        return;
                      }
                      if (displayUsers.length > 0) {
                        e.preventDefault();
                        setActiveIndex((prev) => (prev < displayUsers.length - 1 ? prev + 1 : 0));
                      }
                    } else if (e.key === 'ArrowUp') {
                      if (displayUsers.length > 0) {
                        e.preventDefault();
                        setActiveIndex((prev) => (prev > 0 ? prev - 1 : displayUsers.length - 1));
                      }
                    } else if (e.key === 'Enter') {
                      if (isDropdownOpen && displayUsers.length > 0 && activeIndex >= 0 && activeIndex < displayUsers.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        const target = displayUsers[activeIndex];
                        if (target && !isUserHost(target)) {
                          handleSelectUser(target);
                        }
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsDropdownOpen(false);
                      setActiveIndex(-1);
                    }
                  }}
                  placeholder="Search colleagues by name, username, or email..."
                  className="w-full pl-8 pr-8 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all bg-white"
                />
                {isLoadingUsers ? (
                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-3 top-2.5" />
                ) : userQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUserQuery('');
                      setSearchResults([]);
                      setIsDropdownOpen(true); // Return immediately to default available user list
                      if (searchInputRef.current) {
                        searchInputRef.current.focus();
                      }
                    }}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Dropdown DIRECTLY BELOW Search Input: Shows default available users when empty, filtered search when typed */}
              {isDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 top-full mt-1 border border-slate-200 rounded-xl bg-white shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 z-40 animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* Category Header */}
                  <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                    <span>{isFiltering ? `Search Results (${searchResults.length})` : `Available Colleagues (${defaultUsers.length})`}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {isFiltering ? 'Filtered results' : 'Select to invite or type to filter'}
                    </span>
                  </div>

                  {isLoadingUsers && displayUsers.length === 0 ? (
                    <div className="px-4 py-3.5 flex items-center justify-center gap-2 text-slate-500 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>{isFiltering ? 'Searching colleagues...' : 'Loading available colleagues...'}</span>
                    </div>
                  ) : searchError ? (
                    <div className="px-4 py-3 text-rose-600 text-xs flex items-center gap-2 bg-rose-50/50">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{searchError}</span>
                    </div>
                  ) : isFiltering && searchResults.length === 0 ? (
                    <div className="px-4 py-4 text-center text-slate-500 text-xs">
                      <Users className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                      <p className="font-semibold text-slate-700">No users found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No active KMS user matches &ldquo;{userQuery}&rdquo;
                      </p>
                    </div>
                  ) : !isFiltering && defaultUsers.length === 0 ? (
                    <div className="px-4 py-4 text-center text-slate-500 text-xs">
                      <Users className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                      <p className="font-semibold text-slate-700">No available users found</p>
                    </div>
                  ) : (
                    displayUsers.map((u, index) => {
                      const isHost = isUserHost(u);
                      const isSelected = isUserSelected(u);
                      const isActive = index === activeIndex;

                      return (
                        <div
                          key={u.id}
                          id={`user-search-item-${index}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(index)}
                          onMouseDown={(e) => {
                            // Prevent search input from blurring when clicking item
                            e.preventDefault();
                          }}
                          onClick={() => {
                            if (!isHost) {
                              handleSelectUser(u);
                            }
                          }}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                            isHost
                              ? 'bg-slate-50/80 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-blue-50/50 cursor-pointer'
                              : isActive
                              ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-300 cursor-pointer'
                              : 'hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {/* User Profile Avatar / Icon */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
                              {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate text-xs flex items-center gap-1.5">
                                <span className="truncate">{u.fullName || u.username}</span>
                                <span className="font-mono text-[10px] text-blue-600 shrink-0 font-normal">
                                  @{u.username}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                {u.email && <span className="truncate">{u.email}</span>}
                                {(u.department || u.jobTitle) && (
                                  <span className="text-slate-400 truncate">
                                    {u.email ? '• ' : ''}
                                    {[u.department, u.jobTitle].filter(Boolean).join(' - ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 ml-2">
                            {isHost ? (
                              <span className="inline-flex items-center text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                                You are the host
                              </span>
                            ) : isSelected ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shadow-2xs">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Selected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors">
                                <Plus className="w-3 h-3" />
                                Select
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected Participants Chips DIRECTLY BELOW SEARCH FIELD */}
            {selectedUsers.length > 0 && (
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-medium">Selected participants ({selectedUsers.length}):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-900 rounded-lg text-xs font-medium shadow-2xs group transition-all"
                    >
                      <UserIcon className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-800">{u.fullName || u.username}</span>
                      <span className="text-[10px] text-blue-600 font-mono">@{u.username}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(u.id)}
                        title={`Remove ${u.fullName || u.username}`}
                        className="p-0.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 italic">
              {selectedUsers.length === 0
                ? 'Optional: You can create the session now or invite colleagues to join directly.'
                : `${selectedUsers.length} participant${selectedUsers.length > 1 ? 's' : ''} will receive an in-app invitation notification.`}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Session...</span>
                </>
              ) : isScheduled ? (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Session</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5" />
                  <span>Start Live Video Now</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
