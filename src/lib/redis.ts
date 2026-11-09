import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Global singletons to prevent multiple connections during hot reloads
const globalForRedis = globalThis as unknown as {
  redisPub: Redis | undefined;
  redisSub: Redis | undefined;
};

export const createRedisClient = (name = 'default') => {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
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

export async function publishEvent(channel: string, payload: unknown) {
  try {
    if (redisPub.status !== 'ready' && redisPub.status !== 'connecting') {
      await redisPub.connect();
    }
    await redisPub.publish(channel, JSON.stringify(payload));
  } catch (error) {
    console.warn(`[Redis Publish] Failed to publish on channel ${channel}:`, error);
  }
}

