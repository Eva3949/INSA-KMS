'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { 
  FileText, 
  User, 
  Building2, 
  Calendar, 
  Tag, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  ArrowLeft,
  MessageSquare
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { RichMarkdownRenderer } from '@/src/components/articles/RichMarkdownRenderer';

export default function ArticlePostPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params?.id as string;

  const [article, setArticle] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArticle = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await kmsApi.documents.getById(articleId);
      setArticle(data);
      const c = await kmsApi.documents.getComments(articleId).catch(() => []);
      setComments(c);
    } catch (err: any) {
      setError(err.message || 'Failed to load article post.');
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      await kmsApi.documents.addComment(articleId, newComment.trim());
      setNewComment('');
      const updated = await kmsApi.documents.getComments(articleId);
      setComments(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Loading article post..." />
      </AppShell>
    );
  }

  if (error || !article) {
    return (
      <AppShell>
        <ErrorState title="Article Not Found" message={error || 'Failed to load article'} onRetry={loadArticle} />
      </AppShell>
    );
  }

  const tags = Array.isArray(article.tags) ? article.tags : (article.tags ? article.tags.split(',') : []);

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Knowledge' }, { label: article.knowledgeType || 'Article' }, { label: article.title }]} />
            <div className="flex items-center gap-3 mt-1">
              <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.back()}>
                Back to Library
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge label={article.knowledgeType || 'SOP'} variant="blue" />
            <Badge label={article.confidentialityLevel || 'INTERNAL'} variant="slate" />
            <Badge label={article.status || 'PUBLISHED'} stateBadge={article.status} />
          </div>
        </div>

        {/* Main Article Header Banner */}
        <div className="bg-white p-6 rounded-lg border border-kms-slate-200 shadow-xs space-y-4">
          <h1 className="text-2xl font-extrabold text-kms-slate-900 leading-tight">
            {article.title}
          </h1>

          {article.executiveSummary && (
            <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r text-xs text-blue-950 font-medium leading-relaxed">
              <span className="font-bold text-blue-900 block mb-1 uppercase tracking-wider text-[10px]">Executive Summary</span>
              {article.executiveSummary}
            </div>
          )}

          {/* Article Meta Strip */}
          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-kms-slate-600 border-t border-kms-slate-100">
            <div className="flex items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-kms-slate-400" />
              <span>Author: <strong className="text-kms-slate-900">{article.owner || 'Author'}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 font-medium">
              <Building2 className="w-4 h-4 text-kms-slate-400" />
              <span>Department: <strong className="text-kms-slate-900">{article.department || 'Knowledge Management'}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-kms-slate-400" />
              <span>Updated: <strong className="text-kms-slate-900">{new Date(article.updatedAt || Date.now()).toLocaleDateString()}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-kms-slate-400" />
              <span>Review Frequency: <strong className="text-kms-slate-900">{article.reviewFrequencyDays || 365} days</strong></span>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Tag className="w-3.5 h-3.5 text-kms-slate-400" />
              {tags.map((t: string) => (
                <span key={t} className="bg-kms-slate-100 text-kms-slate-800 text-[11px] px-2 py-0.5 rounded font-medium border border-kms-slate-200">
                  {t.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Article Body Content View */}
        <div className="bg-white p-6 rounded-lg border border-kms-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-kms-slate-900 uppercase tracking-wider border-b border-kms-slate-100 pb-2">
            Article Post Content
          </h2>

          <div className="p-2">
            <RichMarkdownRenderer content={article.articleContent || 'No article content provided.'} />
          </div>
        </div>

        {/* Discussion / Comments Section */}
        <div className="bg-white p-6 rounded-lg border border-kms-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-kms-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Comments &amp; Discussion ({comments.length})
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment or reply..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 text-xs p-2 border border-kms-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button variant="primary" size="sm" onClick={handlePostComment}>
              Post
            </Button>
          </div>

          <div className="space-y-3 pt-2">
            {comments.map((c) => (
              <div key={c.id} className="p-3 bg-kms-slate-50 border border-kms-slate-200 rounded text-xs">
                <div className="flex justify-between items-center text-kms-slate-500 font-medium mb-1">
                  <span>{c.author || 'User'}</span>
                  <span className="text-[10px]">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-kms-slate-800 font-normal">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
