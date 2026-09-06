'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { ArrowLeft, Send, Image as ImageIcon, Mic, Square, Trash2, X, Loader2 } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { VoicePlayer } from '@/src/components/discussions/VoicePlayer';

interface AttachedMedia {
  file: File | Blob;
  mediaType: 'IMAGE' | 'AUDIO';
  durationSeconds?: number;
  previewUrl: string;
  filename: string;
  sizeBytes: number;
}

export default function CreateDiscussionTopicPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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

    setSubmitting(true);
    setError(null);
    try {
      const effectiveDescription = description.trim() || (attachedMedia?.mediaType === 'AUDIO' ? '[Voice Note]' : '[Image Attachment]');
      const topic = await kmsApi.discussions.createTopic({ title: title.trim(), description: effectiveDescription });

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
            <p className="text-xs text-slate-500">Initiate a technical conversation for team feedback and resolution.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {error}
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
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
