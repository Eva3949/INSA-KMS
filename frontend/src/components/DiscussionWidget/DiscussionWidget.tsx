'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MessageSquare, 
  X, 
  ArrowRight, 
  User, 
  MessageCircle, 
  RefreshCw, 
  ChevronLeft, 
  Send, 
  ExternalLink,
  Lock,
  Loader2
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import './DiscussionWidget.css';

interface TopicItem {
  id: string;
  title: string;
  description?: string;
  author?: string;
  replyCount?: number;
  status?: string;
  createdAt?: string;
}

interface ReplyItem {
  id: string;
  author?: string;
  content: string;
  createdAt?: string;
}

interface TopicDetail extends TopicItem {
  replies?: ReplyItem[];
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 45) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export const DiscussionWidget: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-widget active discussion state
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Quick reply input state
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hide widget on login / auth pages and specific discussion detail pages
  const isLoginPage = pathname === '/login' || pathname?.startsWith('/login') || pathname === '/forgot-password';
  const isDetailPage = pathname?.startsWith('/discussions/') && pathname !== '/discussions' && pathname !== '/discussions/create';

  const loadTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await kmsApi.discussions.getTopics(0, 10);
      const fetched = res?.content || res || [];
      setTopics(Array.isArray(fetched) ? fetched.slice(0, 10) : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load discussions');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTopicDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const data = await kmsApi.discussions.getTopicDetail(id);
      setTopicDetail(data);
      // Auto-scroll to latest replies
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to load discussion detail');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (isLoginPage || isDetailPage) return;
    loadTopics();
    const interval = setInterval(loadTopics, 30000); // refresh topics every 30 seconds
    return () => clearInterval(interval);
  }, [isLoginPage, isDetailPage, loadTopics]);

  // When a topic is selected, fetch its detail & replies
  useEffect(() => {
    if (selectedTopicId) {
      loadTopicDetail(selectedTopicId);
    } else {
      setTopicDetail(null);
    }
  }, [selectedTopicId, loadTopicDetail]);

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
  };

  const handleBackToTopics = () => {
    setSelectedTopicId(null);
    setTopicDetail(null);
    setReplyContent('');
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyContent.trim() || !selectedTopicId || submittingReply) return;

    if (topicDetail?.status === 'CLOSED') {
      alert('Cannot reply to a closed discussion topic.');
      return;
    }

    setSubmittingReply(true);
    try {
      await kmsApi.discussions.addReply(selectedTopicId, {
        content: replyContent.trim(),
      });
      setReplyContent('');
      // Reload topic detail to display the new reply
      await loadTopicDetail(selectedTopicId);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  if (isLoginPage || isDetailPage) {
    return null;
  }

  const currentUsername = user?.username || '';

  return (
    <div className="discussion-widget-container" aria-label="Discussions Floating Widget">
      {isOpen ? (
        <div className="discussion-widget-card bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-200 ease-in-out flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-3.5 py-3 flex items-center justify-between shadow-xs shrink-0">
            {selectedTopicId ? (
              /* Topic Detail View Header */
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  onClick={handleBackToTopics}
                  className="p-1 -ml-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-0.5 text-xs font-semibold"
                  title="Back to topics list"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Topics</span>
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-white truncate">
                    {topicDetail?.title || 'Discussion Thread'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <span className="truncate">by {topicDetail?.author || 'Author'}</span>
                    {topicDetail?.status === 'CLOSED' && (
                      <span className="px-1 py-0.2 bg-rose-500/30 text-rose-300 rounded text-[9px] font-bold border border-rose-500/20">
                        Closed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Topic List View Header */
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-blue-600/30 rounded-lg text-blue-300 border border-blue-500/20 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                    Discussions
                    {topics.length > 0 && (
                      <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                        {topics.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium">Enterprise Forum Topics</p>
                </div>
              </div>
            )}

            {/* Actions: Full Screen, Refresh, Close */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {selectedTopicId && (
                <Link
                  href={`/discussions/${selectedTopicId}`}
                  onClick={() => setIsOpen(false)}
                  title="Open full discussion page"
                  className="p-1 text-slate-300 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
              <button
                onClick={() => (selectedTopicId ? loadTopicDetail(selectedTopicId) : loadTopics())}
                title="Refresh"
                className="p-1 text-slate-300 hover:text-white rounded-md hover:bg-white/10 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingDetail ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                aria-label="Close widget"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {selectedTopicId ? (
            /* ================= VIEW 2: ACTIVE DISCUSSION THREAD ================= */
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/60">
              {loadingDetail ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs font-medium">Loading thread...</span>
                </div>
              ) : detailError || !topicDetail ? (
                <div className="flex-1 p-6 text-center text-xs text-rose-600 space-y-2">
                  <p>{detailError || 'Failed to load thread'}</p>
                  <button
                    onClick={() => loadTopicDetail(selectedTopicId)}
                    className="text-blue-700 font-bold underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  {/* Messages / Replies Scroll Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* Original Topic Post Card */}
                    <div className="bg-white border border-blue-100/80 rounded-xl p-3 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-blue-700">{topicDetail.author || 'Author'}</span>
                        <span>{formatTimeAgo(topicDetail.createdAt)}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {topicDetail.title}
                      </h4>
                      {topicDetail.description && (
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {topicDetail.description}
                        </p>
                      )}
                    </div>

                    {/* Replies Header */}
                    <div className="flex items-center gap-2 py-1">
                      <div className="h-px bg-slate-200 flex-1" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {topicDetail.replies?.length || 0} {(topicDetail.replies?.length === 1) ? 'Reply' : 'Replies'}
                      </span>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>

                    {/* Replies List */}
                    {(!topicDetail.replies || topicDetail.replies.length === 0) ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        <MessageCircle className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                        <p className="font-medium">No replies yet</p>
                        <p className="text-[10px] text-slate-400">Be the first to join the conversation.</p>
                      </div>
                    ) : (
                      topicDetail.replies.map((reply) => {
                        const isMe = reply.author && (reply.author === currentUsername || reply.author === user?.fullName);

                        return (
                          <div
                            key={reply.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5 px-1 text-[10px] text-slate-400">
                              <span className={`font-bold ${isMe ? 'text-blue-700' : 'text-slate-600'}`}>
                                {isMe ? 'You' : reply.author || 'Member'}
                              </span>
                              <span>•</span>
                              <span>{formatTimeAgo(reply.createdAt)}</span>
                            </div>

                            <div
                              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-2xs ${
                                isMe
                                  ? 'bg-blue-600 text-white rounded-br-xs'
                                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{reply.content}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply Composer Input */}
                  <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
                    {topicDetail.status === 'CLOSED' ? (
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-500 text-center text-[11px] font-medium flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>This discussion thread is closed.</span>
                      </div>
                    ) : (
                      <form onSubmit={handleSendReply} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Reply to this topic..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          disabled={submittingReply}
                          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!replyContent.trim() || submittingReply}
                          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors shrink-0"
                          title="Send Reply"
                        >
                          {submittingReply ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ================= VIEW 1: TOPICS LIST ================= */
            <>
              <div className="p-3 overflow-y-auto space-y-2 bg-slate-50/50 flex-1 divide-y divide-slate-100">
                {loading && topics.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Loading recent topics...</span>
                  </div>
                ) : error && topics.length === 0 ? (
                  <div className="py-6 text-center text-xs text-rose-500 px-2 font-medium">
                    <p>{error}</p>
                    <button
                      onClick={loadTopics}
                      className="mt-2 text-[11px] font-bold text-blue-700 underline hover:text-blue-800"
                    >
                      Try Again
                    </button>
                  </div>
                ) : topics.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No active discussions</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Start the first thread in the forum.</p>
                  </div>
                ) : (
                  topics.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => handleSelectTopic(topic.id)}
                      className="pt-2 first:pt-0 pb-2 cursor-pointer group hover:bg-white p-2 rounded-xl transition-all border border-transparent hover:border-blue-200 hover:shadow-2xs"
                    >
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                        {topic.title}
                      </h4>
                      {topic.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-snug">
                          {topic.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mt-2">
                        <div className="flex items-center gap-1 text-slate-600 truncate max-w-[150px]">
                          <User className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate">{topic.author || 'User'}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded-md font-bold transition-colors">
                          <MessageCircle className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                          <span>
                            {topic.replyCount ?? 0} {(topic.replyCount === 1) ? 'reply' : 'replies'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Navigation Button */}
              <div className="p-2.5 bg-white border-t border-slate-200 text-center shrink-0">
                <Link
                  href="/discussions"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-blue-200/60"
                >
                  <span>View All Discussions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Collapsed Trigger Button */
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-bold px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out border border-blue-500/30 active:scale-95"
          aria-label="Open Discussions Widget"
        >
          <div className="relative flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-200 group-hover:text-white transition-colors" />
            {topics.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-2xs">
                {topics.length}
              </span>
            )}
          </div>
          <span className="text-xs tracking-tight">Discussions</span>
        </button>
      )}
    </div>
  );
};
