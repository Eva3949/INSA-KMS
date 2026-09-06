'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, Mic, Square, Trash2, Smile, X, CornerDownRight, Loader2 } from 'lucide-react';
import { ChatMessage } from './MessageBubble';
import { VoicePlayer } from './VoicePlayer';

export interface ComposerMedia {
  file: File | Blob;
  mediaType: 'IMAGE' | 'AUDIO';
  durationSeconds?: number;
  previewUrl: string;
  filename: string;
  sizeBytes: number;
}

interface MessageComposerProps {
  onSend: (content: string, parentReplyId?: string, media?: ComposerMedia | null) => Promise<void>;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  isClosed: boolean;
  submitting: boolean;
}

const EMOJI_LIST = ['👍', '❤️', '💡', '😄', '🚀', '🔥', '👏', '🎉', '✅', '💻', '🤔', '🙌'];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  replyingTo,
  onCancelReply,
  isClosed,
  submitting,
}) => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<ComposerMedia | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [content]);

  // Clean up object URLs and recording tracks on unmount
  useEffect(() => {
    return () => {
      if (selectedMedia?.previewUrl) {
        URL.revokeObjectURL(selectedMedia.previewUrl);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedMedia]);

  const clearSelectedMedia = useCallback(() => {
    if (selectedMedia?.previewUrl) {
      URL.revokeObjectURL(selectedMedia.previewUrl);
    }
    setSelectedMedia(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, [selectedMedia]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      alert('Only JPG, PNG, and WEBP images are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(`Image size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 5 MB limit.`);
      return;
    }

    clearSelectedMedia();

    const previewUrl = URL.createObjectURL(file);
    setSelectedMedia({
      file,
      mediaType: 'IMAGE',
      previewUrl,
      filename: file.name,
      sizeBytes: file.size,
    });
  };

  const startRecording = async () => {
    if (isRecording || submitting || isClosed) return;
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

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        const previewUrl = URL.createObjectURL(audioBlob);
        setSelectedMedia({
          file: audioBlob,
          mediaType: 'AUDIO',
          durationSeconds: recordingSeconds,
          previewUrl,
          filename: 'voice-note.webm',
          sizeBytes: audioBlob.size,
        });

        // Release mic track immediately
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 300) {
            // Auto-stop at 5 minutes
            stopRecording();
            return 300;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      alert('Could not access microphone: ' + (err.message || 'Permission denied.'));
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
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
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting || isClosed || isRecording) return;

    const currentText = content.trim();
    if (!currentText && !selectedMedia) return;

    const parentId = replyingTo?.id;
    const mediaToSend = selectedMedia;

    setContent('');
    setSelectedMedia(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSend(currentText, parentId, mediaToSend);
      onCancelReply();
      if (mediaToSend?.previewUrl) {
        URL.revokeObjectURL(mediaToSend.previewUrl);
      }
    } catch {
      setContent(currentText);
      setSelectedMedia(mediaToSend);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const addEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  if (isClosed) {
    return (
      <div className="p-4 bg-amber-50/90 border border-amber-200 text-amber-800 text-xs font-semibold rounded-2xl text-center shadow-2xs">
        This discussion topic is CLOSED. New replies are disabled.
      </div>
    );
  }

  const hasPayload = content.trim().length > 0 || selectedMedia !== null;

  return (
    <div className="sticky bottom-0 z-10 p-3 sm:p-4 bg-gradient-to-t from-[#eef4f8] via-[#eef4f8]/90 to-transparent backdrop-blur-xs">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden transition-all">
        {/* Hidden file input for image uploads */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Quoted Reply Header Bar */}
        {replyingTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50/80 border-b border-blue-100 text-xs">
            <div className="flex items-center gap-2 text-blue-700 font-medium truncate">
              <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span>Replying to <strong>{replyingTo.author}</strong>:</span>
              <span className="text-slate-600 truncate italic">"{replyingTo.content}"</span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-blue-100/60 rounded-full transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Media Preview Card before Sending */}
        {selectedMedia && !isRecording && (
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 animate-fade-in">
            {selectedMedia.mediaType === 'IMAGE' ? (
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={selectedMedia.previewUrl}
                  alt="Attachment preview"
                  className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-2xs shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {selectedMedia.filename}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {(selectedMedia.sizeBytes / 1024).toFixed(1)} KB &bull; Image Ready
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <VoicePlayer
                  src={selectedMedia.previewUrl}
                  durationSeconds={selectedMedia.durationSeconds || recordingSeconds}
                  filename="voice-note.webm"
                />
              </div>
            )}

            <button
              type="button"
              onClick={clearSelectedMedia}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Live Audio Recording Status Bar */}
        {isRecording && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="text-xs font-bold text-rose-700">Recording Voice Note...</span>
              <span className="text-xs font-mono font-bold text-rose-900 bg-rose-100/80 px-2 py-0.5 rounded-md">
                {formatTimer(recordingSeconds)} / 5:00
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-100/60 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium"
                title="Discard Recording"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Discard</span>
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                title="Finish Recording"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Done</span>
              </button>
            </div>
          </div>
        )}

        {/* Emoji Selector Popover */}
        {showEmojiPicker && !isRecording && (
          <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 flex-wrap animate-fade-in">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="p-1.5 hover:bg-white rounded-lg text-base transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Main Input Composer Controls */}
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 p-2 sm:p-2.5">
          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isRecording || submitting}
            className={`p-2 rounded-full transition-colors shrink-0 ${
              selectedMedia?.mediaType === 'IMAGE'
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Attach Image (JPG, PNG, WEBP max 5MB)"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Voice Recording Mic Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={submitting}
            className={`p-2 rounded-full transition-colors shrink-0 ${
              isRecording
                ? 'text-rose-600 bg-rose-100 animate-pulse'
                : selectedMedia?.mediaType === 'AUDIO'
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title={isRecording ? 'Stop Voice Recording' : 'Record Voice Note'}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Multiline Input Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRecording}
            placeholder={
              isRecording
                ? 'Recording audio... click Done when finished'
                : selectedMedia
                ? 'Add an optional message with your attachment... (Enter to send)'
                : 'Share your technical response or feedback... (Enter to send, Shift+Enter for new line)'
            }
            className="flex-1 bg-transparent py-1.5 px-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none max-h-36 font-normal leading-relaxed disabled:opacity-50"
          />

          {/* Emoji Toggle Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={isRecording}
            className={`p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0 ${
              showEmojiPicker ? 'text-blue-600 bg-blue-50' : ''
            }`}
            title="Add Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!hasPayload || submitting || isRecording}
            className={`p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all shrink-0 ${
              hasPayload && !submitting && !isRecording
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:scale-105 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
