'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, AlertCircle } from 'lucide-react';

interface VoicePlayerProps {
  src: string;
  durationSeconds?: number;
  filename?: string;
  isOutgoing?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  src,
  durationSeconds = 0,
  filename = 'voice-note.webm',
  isOutgoing = false,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durationSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setTotalDuration(durationSeconds);
    }
  }, [durationSeconds]);

  useEffect(() => {
    if (!src) return;
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setAudioBlobUrl(src);
      return;
    }
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
    const controller = new AbortController();

    fetch(src, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
      })
      .catch((err: any) => {
        if (!controller.signal.aborted) {
          setIsUnavailable(true);
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [src]);

  const effectiveSrc = audioBlobUrl || (src.startsWith('blob:') || src.startsWith('data:') ? src : '');


  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Playback failed:', err);
          setIsPlaying(false);
          setIsLoading(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration !== Infinity) {
        setTotalDuration(Math.round(audioRef.current.duration));
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration !== Infinity) {
      setTotalDuration(Math.round(audioRef.current.duration));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? Math.min((currentTime / totalDuration) * 100, 100) : 0;

  if (isUnavailable) {
    return (
      <div className={`my-1.5 p-2.5 rounded-2xl flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 shadow-xs min-w-[240px] max-w-[340px]`}>
        <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-rose-800">Audio unavailable</span>
          <span className="text-[11px] text-rose-600 truncate">{filename}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`my-1.5 p-2.5 rounded-2xl flex items-center gap-3 transition-all ${
        isOutgoing
          ? 'bg-sky-100/80 border border-sky-300/80 text-sky-950'
          : 'bg-slate-100/90 border border-slate-200/90 text-slate-800'
      } shadow-xs min-w-[240px] max-w-[340px] sm:min-w-[280px]`}
    >
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={effectiveSrc}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
          isOutgoing
            ? 'bg-sky-600 hover:bg-sky-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        title={isPlaying ? 'Pause' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ml-0.5 fill-white" />}
      </button>

      {/* Audio Waveform / Scrubber bar & time */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div className="relative flex items-center h-4">
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-300/70 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-hidden"
          />
        </div>

        {/* Timestamps & animated equalizer bars when playing */}
        <div className="flex items-center justify-between text-[11px] font-mono leading-none text-slate-600">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-0.5 px-1">
            {[40, 70, 100, 60, 85, 45, 90, 65].map((h, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full transition-all duration-150 ${
                  isPlaying ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(4, (h * (i % 2 === 0 ? 1 : 0.7)) / 10)}px` : '4px',
                }}
              />
            ))}
          </div>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Mute and Download Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={toggleMute}
          className="p-1 text-slate-500 hover:text-slate-700 rounded-md transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <a
          href={effectiveSrc}
          download={filename}
          className="p-1 text-slate-500 hover:text-slate-700 rounded-md transition-colors"
          title="Download audio"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
