'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Activity, Users, UserCheck, ArrowRight, Lock, Mail } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      if (res.error.includes('Database server is offline')) {
        setError(t('login.dbOffline'));
      } else {
        setError(t('login.invalidCredentials'));
      }
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const quickLogin = async (demoEmail: string, demoPass: string) => {
    setLoading(true);
    setError('');
    const res = await signIn('credentials', {
      email: demoEmail,
      password: demoPass,
      redirect: false,
    });
    setLoading(false);
    if (!res?.error) {
      router.push(
        demoEmail.startsWith('referee')
          ? '/referee'
          : demoEmail.startsWith('admin') || demoEmail.startsWith('organizer')
          ? '/admin'
          : '/'
      );
      router.refresh();
    } else {
      setError(t('login.dbOffline'));
    }
  };

  const demoAccounts = [
    {
      title: t('login.directorTitle'),
      role: 'SUPER_ADMIN',
      email: 'admin@sai.digital',
      pass: 'admin123',
      color: 'from-amber-500/20 to-yellow-600/20 border-yellow-500/40 text-sai-yellow',
      icon: Shield,
      target: t('login.directorDesc'),
    },
    {
      title: t('login.opsTitle'),
      role: 'ORGANIZER',
      email: 'organizer@sai.digital',
      pass: 'admin123',
      color: 'from-blue-500/20 to-indigo-600/20 border-blue-500/40 text-blue-400',
      icon: Users,
      target: t('login.opsDesc'),
    },
    {
      title: t('login.umpire1Title'),
      role: 'REFEREE',
      email: 'referee1@sai.digital',
      pass: 'ref123',
      color: 'from-emerald-500/20 to-teal-600/20 border-emerald-500/40 text-emerald-400',
      icon: Activity,
      target: t('login.umpire1Desc'),
    },
    {
      title: t('login.umpire2Title'),
      role: 'REFEREE',
      email: 'referee2@sai.digital',
      pass: 'ref123',
      color: 'from-cyan-500/20 to-sky-600/20 border-cyan-500/40 text-sai-cyan',
      icon: Activity,
      target: t('login.umpire2Desc'),
    },
    {
      title: t('login.fanTitle'),
      role: 'SPECTATOR',
      email: 'spectator@sai.digital',
      pass: 'sai123456',
      color: 'from-slate-700/20 to-slate-800/20 border-slate-700 text-slate-300',
      icon: UserCheck,
      target: t('login.fanDesc'),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-sai-cyan to-blue-600 text-3xl shadow-xl shadow-cyan-500/20 mb-3">
          🏸
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {t('login.title')}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {t('login.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Credentials Form */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-sai-cyan" />
            <span>{t('login.signInBtn')}</span>
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-rose-950/50 border border-rose-500/40 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('login.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organizer@sai.digital"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-white focus:border-sai-cyan focus:outline-none focus:ring-1 focus:ring-sai-cyan placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('login.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-white focus:border-sai-cyan focus:outline-none focus:ring-1 focus:ring-sai-cyan placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-sai-cyan to-blue-600 py-2.5 font-bold text-slate-950 hover:brightness-110 transition shadow-lg shadow-cyan-500/20 text-sm disabled:opacity-50"
            >
              {loading ? t('login.authenticating') : t('login.signInBtn')}
            </button>
          </form>
        </div>

        {/* Demo Fast Logins */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              ⚡ {t('login.fastLoginTitle')}
            </h2>
            <span className="text-[11px] text-slate-500">{t('login.preSeeded')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {demoAccounts.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.email}
                  onClick={() => quickLogin(acc.email, acc.pass)}
                  disabled={loading}
                  className={`group text-left p-4 rounded-xl border bg-gradient-to-br transition-all hover:scale-[1.02] hover:shadow-lg ${acc.color}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                      <Icon className="h-4 w-4" />
                      {acc.role}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{acc.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{acc.target}</p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500">
                    {acc.email}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
