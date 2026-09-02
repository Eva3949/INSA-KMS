'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Badge } from '@/src/components/ui/Badge';
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  Calendar, 
  User, 
  Tag, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import { hasRole } from '@/src/lib/auth';

export default function BlogsPage() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const canCreate = hasRole(user?.roles || [], 'ROLE_CONTRIBUTOR') || hasRole(user?.roles || [], 'ROLE_ADMIN');

  const fetchBlogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kmsApi.blogs.list({
        status: status !== 'ALL' ? status : undefined,
        category: category !== 'ALL' ? category : undefined,
        search: search.trim() || undefined,
        page,
        size: 9,
      });
      setBlogs(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load blog posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [status, category, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchBlogs();
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Blogs & News' }]} />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <Sparkles className="w-6 h-6 text-blue-600" />
              INSA Blogs &amp; Enterprise News
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Publish and discover internal news, technical blog posts, executive updates, and technical insights.
            </p>
          </div>

          {canCreate && (
            <Link href="/blogs/create">
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                Create Blog Post
              </Button>
            </Link>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search blogs by title or content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs w-full"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select
              options={[
                { label: 'All Categories', value: 'ALL' },
                { label: 'General', value: 'General' },
                { label: 'Engineering', value: 'Engineering' },
                { label: 'Security & Compliance', value: 'Security' },
                { label: 'Company News', value: 'News' },
              ]}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(0);
              }}
              className="text-xs w-36"
            />

            <Select
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Published', value: 'PUBLISHED' },
                { label: 'Drafts', value: 'DRAFT' },
              ]}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              className="text-xs w-32"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
            {error}
          </div>
        )}

        {/* Grid of Blog Posts */}
        {loading ? (
          <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
            <p className="text-xs text-slate-500">Loading blog posts...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-slate-200 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No blog posts found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first to share an update or article with the organization.
            </p>
            {canCreate && (
              <Link href="/blogs/create" className="inline-block pt-2">
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                  Create Blog Post
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {blog.coverImageUrl ? (
                  <div className="h-40 bg-slate-100 overflow-hidden relative">
                    <img
                      src={blog.coverImageUrl}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge label={blog.status} variant={blog.status === 'PUBLISHED' ? 'green' : 'amber'} />
                    </div>
                  </div>
                ) : (
                  <div className="h-28 bg-gradient-to-r from-blue-700 to-indigo-800 p-4 flex flex-col justify-between text-white relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs">
                        {blog.category || 'General'}
                      </span>
                      <Badge label={blog.status} variant={blog.status === 'PUBLISHED' ? 'green' : 'amber'} />
                    </div>
                    <FileText className="w-8 h-8 text-white/30 absolute bottom-3 right-3" />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm leading-snug">
                      <Link href={`/blogs/${blog.id}`}>{blog.title}</Link>
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {blog.content?.replace(/[#*`_]/g, '') || ''}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium truncate max-w-[140px]">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{blog.authorName || 'Anonymous'}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        {blog.viewsCount || 0}
                      </span>
                      <Link
                        href={`/blogs/${blog.id}`}
                        className="text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                      >
                        Read <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-semibold text-slate-600">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
