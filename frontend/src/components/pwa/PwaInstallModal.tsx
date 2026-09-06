'use client';

import React from 'react';
import { X, Download, ShieldCheck, Zap, Monitor, Share2, PlusSquare } from 'lucide-react';
import { usePwa } from '@/src/lib/pwa-context';
import Image from 'next/image';

export const PwaInstallModal: React.FC = () => {
  const { isModalOpen, closeInstallModal, promptInstall, isIos } = usePwa();

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        {/* Close Button */}
        <button
          onClick={closeInstallModal}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero */}
        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-6 pt-8 pb-6 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />

          {/* App Icon */}
          <div className="relative inline-block mb-3">
            <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-xl ring-4 ring-white/20 mx-auto overflow-hidden">
              <img
                src="/icons/icon.svg"
                alt="INSA KMS App Icon"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full shadow-md">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>

          <h2 id="pwa-install-title" className="text-lg font-black text-white tracking-tight">
            Install INSA KMS
          </h2>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Official Enterprise Knowledge Management System
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {isIos ? (
            /* iOS Safari Step-by-Step Instructions */
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                How to install on iPhone / iPad:
              </p>
              <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Step 1:</span> Tap the <span className="font-semibold text-blue-700">Share</span> button at the bottom of Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Step 2:</span> Scroll down and tap <span className="font-semibold text-blue-700">Add to Home Screen</span>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Step 3:</span> Tap <span className="font-semibold text-blue-700">Add</span> in the top-right corner to finish.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop / Android Benefits */
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl shrink-0 mt-0.5">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Standalone Desktop Window</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Launch directly from your taskbar or desktop without browser tabs or url clutter.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Ultra-Fast & Offline Ready</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Local caching guarantees instant document browsing and offline emergency view.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Keycloak Enterprise Security</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Protected by INSA corporate OIDC Single Sign-On and granular RBAC.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              onClick={closeInstallModal}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {isIos ? 'Close' : 'Maybe Later'}
            </button>

            {!isIos && (
              <button
                onClick={async () => {
                  await promptInstall();
                }}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
