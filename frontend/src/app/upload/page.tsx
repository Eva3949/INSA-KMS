'use client';

import React, { useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

export default function UploadDocumentPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [classification, setClassification] = useState('INTERNAL');
  const [documentType, setDocumentType] = useState('Policy');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (title) {
        formData.append('title', title);
      }

      const deptCodeMap: Record<string, string> = {
        'Engineering': 'ITSEC',
        'IT Security': 'ITSEC',
        'Human Resources': 'CONTENT',
        'Finance': 'LEGAL',
        'Legal & Compliance': 'LEGAL',
        'Content Management': 'CONTENT'
      };
      const deptCode = deptCodeMap[department] || 'GEN';

      formData.append('departmentCode', deptCode);
      formData.append('documentTypeName', documentType);
      formData.append('confidentialityLevel', classification);

      setUploadProgress(60);
      await kmsApi.documents.upload(formData);
      setUploadProgress(100);
      setIsUploading(false);
      setUploadSuccess(true);
    } catch (err: unknown) {
      setIsUploading(false);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload document');
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb items={[{ label: 'Document Library', href: '/library' }, { label: 'Upload Document' }]} />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-700" />
            Upload Document & Metadata Registration
          </h1>
        </div>

        {uploadSuccess ? (
          <Card className="p-8 text-center bg-emerald-50/50 border border-emerald-300 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-emerald-900">Upload & Registration Complete</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Binary payload stored with SHA-256 integrity verification. Queued for background Apache Tika OCR extraction.
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
                  setSelectedFile(null);
                  setTitle('');
                }}
              >
                Upload Another File
              </Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleStartUpload} className="space-y-5">
            {errorMessage && (
              <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {/* Drag & Drop Zone */}
            <Card title="1. Select Document File">
              <div className="border-2 border-dashed border-kms-slate-300 hover:border-blue-500 rounded-lg p-8 text-center bg-kms-slate-50 hover:bg-blue-50/30 transition-all cursor-pointer relative">
                <input
                  type="file"
                  onChange={handleFileDrop}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
                <Upload className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-kms-slate-900 flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4 text-blue-700" />
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-kms-slate-500 font-mono">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || 'Binary File'}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-kms-slate-800">
                      Drag and drop your document here, or <span className="text-blue-700 underline">browse files</span>
                    </p>
                    <p className="text-[11px] text-kms-slate-500 mt-1">
                      Supports PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP (Max 500 MB)
                    </p>
                  </div>
                )}
              </div>
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
                  options={[
                    { label: 'Engineering', value: 'Engineering' },
                    { label: 'IT Security', value: 'IT Security' },
                    { label: 'Human Resources', value: 'Human Resources' },
                    { label: 'Finance', value: 'Finance' },
                  ]}
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
                  options={[
                    { label: 'Policy / Standard', value: 'Policy' },
                    { label: 'Contract / Legal Agreement', value: 'Contract' },
                    { label: 'Financial Audit / Report', value: 'Report' },
                    { label: 'Template / Standard Form', value: 'Template' },
                  ]}
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                />
              </div>
            </Card>

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
                disabled={!selectedFile || isUploading}
                icon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              >
                Start Upload & Complete Registration
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
