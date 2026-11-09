'use client';

import React from 'react';
import { useSocket } from '@/lib/socket-client';
import { Bell, X } from 'lucide-react';

export function AnnouncementBanner() {
  const { announcement, clearAnnouncement } = useSocket();

  if (!announcement) return null;

  return (
    <div className="bg-gradient-to-r from-sai-yellow via-amber-500 to-yellow-500 text-slate-950 px-4 py-2.5 font-semibold text-xs sm:text-sm shadow-lg flex items-center justify-between sticky top-[65px] z-40 animate-fadeIn">
      <div className="flex items-center gap-2.5 mx-auto max-w-7xl w-full">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white shrink-0">
          <Bell className="h-4 w-4 animate-bounce text-sai-yellow" />
        </span>
        <div className="flex-1 truncate">
          <span className="uppercase tracking-wider font-extrabold text-[10px] bg-slate-950/20 px-2 py-0.5 rounded mr-2">
            ANNOUNCEMENT
          </span>
          <span>{announcement.message}</span>
        </div>
        <button
          onClick={clearAnnouncement}
          className="p-1 hover:bg-slate-950/10 rounded-md transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
