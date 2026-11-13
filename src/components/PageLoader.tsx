'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PageLoaderProps {
  title?: string;
  subtitle?: string;
}

export function PageLoader({
  title = 'Đang tải dữ liệu giải đấu...',
  subtitle = 'Vui lòng chờ trong giây lát để hệ thống đồng bộ đầy đủ thông tin mới nhất.',
}: PageLoaderProps) {
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-sai-cyan/20 blur-md animate-pulse" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-sai-cyan/40 bg-slate-950 shadow-lg shadow-cyan-500/15">
            <RefreshCw className="h-7 w-7 animate-spin text-sai-cyan" />
          </div>
        </div>

        <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          {subtitle}
        </p>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sai-cyan animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-sai-cyan animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-sai-cyan animate-bounce" />
        </div>
      </div>
    </div>
  );
}

