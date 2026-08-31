'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { Upload, FileText, FileCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

export default function UploadDocumentPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [classification, setClassification] = useState('INTERNAL');
  const [documentType, setDocumentType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ name: string; success: boolean; message: string }[] | null>(null);

  const [documentTypes, setDocumentTypes] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [customFields, setCustomFields] = useState<Array<{ id: string; fieldKey: string; label: string; dataType: string; required: boolean }>>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);

  useEffect(() => {
    kmsApi.admin.getDepartments()
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
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

  useEffect(() => {
    kmsApi.admin.getDocumentTypes().then((types) => {
      setDocumentTypes(types);
      if (types.length > 0) {
        setSelectedTypeId(types[0].id);
        setDocumentType(types[0].name);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTypeId) {
      setCustomFields([]);
      setCustomFieldValues({});
      return;
    }
    kmsApi.admin.listTypeFields(selectedTypeId).then((fields) => {
      setCustomFields(fields);
      setCustomFieldValues((prev) => {
        const next: Record<string, string> = {};
        fields.forEach((f) => {
          next[f.fieldKey] = prev[f.fieldKey] || '';
        });
        return next;
      });
    }).catch(() => {
      setCustomFields([]);
      setCustomFieldValues({});
    });
  }, [selectedTypeId]);

  const handleDocumentTypeChange = useCallback((typeName: string) => {
    setDocumentType(typeName);
    const match = documentTypes.find((dt) => dt.name === typeName);
    setSelectedTypeId(match?.id || '');
  }, [documentTypes]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
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
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    const missingRequired = customFields.filter((f) => f.required && !customFieldValues[f.fieldKey]?.trim());
    if (missingRequired.length > 0) {
      setErrorMessage(`Required fields must be filled: ${missingRequired.map((f) => f.label).join(', ')}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);
    setUploadResult(null);

    const results: { name: string; success: boolean; message: string }[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress(Math.round((i / selectedFiles.length) * 100));

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (title) {
          formData.append('title', title);
        }

        let deptCode = 'GEN';
        const matchedDept = departments.find((d) => d.name === department);
        if (matchedDept?.code) {
          deptCode = matchedDept.code;
        } else {
          const fallbackMap: Record<string, string> = {
            'Engineering': 'ENG',
            'IT Security': 'ITSEC',
            'Human Resources': 'HR',
            'Finance': 'FIN',
            'Legal & Compliance': 'LEGAL',
            'Content Management': 'CONTENT',
          };
          deptCode = fallbackMap[department] || 'GEN';
        }

        formData.append('departmentCode', deptCode);
        formData.append('documentTypeName', documentType);
        formData.append('confidentialityLevel', classification);

        Object.entries(customFieldValues).forEach(([fieldKey, value]) => {
          if (value) {
            formData.append(`metadata.${fieldKey}`, value);
          }
        });

        await kmsApi.documents.upload(formData);
        results.push({ name: file.name, success: true, message: 'Uploaded successfully' });
      } catch (err: unknown) {
        results.push({ name: file.name, success: false, message: err instanceof Error ? err.message : 'Upload failed' });
      }
    }

    setUploadProgress(100);
    setUploadResult(results);
    setSelectedFiles([]);
    setIsUploading(false);
    if (results.every((r) => r.success)) {
      setUploadSuccess(true);
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Document Library', href: '/library' }, { label: 'Upload Document' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-700" />
              Upload Document & Metadata Registration
            </h1>
          </div>
          <Link href="/articles/create">
            <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />}>
              Create Article Instead
            </Button>
          </Link>
        </div>

        {uploadSuccess ? (
          <Card className="p-8 text-center bg-emerald-50/50 border border-emerald-300 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-emerald-900">Upload & Registration Complete</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Document submitted for review. It stays hidden from the Document Library until it is
                approved by a reviewer. You can track its status under My Documents &amp; My Submissions.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/library">
                <Button variant="outline" size="sm">
                  Return to Document Library
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setUploadSuccess(false);
                  setSelectedFiles([]);
                  setTitle('');
                  setCustomFieldValues({});
                  setErrorMessage(null);
                  setUploadResult(null);
                }}
              >
                Upload Another File
              </Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {/* Drag & Drop Zone */}
            <Card title="1. Select Document File">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : selectedFiles.length > 0
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.rar"
                />
                {selectedFiles.length > 0 ? (
                  <div className="space-y-2">
                    <FileCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-sm font-semibold text-emerald-800">{selectedFiles.length} file(s) selected</p>
                    <p className="text-xs text-slate-500">Click or drag more files to add</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">
                      Drag & drop files here, or <span className="text-blue-600">browse files</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supports PDF, Office docs, images, and archives</p>
                  </>
                )}
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Selected Files</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate font-medium text-slate-800">{file.name}</span>
                          <span className="text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="text-red-500 hover:text-red-700 font-bold ml-2 shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Mandatory Metadata Form */}
            <Card title="2. Mandatory Metadata Registration">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Document Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Standard Operating Procedure 2026"
                  required
                />
                <Select
                  label="Responsible Department"
                  options={departments.length > 0
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
              </div>
            </Card>

            {customFields.length > 0 && (
              <Card title="3. Type-Specific Metadata">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map((field) => (
                    <Input
                      key={field.id}
                      label={field.label + (field.required ? ' *' : '')}
                      value={customFieldValues[field.fieldKey] || ''}
                      onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      required={field.required}
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Progress Drawer Header */}
            {isUploading && (
              <div className="bg-kms-slate-900 text-white p-4 rounded shadow-lg space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    Uploading & Calculating SHA-256 Checksum...
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

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/library">
                <Button variant="outline" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={selectedFiles.length === 0 || isUploading || customFields.some((f) => f.required && !customFieldValues[f.fieldKey]?.trim())}
                icon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              >
                {isUploading
                  ? `Uploading ${selectedFiles.length} file(s)...`
                  : `Upload ${selectedFiles.length > 0 ? selectedFiles.length + ' File(s)' : ''}`}
              </Button>
            </div>

            {/* Upload Results */}
            {uploadResult && uploadResult.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upload Results</h3>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {uploadResult.map((r, idx) => (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded text-xs border ${r.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      {r.success ? <FileCheck className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span className="font-medium truncate">{r.name}</span>
                      <span className="ml-auto shrink-0">{r.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </AppShell>
  );
}
