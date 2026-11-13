import Redis from 'ioredis';

const rawRedisUrl = process.env.REDIS_URL?.trim() || '';
const isLocalRedisUrl =
  rawRedisUrl.includes('localhost') || rawRedisUrl.includes('127.0.0.1');
const REDIS_URL = rawRedisUrl || 'redis://localhost:6379';
export const hasRedisConfigured = Boolean(
  rawRedisUrl &&
    !(process.env.NODE_ENV === 'production' && isLocalRedisUrl && process.env.FORCE_LOCAL_REDIS !== 'true')
);

// Global singletons to prevent multiple connections during hot reloads
const globalForRedis = globalThis as unknown as {
  redisPub: Redis | undefined;
  redisSub: Redis | undefined;
};

export const createRedisClient = (name = 'default') => {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (!hasRedisConfigured || times > 3) return null;
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.warn(`[Redis ${name}] Connection warning:`, err.message);
  });

  client.on('connect', () => {
    console.log(`[Redis ${name}] Connected to ${REDIS_URL}`);
  });

  return client;
};

export const redisPub = globalForRedis.redisPub ?? createRedisClient('Publisher');
export const redisSub = globalForRedis.redisSub ?? createRedisClient('Subscriber');

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisPub = redisPub;
  globalForRedis.redisSub = redisSub;
}

export const CHANNELS = {
  SCORE_UPDATE: 'sai:badminton:score_update',
  MATCH_STATUS: 'sai:badminton:match_status',
  TIMER_UPDATE: 'sai:badminton:timer_update',
  SCHEDULE_UPDATE: 'sai:badminton:schedule_update',
  ANNOUNCEMENT: 'sai:badminton:announcement',
} as const;

export const CHANNEL_TO_SOCKET_EVENT: Record<string, string> = {
  [CHANNELS.SCORE_UPDATE]: 'score_update',
  [CHANNELS.MATCH_STATUS]: 'match_status_change',
  [CHANNELS.TIMER_UPDATE]: 'timer_update',
  [CHANNELS.SCHEDULE_UPDATE]: 'schedule_update',
  [CHANNELS.ANNOUNCEMENT]: 'announcement',
};

function emitViaGlobalSocket(channel: string, payload: unknown): boolean {
  const io = (globalThis as { __saiSocketIO?: { emit: (ev: string, data: unknown) => void } }).__saiSocketIO;
  if (!io) return false;
  const socketEvent = CHANNEL_TO_SOCKET_EVENT[channel] || channel;
  io.emit(socketEvent, payload);
  return true;
}

export async function publishEvent(channel: string, payload: unknown) {
  if (!hasRedisConfigured) {
    emitViaGlobalSocket(channel, payload);
    return;
  }

  try {
    if (redisPub.status === 'ready') {
      await redisPub.publish(channel, JSON.stringify(payload));
      return;
    }
  } catch (error) {
    console.warn(`[Redis Publish] Failed to publish on channel ${channel}, falling back to local IO:`, error);
  }

  // Immediate fallback to in-process Socket.IO so API calls never stall on Redis reconnects
  emitViaGlobalSocket(channel, payload);
}

