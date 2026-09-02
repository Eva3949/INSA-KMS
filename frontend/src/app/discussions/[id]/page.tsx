'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { 
  MessageSquare, 
  User, 
  Calendar, 
  Eye, 
  Lock, 
  Unlock, 
  Trash2, 
  CornerDownRight, 
  Send,
  ArrowLeft 
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import { hasRole } from '@/src/lib/auth';

export default function DiscussionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [topic, setTopic] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState('');
  const [parentReplyId, setParentReplyId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTopicAndReplies = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tData, rData] = await Promise.all([
        kmsApi.discussions.getById(id),
        kmsApi.discussions.getReplies(id),
      ]);
      setTopic(tData);
      setReplies(rData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load discussion topic.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTopicAndReplies();
  }, [id]);

  const isAdmin = hasRole(user?.roles || [], 'ROLE_ADMIN');
  const isAuthor = user?.username && topic?.authorName && user.username.toLowerCase() === topic.authorName.toLowerCase();
  const canModifyTopic = isAdmin || isAuthor;

  const handleToggleStatus = async () => {
    if (!topic) return;
    const nextStatus = topic.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    setActionLoading(true);
    try {
      const updated = await kmsApi.discussions.updateStatus(id, nextStatus);
      setTopic(updated);
      if (nextStatus === 'CLOSED') {
        router.push('/discussions');
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!confirm('Are you sure you want to delete this discussion topic?')) return;
    setActionLoading(true);
    try {
      await kmsApi.discussions.deleteTopic(id);
      router.push('/discussions');
    } catch (err: any) {
      alert(err.message || 'Delete failed.');
      setActionLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setActionLoading(true);
    try {
      await kmsApi.discussions.createReply(id, {
        content: replyText.trim(),
        parentReplyId: parentReplyId || undefined,
      });
      setReplyText('');
      setParentReplyId(null);
      fetchTopicAndReplies();
    } catch (err: any) {
      alert(err.message || 'Failed to post reply.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Delete this reply?')) return;
    try {
      await kmsApi.discussions.deleteReply(replyId);
      fetchTopicAndReplies();
    } catch (err: any) {
      alert(err.message || 'Failed to delete reply.');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !topic) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
          <p className="text-rose-600 text-sm font-semibold">{error || 'Topic not found.'}</p>
          <Link href="/discussions">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Discussions
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  // Separate top-level replies and sub-replies
  const topLevelReplies = replies.filter((r) => !r.parentReplyId);
  const childRepliesMap = replies.reduce((acc: any, r: any) => {
    if (r.parentReplyId) {
      if (!acc[r.parentReplyId]) acc[r.parentReplyId] = [];
      acc[r.parentReplyId].push(r);
    }
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <Breadcrumb items={[{ label: 'Discussions', href: '/discussions' }, { label: topic.title }]} />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 leading-snug">
              {topic.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => router.push('/discussions')}
            >
              Back to Discussions
            </Button>
            {canModifyTopic && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={topic.status === 'OPEN' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  disabled={actionLoading}
                  onClick={handleToggleStatus}
                >
                  {topic.status === 'OPEN' ? 'Close Topic' : 'Reopen Topic'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="w-4 h-4" />}
                  disabled={actionLoading}
                  onClick={handleDeleteTopic}
                >
                  Delete Topic
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Topic Body */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                {topic.authorName || 'Anonymous'}
              </span>
              <span className="text-slate-400">
                {new Date(topic.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Badge label={topic.status} variant={topic.status === 'OPEN' ? 'green' : 'slate'} />
              <span className="text-slate-500 flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {topic.viewsCount || 0} views
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
            {topic.description}
          </div>
        </div>

        {/* Threaded Replies Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Replies ({replies.length})
          </h3>

          {topLevelReplies.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
              No replies yet. Be the first to join the conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {topLevelReplies.map((r) => (
                <div key={r.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {r.authorName || 'Anonymous'}
                    </span>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                      {(isAdmin || (user?.username && user.username.toLowerCase() === r.authorName?.toLowerCase())) && (
                        <button
                          onClick={() => handleDeleteReply(r.id)}
                          className="text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {r.content}
                  </p>

                  {topic.status === 'OPEN' && (
                    <div className="pt-1">
                      <button
                        onClick={() => setParentReplyId(parentReplyId === r.id ? null : r.id)}
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        Reply to this comment
                      </button>
                    </div>
                  )}

                  {/* Nested Child Replies */}
                  {childRepliesMap[r.id] && childRepliesMap[r.id].length > 0 && (
                    <div className="pl-6 pt-3 border-l-2 border-slate-100 space-y-3 mt-3">
                      {childRepliesMap[r.id].map((child: any) => (
                        <div key={child.id} className="bg-slate-50 p-3.5 rounded border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-bold text-slate-800">{child.authorName || 'Anonymous'}</span>
                            <div className="flex items-center gap-2">
                              <span>{new Date(child.createdAt).toLocaleString()}</span>
                              {(isAdmin || (user?.username && user.username.toLowerCase() === child.authorName?.toLowerCase())) && (
                                <button
                                  onClick={() => handleDeleteReply(child.id)}
                                  className="text-rose-600 hover:underline"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {child.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Reply Input */}
          {topic.status === 'OPEN' ? (
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800">
                {parentReplyId ? 'Replying to comment...' : 'Leave a reply'}
                {parentReplyId && (
                  <button
                    onClick={() => setParentReplyId(null)}
                    className="text-[11px] text-rose-600 ml-2 hover:underline font-normal"
                  >
                    (Cancel inline reply)
                  </button>
                )}
              </h4>

              <textarea
                rows={4}
                placeholder="Write your response..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
              />

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send className="w-3.5 h-3.5" />}
                  disabled={actionLoading || !replyText.trim()}
                  onClick={handleSendReply}
                >
                  {actionLoading ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-600 text-center font-medium">
              This discussion topic has been closed. New replies are disabled.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
