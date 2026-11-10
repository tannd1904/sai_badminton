import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getResolvedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Auto-inject pgbouncer=true for Supabase connection poolers to prevent error 26000
  if (url.includes('pooler.supabase.com') || url.includes(':6543') || url.includes('pgbouncer=true')) {
    if (!url.includes('pgbouncer=true')) {
      return url + (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }
  }
  return url;
}

const resolvedDbUrl = getResolvedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedDbUrl ? { db: { url: resolvedDbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;


