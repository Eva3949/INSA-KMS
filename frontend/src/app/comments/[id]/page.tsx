'use client';

import React, { useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { MessageSquare, Send, User, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CommentsWorkspacePage({ params }: { params: { id: string } }) {
  const docId = params.id;
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  const [comments, setComments] = useState([
    {
      id: 'c-1',
      author: 'Sarah Jenkins',
      role: 'IT Security Lead',
      date: '2026-08-18 15:10',
      content: 'Please verify that Section 3.2 Keycloak PKCE configuration matches the production gateway setup.',
      replies: [
        {
          id: 'r-1',
          author: 'David Chen',
          role: 'Principal Engineer',
          date: '2026-08-18 16:45',
          content: 'Verified. PKCE code challenge method S256 is enforced on kms-frontend-client.',
        },
      ],
    },
    {
      id: 'c-2',
      author: 'Michael Scott',
      role: 'Compliance Officer',
      date: '2026-08-19 11:20',
      content: 'Audit logging review confirmed that trg_audit_immutable trigger is operational in PostgreSQL.',
      replies: [],
    },
  ]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const entry = {
      id: 'c-' + Date.now(),
      author: 'Current Authenticated User',
      role: 'Contributor',
      date: 'Just now',
      content: newComment.trim(),
      replies: [],
    };

    setComments((prev) => [...prev, entry]);
    setNewComment('');
  };

  const handleAddReply = (commentId: string) => {
    const text = replyText[commentId];
    if (!text || !text.trim()) return;

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: [
              ...c.replies,
              {
                id: 'r-' + Date.now(),
                author: 'Current Authenticated User',
                role: 'Contributor',
                date: 'Just now',
                content: text.trim(),
              },
            ],
          };
        }
        return c;
      })
    );

    setReplyText((prev) => ({ ...prev, [commentId]: '' }));
    setActiveReplyId(null);
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

        {/* Comment Thread List */}
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
                    <span className="text-[11px] text-kms-slate-500 ml-2">({comment.role})</span>
                  </div>
                </div>
                <span className="text-[11px] text-kms-slate-400">{comment.date}</span>
              </div>
              <p className="text-xs text-kms-slate-800 leading-relaxed">{comment.content}</p>

              {/* Threaded Replies */}
              {comment.replies.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-kms-slate-200 space-y-2 pt-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-kms-slate-50 p-2.5 rounded border border-kms-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-kms-slate-600">
                        <span className="font-semibold text-kms-slate-900">{reply.author}</span>
                        <span>{reply.date}</span>
                      </div>
                      <p className="text-kms-slate-800">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Trigger */}
              <div className="mt-3 pt-2 border-t border-kms-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                  className="text-blue-700 font-semibold hover:underline"
                >
                  {activeReplyId === comment.id ? 'Cancel Reply' : 'Reply to Thread'}
                </button>
              </div>

              {/* Threaded Reply Input */}
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

        {/* New Comment Form */}
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
      </div>
    </AppShell>
  );
}

