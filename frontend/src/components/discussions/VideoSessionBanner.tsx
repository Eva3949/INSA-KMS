'use client';

import React from 'react';
import { Button } from '@/src/components/ui/Button';
import { Video, Users, Calendar, Clock, ArrowRight, Radio } from 'lucide-react';

interface VideoSessionBannerProps {
  sessions: any[];
  onJoinSession: (sessionId: string) => void;
  onOpenCreateModal: () => void;
}

export const VideoSessionBanner: React.FC<VideoSessionBannerProps> = ({
  sessions,
  onJoinSession,
  onOpenCreateModal,
}) => {
  const activeSession = sessions.find((s) => s.status === 'ACTIVE');
  const upcomingSession = !activeSession ? sessions.find((s) => s.status === 'SCHEDULED') : null;

  if (!activeSession && !upcomingSession) {
    return null;
  }

  if (activeSession) {
    const participantCount = (activeSession.participants || []).filter(
      (p: any) => p.status === 'JOINED'
    ).length;

    return (
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-4 py-3 sm:px-6 rounded-xl border border-emerald-700/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping" />
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white relative shadow-sm">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded-sm border border-emerald-400/30">
                Live Video Discussion
              </span>
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{participantCount} In Call</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">{activeSession.title}</h3>
            <p className="text-[11px] text-slate-300">
              Host: <strong className="text-white">{activeSession.hostFullName || activeSession.hostUsername}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            size="sm"
            onClick={() => onJoinSession(activeSession.id)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold flex items-center gap-1.5 shadow-md text-xs px-4 h-8.5 rounded-lg"
          >
            <Video className="w-4 h-4" />
            <span>Join Video Call</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (upcomingSession) {
    const formattedDate = new Date(upcomingSession.scheduledStart).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <div className="bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-slate-900 text-white px-4 py-3 sm:px-6 rounded-xl border border-indigo-700/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-sm border border-indigo-400/30">
                Scheduled Video Sync
              </span>
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{formattedDate}</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">{upcomingSession.title}</h3>
            <p className="text-[11px] text-slate-300">
              Host: <strong className="text-white">{upcomingSession.hostFullName || upcomingSession.hostUsername}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onJoinSession(upcomingSession.id)}
            className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border-transparent rounded-lg flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Enter Room</span>
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
