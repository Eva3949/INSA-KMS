'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import {
  Upload,
  FileText,
  FileCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Files,
  X,
  Tag,
  ExternalLink,
  ShieldCheck,
  Building2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

export default function UploadDocumentPage() {
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');

  // Single Upload State
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleTitle, setSingleTitle] = useState('');
  const [singleTags, setSingleTags] = useState('');

  // Bulk Upload State
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkTitles, setBulkTitles] = useState<Record<number, string>>({});
  const [bulkTags, setBulkTags] = useState('');

  // Common Metadata
  const [department, setDepartment] = useState('Engineering');
  const [classification, setClassification] = useState('INTERNAL');
  const [documentType, setDocumentType] = useState('');

  // Dynamic Metadata Fields
  const [documentTypes, setDocumentTypes] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [customFields, setCustomFields] = useState<Array<{ id: string; fieldKey: string; label: string; dataType: string; required: boolean }>>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);

  // Upload Status & Feedback
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<Array<{
    name: string;
    success: boolean;
    message: string;
    documentId?: string;
    title?: string;
  }> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load active departments
  useEffect(() => {
    kmsApi.departments
      .getActive()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as any)?.content || [];
        setDepartments(list);
        if (list.length > 0 && !department) {
          setDepartment(list[0].name);
        }
      })
      .catch(() => {
        setDepartments([
          { id: '1', name: 'Engineering', code: 'ENG' },
          { id: '2', name: 'IT Security', code: 'ITSEC' },
          { id: '3', name: 'Human Resources', code: 'HR' },
          { id: '4', name: 'Finance', code: 'FIN' },
          { id: '5', name: 'Legal & Compliance', code: 'LEGAL' },
          { id: '6', name: 'Content Management', code: 'CONTENT' },
        ]);
      });
  }, []);

  // Load active document types
  useEffect(() => {
    kmsApi.documentTypes
      .getActive()
      .then((types) => {
        const list = Array.isArray(types) ? types : (types as any)?.content || [];
        setDocumentTypes(list);
        if (list.length > 0) {
          setSelectedTypeId(list[0].id);
          setDocumentType(list[0].name);
        }
      })
      .catch(() => {});
  }, []);

  // Load type-specific fields
  useEffect(() => {
    if (!selectedTypeId) {
      setCustomFields([]);
      setCustomFieldValues({});
      return;
    }
    kmsApi.admin
      .listTypeFields(selectedTypeId)
      .then((fields) => {
        setCustomFields(fields);
        setCustomFieldValues((prev) => {
          const next: Record<string, string> = {};
          fields.forEach((f) => {
            next[f.fieldKey] = prev[f.fieldKey] || '';
          });
          return next;
        });
      })
      .catch(() => {
        setCustomFields([]);
        setCustomFieldValues({});
      });
  }, [selectedTypeId]);

  const handleDocumentTypeChange = useCallback(
    (typeName: string) => {
      setDocumentType(typeName);
      const match = documentTypes.find((dt) => dt.name === typeName);
      setSelectedTypeId(match?.id || '');
    },
    [documentTypes]
  );

  const resolveDeptCode = (deptName: string): string => {
    const matched = departments.find((d) => d.name === deptName);
    if (matched?.code) return matched.code;
    const fallbackMap: Record<string, string> = {
      Engineering: 'ENG',
      'IT Security': 'ITSEC',
      'Human Resources': 'HR',
      Finance: 'FIN',
      'Legal & Compliance': 'LEGAL',
      'Content Management': 'CONTENT',
    };
    return fallbackMap[deptName] || 'GEN';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadMode === 'single') {
      const f = files[0];
      setSingleFile(f);
      if (!singleTitle) {
        setSingleTitle(f.name.replace(/\.[^/.]+$/, ''));
      }
    } else {
      const newFiles = Array.from(files);
      setBulkFiles((prev) => {
        const combined = [...prev, ...newFiles];
        // Initialize default titles for new files
        setBulkTitles((tPrev) => {
          const updated = { ...tPrev };
          combined.forEach((file, idx) => {
            if (!updated[idx]) {
              updated[idx] = file.name.replace(/\.[^/.]+$/, '');
            }
          });
          return updated;
        });
        return combined;
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    if (uploadMode === 'single') {
      const f = files[0];
      setSingleFile(f);
      if (!singleTitle) {
        setSingleTitle(f.name.replace(/\.[^/.]+$/, ''));
      }
    } else {
      setBulkFiles((prev) => {
        const combined = [...prev, ...files];
        setBulkTitles((tPrev) => {
          const updated = { ...tPrev };
          combined.forEach((file, idx) => {
            if (!updated[idx]) {
              updated[idx] = file.name.replace(/\.[^/.]+$/, '');
            }
          });
          return updated;
        });
        return combined;
      });
    }
  };

  const removeBulkFile = (index: number) => {
    setBulkFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setBulkTitles((tPrev) => {
        const updated: Record<number, string> = {};
        next.forEach((_, newIdx) => {
          const oldIdx = newIdx >= index ? newIdx + 1 : newIdx;
          if (tPrev[oldIdx]) updated[newIdx] = tPrev[oldIdx];
        });
        return updated;
      });
      return next;
    });
  };

  // Form submission: handles single upload & bulk upload cleanly
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingRequired = customFields.filter((f) => f.required && !customFieldValues[f.fieldKey]?.trim());
    if (missingRequired.length > 0) {
      setErrorMessage(`Required fields must be filled: ${missingRequired.map((f) => f.label).join(', ')}`);
      return;
    }

    const deptCode = resolveDeptCode(department);

    if (uploadMode === 'single') {
      if (!singleFile) {
        setErrorMessage('Please select a file to upload.');
        return;
      }

      setIsUploading(true);
      setUploadProgress(25);
      setErrorMessage(null);
      setUploadResult(null);

      try {
        const formData = new FormData();
        formData.append('file', singleFile);
        if (singleTitle) formData.append('title', singleTitle);
        formData.append('departmentCode', deptCode);
        formData.append('documentTypeName', documentType);
        formData.append('confidentialityLevel', classification);

        if (singleTags) {
          singleTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .forEach((tag) => formData.append('tags', tag));
        }

        Object.entries(customFieldValues).forEach(([fieldKey, value]) => {
          if (value) formData.append(`metadata.${fieldKey}`, value);
        });

        setUploadProgress(65);
        const res = await kmsApi.documents.upload(formData);
        setUploadProgress(100);

        setUploadResult([
          {
            name: singleFile.name,
            success: true,
            message: 'Uploaded successfully.',
            documentId: res.id,
            title: res.title || singleTitle || singleFile.name,
          },
        ]);
        setUploadSuccess(true);
        setSingleFile(null);
        setSingleTitle('');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setErrorMessage(msg);
        setUploadResult([{ name: singleFile.name, success: false, message: msg }]);
      } finally {
        setIsUploading(false);
      }
    } else {
      // Bulk Upload
      if (bulkFiles.length === 0) {
        setErrorMessage('Please select at least one file for bulk upload.');
        return;
      }

      setIsUploading(true);
      setUploadProgress(20);
      setErrorMessage(null);
      setUploadResult(null);

      try {
        const formData = new FormData();
        bulkFiles.forEach((f, idx) => {
          formData.append('files', f);
          const t = bulkTitles[idx] || f.name.replace(/\.[^/.]+$/, '');
          formData.append('titles', t);
        });

        formData.append('departmentCode', deptCode);
        formData.append('documentTypeName', documentType);
        formData.append('confidentialityLevel', classification);

        if (bulkTags) {
          bulkTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .forEach((tag) => formData.append('tags', tag));
        }

        Object.entries(customFieldValues).forEach(([fieldKey, value]) => {
          if (value) formData.append(`metadata.${fieldKey}`, value);
        });

        setUploadProgress(60);
        const res = await kmsApi.documents.bulkUpload(formData);
        setUploadProgress(100);

        const items: Array<{
          name: string;
          success: boolean;
          message: string;
          documentId?: string;
          title?: string;
        }> = (res.items || []).map((item: any) => ({
          name: item.fileName,
          success: item.success,
          message: item.message,
          documentId: item.documentId,
          title: item.title,
        }));

        setUploadResult(items);
        if (items.some((it) => it.success)) {
          setUploadSuccess(true);
        }
        setBulkFiles([]);
        setBulkTitles({});
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bulk upload failed';
        setErrorMessage(msg);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const resetForm = () => {
    setUploadSuccess(false);
    setErrorMessage(null);
    setUploadResult(null);
    setSingleFile(null);
    setSingleTitle('');
    setBulkFiles([]);
    setBulkTitles({});
    setCustomFieldValues({});
  };

  const successCount = uploadResult?.filter((r) => r.success).length || 0;
  const failureCount = uploadResult?.filter((r) => !r.success).length || 0;

  return (
    <AppShell>
      <div className="space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Document Library', href: '/library' }, { label: 'Upload Document' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-700" />
              Document Upload &amp; Registration
            </h1>
          </div>
          <Link href="/articles/create">
            <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />}>
              Create Article Instead
            </Button>
          </Link>
        </div>

        {/* Upload Mode Selector */}
        {!uploadSuccess && (
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200 w-full sm:w-auto self-start">
            <button
              type="button"
              onClick={() => {
                setUploadMode('single');
                setErrorMessage(null);
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                uploadMode === 'single'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Single Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('bulk');
                setErrorMessage(null);
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                uploadMode === 'bulk'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Files className="w-3.5 h-3.5" />
              Bulk Upload
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800 font-bold">
                Batch
              </span>
            </button>
          </div>
        )}

        {/* Success / Result View */}
        {uploadSuccess ? (
          <Card className="p-6 sm:p-8 bg-emerald-50/40 border border-emerald-300 space-y-5">
            <div className="text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-950">
                {uploadMode === 'bulk' ? 'Bulk Upload Complete' : 'Upload & Registration Complete'}
              </h3>
              <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                Documents submitted for review. They will remain under review until approved by a designated reviewer.
                You can track their status under My Documents &amp; My Submissions.
              </p>
            </div>

            {/* Bulk summary badge row */}
            {uploadMode === 'bulk' && uploadResult && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{successCount} Succeeded</span>
                </div>
                {failureCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-800 font-semibold text-xs border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>{failureCount} Failed</span>
                  </div>
                )}
              </div>
            )}

            {/* Individual Item Results */}
            {uploadResult && uploadResult.length > 0 && (
              <div className="space-y-2 bg-white p-4 rounded-lg border border-slate-200 max-h-72 overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Processed Files</h4>
                <div className="space-y-2">
                  {uploadResult.map((r, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded text-xs border ${
                        r.success
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {r.success ? (
                          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span className="font-semibold truncate">{r.title || r.name}</span>
                        {r.title && r.title !== r.name && (
                          <span className="text-[11px] text-slate-400 truncate">({r.name})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <span className={`text-[11px] ${r.success ? 'text-emerald-700' : 'text-red-700 font-medium'}`}>
                          {r.message}
                        </span>
                        {r.success && r.documentId && (
                          <Link href={`/preview/${r.documentId}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium underline">
                            Preview
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href="/library">
                <Button variant="outline" size="sm">
                  Return to Document Library
                </Button>
              </Link>
              <Button variant="primary" size="sm" onClick={resetForm}>
                Upload More Files
              </Button>
            </div>
          </Card>
        ) : (
          /* Upload Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. File Selection / Dropzone */}
            <Card
              title={
                uploadMode === 'single'
                  ? '1. Select Document File'
                  : `1. Select Multiple Document Files (${bulkFiles.length} selected)`
              }
            >
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : (uploadMode === 'single' && singleFile) || (uploadMode === 'bulk' && bulkFiles.length > 0)
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={uploadMode === 'bulk'}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.rar"
                />

                {uploadMode === 'single' && singleFile ? (
                  <div className="space-y-2">
                    <FileCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-sm font-semibold text-emerald-900">{singleFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(singleFile.size / 1024).toFixed(0)} KB — Click or drag to change file
                    </p>
                  </div>
                ) : uploadMode === 'bulk' && bulkFiles.length > 0 ? (
                  <div className="space-y-2">
                    <Files className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-sm font-semibold text-emerald-900">{bulkFiles.length} file(s) staged for bulk upload</p>
                    <p className="text-xs text-slate-500">Click or drag more files to add to batch</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">
                      Drag &amp; drop {uploadMode === 'bulk' ? 'multiple files' : 'a file'} here, or{' '}
                      <span className="text-blue-600 underline">browse files</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports PDF, Word, Excel, PowerPoint, Text, CSV, Images, and Archives
                    </p>
                  </>
                )}
              </div>

              {/* Bulk Files Staging List with Per-File Title Overrides */}
              {uploadMode === 'bulk' && bulkFiles.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Staged Files &amp; Titles ({bulkFiles.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkFiles([]);
                        setBulkTitles({});
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {bulkFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-slate-800 truncate block">{file.name}</span>
                            <span className="text-[11px] text-slate-400">
                              {(file.size / 1024).toFixed(0)} KB • {file.type || 'Binary file'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            placeholder="Custom Document Title"
                            value={bulkTitles[idx] || ''}
                            onChange={(e) =>
                              setBulkTitles((prev) => ({ ...prev, [idx]: e.target.value }))
                            }
                            className="flex-1 sm:w-56 px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBulkFile(idx);
                            }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded font-bold shrink-0"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* 2. Metadata Registration */}
            <Card title={uploadMode === 'bulk' ? '2. Common Metadata Registration' : '2. Mandatory Metadata Registration'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uploadMode === 'single' && (
                  <Input
                    label="Document Title"
                    value={singleTitle}
                    onChange={(e) => setSingleTitle(e.target.value)}
                    placeholder="e.g. Standard Operating Procedure 2026"
                    required
                  />
                )}

                <Select
                  label="Responsible Department"
                  options={
                    departments.length > 0
                      ? departments.map((d) => ({ label: d.name, value: d.name }))
                      : [
                          { label: 'Engineering', value: 'Engineering' },
                          { label: 'IT Security', value: 'IT Security' },
                          { label: 'Human Resources', value: 'Human Resources' },
                          { label: 'Finance', value: 'Finance' },
                        ]
                  }
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />

                <Select
                  label="Confidentiality Classification Label"
                  options={[
                    { label: 'INTERNAL (Default)', value: 'INTERNAL' },
                    { label: 'CONFIDENTIAL (Restricted Access)', value: 'CONFIDENTIAL' },
                    { label: 'RESTRICTED (Executive Only)', value: 'RESTRICTED' },
                    { label: 'PUBLIC (Unrestricted)', value: 'PUBLIC' },
                  ]}
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                />

                <Select
                  label="Document Type Category"
                  options={documentTypes.map((dt) => ({ label: dt.name, value: dt.name }))}
                  value={documentType}
                  onChange={(e) => handleDocumentTypeChange(e.target.value)}
                />

                <Input
                  label="Document Tags (Comma-separated)"
                  value={uploadMode === 'single' ? singleTags : bulkTags}
                  onChange={(e) =>
                    uploadMode === 'single' ? setSingleTags(e.target.value) : setBulkTags(e.target.value)
                  }
                  placeholder="e.g. Policy, Compliance, 2026"
                />
              </div>
            </Card>

            {/* 3. Type-Specific Custom Metadata */}
            {customFields.length > 0 && (
              <Card title="3. Type-Specific Metadata">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map((field) => (
                    <Input
                      key={field.id}
                      label={field.label + (field.required ? ' *' : '')}
                      value={customFieldValues[field.fieldKey] || ''}
                      onChange={(e) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      required={field.required}
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Upload Progress Banner */}
            {isUploading && (
              <div className="bg-kms-slate-900 text-white p-4 rounded-lg shadow-lg space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    {uploadMode === 'bulk'
                      ? `Uploading ${bulkFiles.length} file(s) & calculating SHA-256 checksums...`
                      : 'Uploading document & calculating SHA-256 checksum...'}
                  </span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-kms-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Toolbar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/library">
                <Button variant="outline" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={
                  (uploadMode === 'single' ? !singleFile : bulkFiles.length === 0) ||
                  isUploading ||
                  customFields.some((f) => f.required && !customFieldValues[f.fieldKey]?.trim())
                }
                icon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              >
                {isUploading
                  ? 'Uploading...'
                  : uploadMode === 'bulk'
                  ? `Bulk Upload (${bulkFiles.length} Files)`
                  : 'Upload Document'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
