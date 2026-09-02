'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Save, UploadCloud, Loader2 } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const id = params.id as string;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('DRAFT');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    kmsApi.blogs.getById(id)
      .then((data) => {
        setTitle(data.title || '');
        setCategory(data.category || 'General');
        setCoverImageUrl(data.coverImageUrl || '');
        setContent(data.content || '');
        setStatus(data.status || 'DRAFT');
      })
      .catch((err) => setError(err.message || 'Failed to fetch blog post'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await kmsApi.documents.uploadMedia(formData);
      if (res && res.url) {
        setCoverImageUrl(res.url);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover image file.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content cannot be empty.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await kmsApi.blogs.update(id, {
        title: title.trim(),
        content: content.trim(),
        category,
        coverImageUrl: coverImageUrl.trim() || undefined,
        status,
      });
      router.push(`/blogs/${id}`);
    } catch (err: any) {
      setError(err.message || 'Update failed.');
    } finally {
      setSubmitting(false);
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

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <Breadcrumb items={[{ label: 'Blogs & News', href: '/blogs' }, { label: title || 'Edit Blog' }]} />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Edit Blog Post</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push(`/blogs/${id}`)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <Select
                options={[
                  { label: 'General', value: 'General' },
                  { label: 'Engineering', value: 'Engineering' },
                  { label: 'Security & Compliance', value: 'Security' },
                  { label: 'Company News', value: 'News' },
                ]}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <Select
                options={[
                  { label: 'Draft', value: 'DRAFT' },
                  { label: 'Published', value: 'PUBLISHED' },
                ]}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cover Image</label>
              <div className="flex items-center gap-2">
                <Input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="URL or select from file manager..."
                  className="flex-1 text-xs"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingImage}
                  icon={isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingImage ? 'Uploading...' : 'Browse...'}
                </Button>
              </div>
            </div>
          </div>

          {coverImageUrl && (
            <div className="relative rounded-md overflow-hidden max-h-48 border border-slate-200 bg-slate-50">
              <img src={coverImageUrl} alt="Cover Preview" className="w-full h-48 object-cover" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Content</label>
            <textarea
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
