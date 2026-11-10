'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Trophy,
  Shield,
  Activity,
  Tv,
  Calendar,
  LogOut,
  LogIn,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Globe,
} from 'lucide-react';
import { useSocket } from '../lib/socket-client';
import { soundManager } from '../lib/sound';
import { useLanguage } from '../lib/i18n';

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isConnected, latency } = useSocket();
  const { locale, toggleLocale, t } = useLanguage();
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());

  const toggleSound = () => {
    const newState = !soundOn;
    soundManager.setEnabled(newState);
    setSoundOn(newState);
  };

  const role = (session?.user as any)?.role;

  // Filter navigation items strictly based on authentication & role:
  // - If NOT logged in (!session): HIDE both Referee and Organizer tabs
  // - If REFEREE: only show Referee Touchpad (hide Organizer)
  // - If ORGANIZER: only show Organizer Center (hide Referee)
  // - If SUPER_ADMIN: show both
  const isReferee = Boolean(session && (role === 'REFEREE' || role === 'SUPER_ADMIN'));
  const isOrganizer = Boolean(session && (role === 'ORGANIZER' || role === 'SUPER_ADMIN'));

  const navItems = [
    { label: t('nav.liveCourts'), href: '/', icon: Tv },
    { label: t('nav.tvScoreboard'), href: '/tv', icon: Tv },
    { label: t('nav.standings'), href: '/standings', icon: Trophy },
    ...(isReferee ? [{ label: t('nav.referee'), href: '/referee', icon: Activity }] : []),
    ...(isOrganizer ? [{ label: t('nav.organizer'), href: '/admin', icon: Calendar }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-sai-navy-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sai-cyan to-blue-600 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🏸</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-white text-lg">SAI DIGITAL</span>
                <span className="rounded bg-sai-cyan/20 px-2 py-0.5 text-[10px] font-bold text-sai-cyan uppercase">
                  2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{t('nav.subTitle')}</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          {/* Connection & Latency status */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
            }`}
            title={isConnected ? 'Connected to Redis/Socket.io' : 'Disconnected from real-time stream'}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 animate-pulse text-emerald-400" />
                <span>{latency ? `${latency}ms` : 'LIVE'}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-rose-400" />
                <span>OFFLINE</span>
              </>
            )}
          </div>

          {/* Language Switcher */}
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 transition-colors text-xs font-bold"
            title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <Globe className="h-3.5 w-3.5 text-sai-cyan" />
            <span>{locale === 'vi' ? '🇻🇳 VN' : '🇬🇧 EN'}</span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            aria-label={soundOn ? t('nav.soundOff') : t('nav.soundOn')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            {soundOn ? <Volume2 className="h-4 w-4 text-sai-cyan" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>

          {/* User Profile / Auth */}
          {session ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold text-white truncate max-w-[120px]">{session.user?.name}</p>
                <span className="inline-block rounded bg-sai-cyan/15 px-1.5 py-0.2 text-[9px] font-bold text-sai-cyan uppercase">
                  {role || 'USER'}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                title={t('nav.logout')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              prefetch={true}
              className="flex items-center gap-1.5 rounded-lg bg-sai-navy-800 hover:bg-sai-navy-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition-all shadow"
            >
              <LogIn className="h-3.5 w-3.5 text-sai-yellow" />
              <span>{t('nav.login')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="flex md:hidden border-t border-slate-800/80 bg-slate-950/60 px-2 py-1.5 justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-md text-[10px] font-medium ${
                isActive ? 'text-sai-cyan font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}

