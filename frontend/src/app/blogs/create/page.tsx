'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Save, Send, UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

export default function CreateBlogPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (publishStatus: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim() || !content.trim()) {
      setError('Both blog title and content are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await kmsApi.blogs.create({
        title: title.trim(),
        content: content.trim(),
        category,
        coverImageUrl: coverImageUrl.trim() || undefined,
        status: publishStatus,
      });
      router.push('/blogs');
    } catch (err: any) {
      setError(err.message || 'Failed to create blog post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <Breadcrumb items={[{ label: 'Blogs & News', href: '/blogs' }, { label: 'Create Post' }]} />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Create Blog Post</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
            >
              Save Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="w-4 h-4" />}
              disabled={isSubmitting}
              onClick={() => handleSubmit('PUBLISHED')}
            >
              {isSubmitting ? 'Publishing...' : 'Publish Post'}
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
              placeholder="e.g. Q3 Technical Milestones & Security Architecture Overview"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Cover Image</label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Paste image URL or select from computer..."
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Blog Content (Markdown supported)</label>
            <textarea
              rows={14}
              placeholder="Write your article content here..."
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
