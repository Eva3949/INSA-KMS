'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCategoriesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/document-types');
  }, [router]);

  return null;
}
