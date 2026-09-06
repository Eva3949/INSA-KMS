'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/src/components/ui/Button';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Share2,
  Users,
  MessageSquare,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

interface VirtualVideoRoomModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionEnded?: () => void;
}

export const VirtualVideoRoomModal: React.FC<VirtualVideoRoomModalProps> = ({
  sessionId,
  isOpen,
  onClose,
  onSessionEnded,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinData, setJoinData] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [jitsiApi, setJitsiApi] = useState<any>(null);

  // Fallback WebRTC state
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize Session: Backend Authorization & Jitsi / WebRTC Launch
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setIsFallbackMode(false);

    const initMeeting = async () => {
      try {
        // 1. Mandatory backend authorization check
        const data = await kmsApi.videoSessions.joinSession(sessionId);
        if (!isMounted) return;
        setJoinData(data);

        // 2. Enforce self-hosted domain and admission token
        const domain = data.meetingDomain;
        if (!domain || domain.trim().toLowerCase().includes('meet.jit.si')) {
          throw new Error('Self-hosted Jitsi domain is not configured or invalid. Public meet.jit.si fallback is strictly prohibited.');
        }

        if (!data.jwtToken) {
          throw new Error('Video session admission token was not granted by KMS. Access denied.');
        }

        const scriptId = 'jitsi-external-api-script';

        const loadScript = () => {
          return new Promise<void>((resolve, reject) => {
            if (window.JitsiMeetExternalAPI) {
              resolve();
              return;
            }
            const existingScript = document.getElementById(scriptId);
            if (existingScript) {
              existingScript.addEventListener('load', () => resolve());
              existingScript.addEventListener('error', () => reject(new Error('Script load failed')));
              return;
            }
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://${domain}/external_api.js`;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Jitsi API'));
            document.head.appendChild(script);
          });
        };

        try {
          await loadScript();
          if (!isMounted) return;

          // Initialize Jitsi IFrame with JWT in memory
          if (jitsiContainerRef.current && window.JitsiMeetExternalAPI) {
            jitsiContainerRef.current.innerHTML = '';
            const options: any = {
              roomName: data.meetingIdentifier,
              jwt: data.jwtToken,
              parentNode: jitsiContainerRef.current,
              width: '100%',
              height: '100%',
              userInfo: {
                displayName: data.userDisplayName || 'KMS Colleague',
                email: data.userEmail || '',
              },
              configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                enableWelcomePage: false,
                prejoinPageEnabled: false,
                disableDeepLinking: true,
              },
              interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                  'microphone', 'camera', 'desktop', 'chat',
                  'raisehand', 'tileview', 'fullscreen',
                  'settings', 'hangup'
                ],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
              },
            };

            const api = new window.JitsiMeetExternalAPI(domain, options);
            setJitsiApi(api);

            api.addEventListener('videoConferenceLeft', async () => {
              try {
                await kmsApi.videoSessions.leaveSession(sessionId);
              } catch {}
              onClose();
            });

            api.addEventListener('readyToClose', async () => {
              try {
                await kmsApi.videoSessions.leaveSession(sessionId);
              } catch {}
              onClose();
            });
          }
        } catch (scriptErr: any) {
          console.error('Jitsi script load failed:', scriptErr);
          throw new Error(`Unable to load Jitsi interface from self-hosted server (${domain}). Verify internal network connectivity and TLS certificate.`);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to join video session. Authorization denied.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initMeeting();

    return () => {
      isMounted = false;
      if (jitsiApi) {
        try {
          jitsiApi.dispose();
        } catch {}
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const handleLeaveSession = async () => {
    try {
      if (jitsiApi) {
        jitsiApi.executeCommand('hangup');
      }
      await kmsApi.videoSessions.leaveSession(sessionId);
    } catch {}
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    onClose();
  };

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this video session for all participants?')) return;
    try {
      await kmsApi.videoSessions.endSession(sessionId);
      if (jitsiApi) {
        jitsiApi.executeCommand('hangup');
      }
      if (onSessionEnded) onSessionEnded();
    } catch (err: any) {
      alert(err.message || 'Failed to end session');
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    onClose();
  };

  // Fallback WebRTC controls
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
        setIsAudioMuted(!t.enabled);
      });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
        setIsVideoMuted(!t.enabled);
      });
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIsScreenSharing(false);
      } catch {}
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setLocalStream(displayStream);
        if (videoRef.current) videoRef.current.srcObject = displayStream;
        setIsScreenSharing(true);
      } catch {}
    }
  };

  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={modalRef}
      className={`fixed inset-0 z-50 flex flex-col bg-slate-950 text-white ${
        isFullscreen ? 'w-screen h-screen' : 'p-2 sm:p-6'
      }`}
    >
      <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
        {/* Top Header Bar */}
        <div className="px-4 py-2.5 bg-slate-900/90 backdrop-blur-xs border-b border-slate-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE VIDEO</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>{joinData?.title || 'Virtual Video Discussion'}</span>
                {joinData?.isHost && (
                  <span className="text-[10px] bg-blue-600/40 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded-sm uppercase tracking-wider font-extrabold">
                    Host
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                Topic: {joinData?.discussionTitle || 'Discussion Thread'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleLeaveSession}
              className="h-8 text-xs font-semibold bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 rounded-lg flex items-center gap-1.5"
            >
              <PhoneOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Leave</span>
            </Button>
            {joinData?.isHost && (
              <Button
                size="sm"
                onClick={handleEndSession}
                className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End Meeting</span>
              </Button>
            )}
          </div>
        </div>

        {/* Meeting Content Area */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Authenticating & Connecting to Video Discussion...</p>
            </div>
          )}

          {error && (
            <div className="max-w-md p-6 bg-slate-900 border border-rose-800/60 rounded-xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h2 className="text-sm font-bold text-white">Access Denied / Connection Failed</h2>
              <p className="text-xs text-rose-300 font-medium">{error}</p>
              <Button size="sm" onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white text-xs">
                Close
              </Button>
            </div>
          )}

          {/* Jitsi IFrame Container */}
          <div
            ref={jitsiContainerRef}
            className={`w-full h-full ${loading || error || isFallbackMode ? 'hidden' : 'block'}`}
          />

          {/* Fallback WebRTC Video Area */}
          {isFallbackMode && !loading && !error && (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
              <div className="relative w-full max-w-3xl aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : 'block'}`}
                />
                {isVideoMuted && (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <VideoOff className="w-12 h-12 text-slate-600" />
                    <span className="text-xs font-semibold">Camera is turned off</span>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-700/50 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-white">{joinData?.userDisplayName} (You)</span>
                </div>
              </div>

              {/* WebRTC Bottom Controls */}
              <div className="flex items-center gap-3 mt-4 bg-slate-900/90 backdrop-blur-xs px-4 py-2 rounded-xl border border-slate-800">
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-xl transition-colors ${
                    isAudioMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
                >
                  {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-xl transition-colors ${
                    isVideoMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleScreenShare}
                  className={`p-3 rounded-xl transition-colors ${
                    isScreenSharing ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  title="Share Screen"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-slate-700 mx-1" />
                <button
                  onClick={handleLeaveSession}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Leave Call</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
