'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { 
  ArrowLeft, 
  Send, 
  Image as ImageIcon, 
  Mic, 
  Square, 
  Trash2, 
  X, 
  Loader2, 
  Globe, 
  Building2, 
  Lock, 
  Search, 
  User as UserIcon, 
  Check, 
  ShieldAlert, 
  Users 
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { VoicePlayer } from '@/src/components/discussions/VoicePlayer';
import { useAuth } from '@/src/lib/auth-context';

interface AttachedMedia {
  file: File | Blob;
  mediaType: 'IMAGE' | 'AUDIO';
  durationSeconds?: number;
  previewUrl: string;
  filename: string;
  sizeBytes: number;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface UserOption {
  id: string;
  username: string;
  fullName: string;
  email: string;
  department?: string;
  jobTitle?: string;
}

export default function CreateDiscussionTopicPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL'>('PUBLIC');
  
  // Internal Visibility: Departments state
  const [availableDepartments, setAvailableDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<DepartmentOption[]>([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [loadingDepts, setLoadingDepts] = useState(false);

  // Confidential Visibility: Participants state
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<UserOption[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<UserOption[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch departments when user selects INTERNAL
  useEffect(() => {
    if (visibility === 'INTERNAL' && availableDepartments.length === 0) {
      setLoadingDepts(true);
      kmsApi.discussions.getActiveDepartments()
        .then((data) => {
          setAvailableDepartments(data || []);
        })
        .catch(() => {
          // fallback to admin departments if any
          kmsApi.admin.getDepartments()
            .then((data) => setAvailableDepartments(data || []))
            .catch(() => {});
        })
        .finally(() => setLoadingDepts(false));
    }
  }, [visibility, availableDepartments.length]);

  // Search users for Confidential discussion
  const handleSearchUsers = (query: string) => {
    setParticipantSearch(query);
    if (userSearchTimeoutRef.current) {
      clearTimeout(userSearchTimeoutRef.current);
    }

    userSearchTimeoutRef.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const results = await kmsApi.discussions.getAvailableUsers(query);
        setSearchedUsers(results || []);
        setIsUserDropdownOpen(true);
      } catch {
        setSearchedUsers([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
  };

  const handleSelectUser = (user: UserOption) => {
    if (!selectedParticipants.some((p) => p.id === user.id)) {
      setSelectedParticipants((prev) => [...prev, user]);
    }
    setParticipantSearch('');
    setIsUserDropdownOpen(false);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedParticipants((prev) => prev.filter((p) => p.id !== userId));
  };

  const handleToggleDepartment = (dept: DepartmentOption) => {
    if (selectedDepartments.some((d) => d.id === dept.id)) {
      setSelectedDepartments((prev) => prev.filter((d) => d.id !== dept.id));
    } else {
      setSelectedDepartments((prev) => [...prev, dept]);
    }
  };

  useEffect(() => {
    return () => {
      if (attachedMedia?.previewUrl) {
        URL.revokeObjectURL(attachedMedia.previewUrl);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (userSearchTimeoutRef.current) {
        clearTimeout(userSearchTimeoutRef.current);
      }
    };
  }, [attachedMedia]);

  const clearAttachedMedia = useCallback(() => {
    if (attachedMedia?.previewUrl) {
      URL.revokeObjectURL(attachedMedia.previewUrl);
    }
    setAttachedMedia(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, [attachedMedia]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      setError('Only JPG, PNG, and WEBP image formats are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(`Image size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds 5 MB limit.`);
      return;
    }

    clearAttachedMedia();
    setError(null);

    const previewUrl = URL.createObjectURL(file);
    setAttachedMedia({
      file,
      mediaType: 'IMAGE',
      previewUrl,
      filename: file.name,
      sizeBytes: file.size,
    });
  };

  const startRecording = async () => {
    if (isRecording || submitting) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            mimeType = 'audio/ogg;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else {
            mimeType = '';
          }
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        const previewUrl = URL.createObjectURL(audioBlob);
        setAttachedMedia({
          file: audioBlob,
          mediaType: 'AUDIO',
          durationSeconds: recordingSeconds,
          previewUrl,
          filename: 'voice-note.webm',
          sizeBytes: audioBlob.size,
        });

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setError(null);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 300) {
            stopRecording();
            return 300;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setError('Microphone access denied: ' + (err.message || ''));
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Topic title is required');
      return;
    }
    if (!description.trim() && !attachedMedia) {
      setError('Topic description or attachment is required');
      return;
    }

    if (visibility === 'INTERNAL' && selectedDepartments.length === 0) {
      setError('Please select at least one department for INTERNAL discussion.');
      return;
    }

    if (visibility === 'CONFIDENTIAL' && selectedParticipants.length === 0) {
      setError('Please select at least one employee participant for CONFIDENTIAL discussion.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const effectiveDescription = description.trim() || (attachedMedia?.mediaType === 'AUDIO' ? '[Voice Note]' : '[Image Attachment]');
      
      const payload: {
        title: string;
        description: string;
        visibility: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
        departmentIds?: string[];
        participantIds?: string[];
      } = {
        title: title.trim(),
        description: effectiveDescription,
        visibility,
      };

      if (visibility === 'INTERNAL') {
        payload.departmentIds = selectedDepartments.map((d) => d.id);
      } else if (visibility === 'CONFIDENTIAL') {
        payload.participantIds = selectedParticipants.map((p) => p.id);
      }

      const topic = await kmsApi.discussions.createTopic(payload);

      // If media attached, upload to topic
      if (attachedMedia?.file) {
        await kmsApi.discussions.uploadMedia(
          topic.id,
          attachedMedia.file,
          undefined,
          attachedMedia.mediaType,
          attachedMedia.durationSeconds,
          attachedMedia.filename
        );
      }

      router.push(`/discussions/${topic.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create discussion topic');
      setSubmitting(false);
    }
  };

  const filteredDepartments = availableDepartments.filter(
    (d) =>
      d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      d.code.toLowerCase().includes(deptSearch.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <Breadcrumb
          items={[
            { label: 'Workspace', href: '/' },
            { label: 'Discussions', href: '/discussions' },
            { label: 'New Topic' },
          ]}
        />

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Start Discussion Topic</h1>
            <p className="text-xs text-slate-500">Initiate a technical conversation with strict visibility and access controls.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          {/* Hidden image input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Visibility Selection Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Access & Visibility Level *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* PUBLIC */}
              <div
                onClick={() => setVisibility('PUBLIC')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  visibility === 'PUBLIC'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                      <Globe className="w-4 h-4" />
                      <span>🌐 Public</span>
                    </div>
                    {visibility === 'PUBLIC' && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Open to all authenticated employees across the organization.
                  </p>
                </div>
              </div>

              {/* INTERNAL */}
              <div
                onClick={() => setVisibility('INTERNAL')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  visibility === 'INTERNAL'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                      <Building2 className="w-4 h-4" />
                      <span>🏢 Internal</span>
                    </div>
                    {visibility === 'INTERNAL' && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Restricted to members of one or more specified departments.
                  </p>
                </div>
              </div>

              {/* CONFIDENTIAL */}
              <div
                onClick={() => setVisibility('CONFIDENTIAL')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  visibility === 'CONFIDENTIAL'
                    ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                      <Lock className="w-4 h-4" />
                      <span>🔒 Confidential</span>
                    </div>
                    {visibility === 'CONFIDENTIAL' && (
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Private and restricted only to explicitly selected employees.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Configuration: INTERNAL (Departments Selector) */}
          {visibility === 'INTERNAL' && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Allowed Department(s) *
                  </h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Select the departments whose employees are authorized to view and participate in this thread.
                  </p>
                </div>
                {selectedDepartments.length > 0 && (
                  <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-md border border-indigo-200">
                    {selectedDepartments.length} Selected
                  </span>
                )}
              </div>

              {/* Selected department chips */}
              {selectedDepartments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedDepartments.map((dept) => (
                    <span
                      key={dept.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-300 text-indigo-800 text-xs font-semibold rounded-lg shadow-2xs"
                    >
                      <span>{dept.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleDepartment(dept)}
                        className="text-indigo-400 hover:text-rose-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Department search filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter departments..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Department options list */}
              {loadingDepts ? (
                <div className="text-center py-4 text-xs text-indigo-600">Loading departments...</div>
              ) : (
                <div className="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {filteredDepartments.map((dept) => {
                    const isSelected = selectedDepartments.some((d) => d.id === dept.id);
                    return (
                      <div
                        key={dept.id}
                        onClick={() => handleToggleDepartment(dept)}
                        className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50'
                        }`}
                      >
                        <span>{dept.name}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Dynamic Configuration: CONFIDENTIAL (Employee Search & Selection) */}
          {visibility === 'CONFIDENTIAL' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-700" />
                    Authorized Employee Participants *
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Only you and specifically selected employees can discover, open, or reply to this discussion.
                  </p>
                </div>
                {selectedParticipants.length > 0 && (
                  <span className="text-xs font-bold text-amber-800 bg-white px-2.5 py-1 rounded-md border border-amber-200">
                    {selectedParticipants.length} Participants
                  </span>
                )}
              </div>

              {/* Selected Participant Chips */}
              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedParticipants.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg shadow-2xs"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-amber-700" />
                      <span>{p.fullName || p.username} ({p.username})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(p.id)}
                        className="text-amber-400 hover:text-rose-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Participant Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search employees by name, username, or email..."
                  value={participantSearch}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  onFocus={() => {
                    if (searchedUsers.length > 0 || participantSearch) {
                      setIsUserDropdownOpen(true);
                    } else {
                      handleSearchUsers('');
                    }
                  }}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-lg border border-amber-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                {searchingUsers && (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 absolute right-3 top-2.5" />
                )}

                {/* Dropdown Results */}
                {isUserDropdownOpen && searchedUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {searchedUsers
                      .filter((u) => u.username !== currentUser?.username)
                      .map((u) => {
                        const isAlreadySelected = selectedParticipants.some((p) => p.id === u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              if (!isAlreadySelected) handleSelectUser(u);
                            }}
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isAlreadySelected ? 'bg-amber-50/50 opacity-60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                                <span>{u.fullName || u.username}</span>
                                <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {u.email} {u.department ? `• ${u.department}` : ''}
                              </div>
                            </div>
                            {isAlreadySelected ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="text-xs font-bold text-blue-600 hover:text-blue-700"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Topic Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Topic Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Migration strategy for Microservices DB clustering"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Description & Media Attachment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description / Opening Post {!attachedMedia && '*'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isRecording || submitting}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                  title="Attach Image"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Attach Image</span>
                </button>
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={submitting}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    isRecording
                      ? 'bg-rose-100 text-rose-700 animate-pulse'
                      : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                  }`}
                  title="Record Voice Note"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isRecording ? 'Recording...' : 'Record Voice'}</span>
                </button>
              </div>
            </div>

            {/* Live recording indicator */}
            {isRecording && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                  </span>
                  <span className="text-xs font-bold text-rose-700">Recording: {formatTimer(recordingSeconds)} / 5:00</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-1 text-slate-500 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Square className="w-3 h-3 fill-white" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            )}

            {/* Attached media preview */}
            {attachedMedia && !isRecording && (
              <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                {attachedMedia.mediaType === 'IMAGE' ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={attachedMedia.previewUrl}
                      alt="Attached preview"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{attachedMedia.filename}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {(attachedMedia.sizeBytes / 1024).toFixed(1)} KB &bull; Attached Image
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <VoicePlayer
                      src={attachedMedia.previewUrl}
                      durationSeconds={attachedMedia.durationSeconds || recordingSeconds}
                      filename="voice-note.webm"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={clearAttachedMedia}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <textarea
              rows={6}
              placeholder="Provide background information, context, or specific questions for the team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 text-sm font-sans rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || isRecording}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish Topic
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
