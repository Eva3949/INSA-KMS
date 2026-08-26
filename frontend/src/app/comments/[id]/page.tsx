'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { MessageSquare, Send, User, FileText } from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

interface ApiComment {
  id: string;
  content: string;
  author: string;
  parentCommentId: string | null;
  createdAt: string;
}

interface ThreadedComment extends ApiComment {
  replies: ApiComment[];
}

function buildThreadedTree(comments: ApiComment[]): ThreadedComment[] {
  const map = new Map<string, ThreadedComment>();
  const roots: ThreadedComment[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parentCommentId && map.has(c.parentCommentId)) {
      map.get(c.parentCommentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function CommentsWorkspacePage({ params }: { params: { id: string } }) {
  const docId = params.id;
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<ThreadedComment[]>([]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/documents/${docId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch comments (${res.status})`);
      const data: ApiComment[] = await res.json();
      setComments(buildThreadedTree(data));
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/documents/${docId}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error(`Failed to post comment (${res.status})`);
      setNewComment('');
      await fetchComments();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment.');
    }
  };

  const handleAddReply = async (commentId: string) => {
    const text = replyText[commentId];
    if (!text || !text.trim()) return;
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/documents/${docId}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: text.trim(), parentCommentId: commentId }),
      });
      if (!res.ok) throw new Error(`Failed to post reply (${res.status})`);
      setReplyText((prev) => ({ ...prev, [commentId]: '' }));
      setActiveReplyId(null);
      await fetchComments();
    } catch (err: any) {
      alert(err.message || 'Failed to post reply.');
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb
              items={[
                { label: 'Document Library', href: '/library' },
                { label: `Document #${docId}`, href: `/preview/${docId}` },
                { label: 'Comments & Discussion' },
              ]}
            />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-700" />
              Document Discussion &amp; Threaded Comments (FR-23)
            </h1>
          </div>

          <Link href={`/preview/${docId}`}>
            <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />}>
              Back to Preview Workspace
            </Button>
          </Link>
        </div>

        {loading && <LoadingState message="Loading comments..." />}
        {error && <ErrorState message={error} onRetry={fetchComments} />}

        {!loading && !error && (
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <div className="flex items-start justify-between border-b border-kms-slate-100 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-[11px]">
                      {comment.author.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-kms-slate-900 text-xs">{comment.author}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-kms-slate-400">{formatTimestamp(comment.createdAt)}</span>
                </div>
                <p className="text-xs text-kms-slate-800 leading-relaxed">{comment.content}</p>

                {comment.replies.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-kms-slate-200 space-y-2 pt-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="bg-kms-slate-50 p-2.5 rounded border border-kms-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-kms-slate-600">
                          <span className="font-semibold text-kms-slate-900">{reply.author}</span>
                          <span>{formatTimestamp(reply.createdAt)}</span>
                        </div>
                        <p className="text-kms-slate-800">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-kms-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                    className="text-blue-700 font-semibold hover:underline"
                  >
                    {activeReplyId === comment.id ? 'Cancel Reply' : 'Reply to Thread'}
                  </button>
                </div>

                {activeReplyId === comment.id && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-kms-slate-100">
                    <textarea
                      rows={2}
                      value={replyText[comment.id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                      placeholder="Type your threaded reply..."
                      className="w-full p-2 text-xs bg-white border border-kms-slate-300 rounded text-kms-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <Button variant="primary" size="sm" onClick={() => handleAddReply(comment.id)}>
                        Post Reply
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && (
          <Card title="Post New Discussion Thread">
            <form onSubmit={handleAddComment} className="space-y-3">
              <textarea
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type your comment, question, or @mention team members..."
                className="w-full p-3 text-xs bg-white border border-kms-slate-300 rounded text-kms-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                required
              />
              <div className="flex justify-end">
                <Button variant="primary" size="sm" icon={<Send className="w-3.5 h-3.5" />}>
                  Post Comment Thread
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
