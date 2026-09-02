'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { 
  FileText, 
  User, 
  Calendar, 
  Eye, 
  Edit3, 
  Trash2, 
  Globe, 
  Lock, 
  ArrowLeft 
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import { hasRole } from '@/src/lib/auth';

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBlog = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kmsApi.blogs.getById(id);
      setBlog(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load blog post.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBlog();
  }, [id]);

  const isAdmin = hasRole(user?.roles || [], 'ROLE_ADMIN');
  const isAuthor = user?.username && blog?.authorName && user.username.toLowerCase() === blog.authorName.toLowerCase();
  const canModify = isAdmin || isAuthor;

  const handleTogglePublish = async () => {
    if (!blog) return;
    setActionLoading(true);
    try {
      if (blog.status === 'PUBLISHED') {
        const updated = await kmsApi.blogs.unpublish(id);
        setBlog(updated);
      } else {
        const updated = await kmsApi.blogs.publish(id);
        setBlog(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    setActionLoading(true);
    try {
      await kmsApi.blogs.delete(id);
      router.push('/blogs');
    } catch (err: any) {
      alert(err.message || 'Delete failed.');
      setActionLoading(false);
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

  if (error || !blog) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
          <p className="text-rose-600 text-sm font-semibold">{error || 'Blog post not found.'}</p>
          <Link href="/blogs">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Blogs
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <Breadcrumb items={[{ label: 'Blogs & News', href: '/blogs' }, { label: blog.title }]} />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 leading-snug">
              {blog.title}
            </h1>
          </div>

          {canModify && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                icon={blog.status === 'PUBLISHED' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                disabled={actionLoading}
                onClick={handleTogglePublish}
              >
                {blog.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
              </Button>
              <Link href={`/blogs/${id}/edit`}>
                <Button variant="outline" size="sm" icon={<Edit3 className="w-4 h-4" />}>
                  Edit
                </Button>
              </Link>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                disabled={actionLoading}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Article Meta Header */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <User className="w-4 h-4 text-blue-600" />
                {blog.authorName || 'Anonymous'}
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-4 h-4" />
                {new Date(blog.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Badge label={blog.status} variant={blog.status === 'PUBLISHED' ? 'green' : 'amber'} />
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Eye className="w-4 h-4" />
                {blog.viewsCount || 0} views
              </span>
            </div>
          </div>

          {blog.coverImageUrl && (
            <div className="rounded-md overflow-hidden max-h-96 bg-slate-100">
              <img src={blog.coverImageUrl} alt={blog.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Body Content */}
          <div className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans py-2">
            {blog.content}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
