'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Badge } from '@/src/components/ui/Badge';
import { Modal } from '@/src/components/ui/Modal';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Eye, 
  MessageCircle, 
  User, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

export default function DiscussionsPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // New topic modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTopics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kmsApi.discussions.list({
        status: status !== 'ALL' ? status : undefined,
        category: category !== 'ALL' ? category : undefined,
        search: search.trim() || undefined,
        page,
        size: 10,
      });
      setTopics(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load discussions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [status, category, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchTopics();
  };

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || !newDescription.trim()) {
      alert('Title and description are required.');
      return;
    }
    setSubmitting(true);
    try {
      await kmsApi.discussions.createTopic({
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
      });
      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      fetchTopics();
    } catch (err: any) {
      alert(err.message || 'Failed to create topic.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Discussions & Forum' }]} />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              Discussions &amp; Technical Forum
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ask questions, collaborate on standards, share ideas, and engage in peer-to-peer technical discussions.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Start New Topic
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search topics by keywords..."
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
                { label: 'Best Practices', value: 'Best Practices' },
                { label: 'Architecture & Tech', value: 'Tech' },
                { label: 'Q&A Help', value: 'Q&A' },
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
                { label: 'Open', value: 'OPEN' },
                { label: 'Closed', value: 'CLOSED' },
              ]}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              className="text-xs w-28"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
            {error}
          </div>
        )}

        {/* List of Topics */}
        {loading ? (
          <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
            <p className="text-xs text-slate-500">Loading discussion topics...</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-slate-200 space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No discussion topics found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start a new discussion topic to ask questions or exchange knowledge with the team.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Start New Topic
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge label={topic.status} variant={topic.status === 'OPEN' ? 'green' : 'slate'} />
                    <span className="text-[11px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">
                      {topic.category || 'General'}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {new Date(topic.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors leading-snug">
                    <Link href={`/discussions/${topic.id}`}>{topic.title}</Link>
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-1">
                    {topic.description}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Started by <strong>{topic.authorName || 'Anonymous'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 text-xs text-slate-500 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-center">
                    <span className="block font-bold text-slate-900 text-sm">{topic.repliesCount || 0}</span>
                    <span className="text-[10px] uppercase text-slate-400">Replies</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-slate-900 text-sm">{topic.viewsCount || 0}</span>
                    <span className="text-[10px] uppercase text-slate-400">Views</span>
                  </div>
                  <Link href={`/discussions/${topic.id}`}>
                    <Button variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                      View
                    </Button>
                  </Link>
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

      {/* Start New Topic Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Start a New Discussion Topic">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Topic Title</label>
            <Input
              placeholder="e.g. Recommended key length for internal API JWT tokens?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <Select
              options={[
                { label: 'General', value: 'General' },
                { label: 'Best Practices', value: 'Best Practices' },
                { label: 'Architecture & Tech', value: 'Tech' },
                { label: 'Q&A Help', value: 'Q&A' },
              ]}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Question Details</label>
            <textarea
              rows={5}
              placeholder="Provide background information, context, or code snippets..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={submitting}
              onClick={handleCreateTopic}
            >
              {submitting ? 'Creating...' : 'Post Topic'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
