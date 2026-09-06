import React from 'react';
import './globals.css';
import { AuthProvider } from '@/src/lib/auth-context';
import { PwaProvider } from '@/src/lib/pwa-context';
import { PwaRegister } from '@/src/components/pwa/PwaRegister';
import { PwaInstallModal } from '@/src/components/pwa/PwaInstallModal';
import { DiscussionWidget } from '@/src/components/DiscussionWidget/DiscussionWidget';

export const metadata = {
  title: 'INSA Knowledge Management System — INSA KMS',
  description: 'Official INSA Enterprise Knowledge Management System & Document Repository',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'INSA KMS',
  },
  icons: {
    icon: '/icons/icon.svg',
    shortcut: '/icons/icon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1e40af" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="INSA KMS" />
      </head>
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">
        <AuthProvider>
          <PwaProvider>
            {children}
            <DiscussionWidget />
            <PwaRegister />
            <PwaInstallModal />
          </PwaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

