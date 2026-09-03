'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Badge } from '@/src/components/ui/Badge';
import { Modal } from '@/src/components/ui/Modal';
import { 
  Send, 
  Save, 
  Eye, 
  PenSquare, 
  Columns, 
  Image as ImageIcon, 
  Video, 
  Heading, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Code, 
  Link as LinkIcon, 
  Table as TableIcon, 
  Quote, 
  UploadCloud, 
  X,
  FileText
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import { RichMarkdownRenderer } from '@/src/components/articles/RichMarkdownRenderer';

export default function CreateArticlePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Engineering & Infrastructure');
  const [knowledgeType, setKnowledgeType] = useState('SOP');
  const [customKnowledgeType, setCustomKnowledgeType] = useState('');
  const [confidentialityLevel, setConfidentialityLevel] = useState('INTERNAL');
  const [reviewFrequencyDays, setReviewFrequencyDays] = useState(365);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['SOP', 'Production']);
  const [content, setContent] = useState('');

  // Dynamic Document Categories & Types from Database
  const [categoryOptions, setCategoryOptions] = useState<Array<{ label: string; value: string }>>([
    { label: 'Engineering & Infrastructure', value: 'Engineering & Infrastructure' },
    { label: 'Security Operations', value: 'Security Operations' },
    { label: 'Compliance & Policy', value: 'Compliance & Policy' },
    { label: 'Human Resources', value: 'Human Resources' },
    { label: 'General Knowledge', value: 'General Knowledge' },
  ]);
  const [knowledgeTypeOptions, setKnowledgeTypeOptions] = useState<Array<{ label: string; value: string }>>([
    { label: 'SOP', value: 'SOP' },
    { label: 'Policy', value: 'Policy' },
    { label: 'Article', value: 'Article' },
    { label: 'Guide', value: 'Guide' },
    { label: 'Troubleshooting', value: 'Troubleshooting' },
    { label: '+ Other (Custom)...', value: 'OTHER' },
  ]);

  useEffect(() => {
    kmsApi.documentTypes
      .getActive()
      .then((types) => {
        const list = Array.isArray(types) ? types : (types as any)?.content || [];
        if (list.length > 0) {
          const opts = list.map((t: any) => ({
            label: t.name,
            value: t.name,
          }));
          setCategoryOptions(opts);
          setKnowledgeTypeOptions((prev) => {
            const builtIns = prev.filter((p) => p.value !== 'OTHER');
            opts.forEach((o: { label: string; value: string }) => {
              if (!builtIns.some((c) => c.value.toLowerCase() === o.value.toLowerCase())) {
                builtIns.push(o);
              }
            });
            return [...builtIns, { label: '+ Other (Custom)...', value: 'OTHER' }];
          });
          setCategory((prev) => {
            if (!prev || !opts.some((o: { label: string; value: string }) => o.value === prev)) {
              return opts[0].value;
            }
            return prev;
          });
        }
      })
      .catch(() => {});
  }, []);

  const [editorMode, setEditorMode] = useState<'write' | 'preview' | 'split'>('write');
  const [requiredReviewer, setRequiredReviewer] = useState('Department leads');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Media Upload Modal
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (!tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    setContent((prev) => prev + prefix + suffix);
  };

  const handleMediaUpload = async () => {
    if (!selectedFile) return;
    setMediaUploading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await kmsApi.documents.uploadMedia(formData);
      const url = res.url;
      const isVideo = selectedFile.type.startsWith('video/') || selectedFile.name.endsWith('.mp4') || selectedFile.name.endsWith('.webm');

      if (isVideo) {
        insertFormatting(`\n\n<video controls src="${url}" class="w-full rounded border my-4"></video>\n\n`);
      } else {
        insertFormatting(`\n\n![${selectedFile.name}](${url})\n\n`);
      }
      setIsMediaModalOpen(false);
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload media file.');
    } finally {
      setMediaUploading(false);
    }
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!title.trim()) {
      setErrorMessage('Article title is required.');
      return;
    }
    const effectiveKnowledgeType = knowledgeType === 'OTHER'
      ? customKnowledgeType.trim()
      : knowledgeType;

    if (knowledgeType === 'OTHER' && !effectiveKnowledgeType) {
      setErrorMessage('Please enter a name for the custom knowledge type.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await kmsApi.documents.createArticle({
        title: title.trim(),
        category,
        knowledgeType: effectiveKnowledgeType || 'Article',
        confidentialityLevel,
        reviewFrequencyDays,
        executiveSummary,
        tags: tags.join(', '),
        content,
        isDraft,
      });
      router.push('/library');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save article.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-kms-slate-200 pb-4">
          <div>
            <Breadcrumb items={[{ label: 'Knowledge' }, { label: 'Create Article' }]} />
            <h1 className="text-2xl font-extrabold text-kms-slate-900 tracking-tight">Create article</h1>
            <p className="text-xs text-kms-slate-500 mt-1">
              Draft a new SOP, policy, or knowledge article. Submit for structured review.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="w-4 h-4" />}
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
            >
              {isSubmitting ? 'Submitting...' : 'Submit for review'}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Title & Metadata Inputs */}
            <div className="bg-white p-5 rounded-lg border border-kms-slate-200 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Article title</label>
                <Input
                  placeholder="e.g. Linux Server Hardening – Production SOP"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Category</label>
                  <Select
                    options={categoryOptions}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Knowledge type</label>
                  <Select
                    options={knowledgeTypeOptions}
                    value={knowledgeType}
                    onChange={(e) => {
                      setKnowledgeType(e.target.value);
                      if (e.target.value !== 'OTHER') {
                        setCustomKnowledgeType('');
                      }
                    }}
                    className="w-full text-xs"
                  />
                  {knowledgeType === 'OTHER' && (
                    <div className="mt-2 animate-in fade-in duration-200">
                      <Input
                        placeholder="Enter custom knowledge type (e.g. Runbook, Case Study)..."
                        value={customKnowledgeType}
                        onChange={(e) => setCustomKnowledgeType(e.target.value)}
                        className="w-full text-xs"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Confidentiality</label>
                  <Select
                    options={[
                      { label: 'Internal', value: 'INTERNAL' },
                      { label: 'Public', value: 'PUBLIC' },
                      { label: 'Confidential', value: 'CONFIDENTIAL' },
                      { label: 'Restricted', value: 'RESTRICTED' },
                    ]}
                    value={confidentialityLevel}
                    onChange={(e) => setConfidentialityLevel(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Review frequency (days)</label>
                  <Input
                    type="number"
                    value={reviewFrequencyDays}
                    onChange={(e) => setReviewFrequencyDays(Number(e.target.value))}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Executive summary</label>
                <textarea
                  rows={3}
                  placeholder="Describe the purpose, scope, and key instructions in 1-3 sentences."
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  className="w-full text-xs p-2.5 border border-kms-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Tags</label>
                <div className="flex flex-wrap items-center gap-2 border border-kms-slate-300 p-2 rounded bg-white">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-kms-slate-100 text-kms-slate-800 text-xs px-2 py-0.5 rounded font-medium border border-kms-slate-200">
                      {t}
                      <button onClick={() => handleRemoveTag(t)} className="hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tags (press Enter)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="text-xs outline-none flex-1 min-w-[150px] bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Article Content Editor Workspace */}
            <div className="bg-white p-5 rounded-lg border border-kms-slate-200 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-kms-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-kms-slate-900">Article content</h3>
                  <p className="text-[11px] text-kms-slate-500">
                    Full Markdown supported (headings, bold, italics, tables, images, code blocks, videos)
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-kms-slate-100 p-1 rounded-lg border border-kms-slate-200">
                  <button
                    onClick={() => setEditorMode('write')}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                      editorMode === 'write' ? 'bg-blue-600 text-white shadow-xs' : 'text-kms-slate-600 hover:text-kms-slate-900'
                    }`}
                  >
                    <PenSquare className="w-3.5 h-3.5" />
                    Write
                  </button>
                  <button
                    onClick={() => setEditorMode('preview')}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                      editorMode === 'preview' ? 'bg-blue-600 text-white shadow-xs' : 'text-kms-slate-600 hover:text-kms-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Live Preview
                  </button>
                  <button
                    onClick={() => setEditorMode('split')}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                      editorMode === 'split' ? 'bg-blue-600 text-white shadow-xs' : 'text-kms-slate-600 hover:text-kms-slate-900'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    Split
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              {editorMode !== 'preview' && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-kms-slate-50 p-2 rounded border border-kms-slate-200">
                  <div className="flex items-center gap-1">
                    <button onClick={() => insertFormatting('### Heading Name\n')} title="Heading" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <Heading className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('**', '**')} title="Bold" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <Bold className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('*', '*')} title="Italic" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <Italic className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('<u>', '</u>')} title="Underline" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <Underline className="w-4 h-4" />
                    </button>
                    <span className="h-4 w-px bg-kms-slate-300 mx-1" />
                    <button onClick={() => insertFormatting('\n- ')} title="Bullet List" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <List className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('\n1. ')} title="Numbered List" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('\n```\n', '\n```')} title="Code Block" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <Code className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('[Link Title](https://example.com)')} title="Link" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <LinkIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n')} title="Table" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <TableIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertFormatting('\n> ')} title="Quote" className="p-1.5 hover:bg-white rounded text-kms-slate-700">
                      <Quote className="w-4 h-4" />
                    </button>
                    <span className="h-4 w-px bg-kms-slate-300 mx-1" />
                    <button onClick={() => setIsMediaModalOpen(true)} title="Upload Image or Video" className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-semibold flex items-center gap-1 text-xs">
                      <ImageIcon className="w-4 h-4" />
                      <Video className="w-4 h-4" />
                      <span>Upload Media</span>
                    </button>
                  </div>

                  <span className="text-xs text-kms-slate-400 font-medium">{wordCount} words</span>
                </div>
              )}

              {/* Editor / Preview Body */}
              <div className={`grid gap-4 ${editorMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {editorMode !== 'preview' && (
                  <textarea
                    rows={16}
                    placeholder="Write your article using Markdown. Click any toolbar button above to insert formatted text, lists, code blocks, images, tables, etc..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full text-xs font-mono p-3 border border-kms-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                  />
                )}

                {editorMode !== 'write' && (
                  <div className="p-4 border border-kms-slate-200 rounded-md bg-kms-slate-50 min-h-[300px] overflow-auto text-xs text-kms-slate-800">
                    <h4 className="text-xs font-bold text-kms-slate-400 uppercase tracking-wider mb-2">Live Preview</h4>
                    <RichMarkdownRenderer content={content} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Publication Settings */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white p-5 rounded-lg border border-kms-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-kms-slate-900 uppercase tracking-wider border-b border-kms-slate-100 pb-2">
                Publication settings
              </h3>

              <div>
                <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Author</label>
                <Input
                  readOnly
                  value={user?.username ? `${user.username} (Author)` : 'Kavita Manager'}
                  className="w-full text-xs bg-kms-slate-50 border-kms-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Department</label>
                <Input
                  readOnly
                  value="Knowledge Management"
                  className="w-full text-xs bg-kms-slate-50 border-kms-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-kms-slate-700 mb-1">Required reviewers</label>
                <Select
                  options={[
                    { label: 'Department leads', value: 'Department leads' },
                    { label: 'Security Reviewers', value: 'Security Reviewers' },
                    { label: 'Compliance Officers', value: 'Compliance Officers' },
                  ]}
                  value={requiredReviewer}
                  onChange={(e) => setRequiredReviewer(e.target.value)}
                  className="w-full text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Upload Modal */}
      <Modal isOpen={isMediaModalOpen} onClose={() => setIsMediaModalOpen(false)} title="Upload Image or Video to Article">
        <div className="space-y-4">
          <p className="text-xs text-kms-slate-600">
            Select a picture (.png, .jpg, .webp) or video file (.mp4, .webm) to upload and insert into your article.
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-kms-slate-300 hover:border-blue-500 p-6 rounded-lg text-center cursor-pointer bg-kms-slate-50 transition-colors"
          >
            <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <span className="text-xs font-medium text-kms-slate-800">
              {selectedFile ? selectedFile.name : 'Click to select picture or video file'}
            </span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsMediaModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedFile || mediaUploading}
              onClick={handleMediaUpload}
            >
              {mediaUploading ? 'Uploading...' : 'Insert into Article'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
