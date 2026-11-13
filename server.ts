import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { redisSub, redisPub, CHANNELS, CHANNEL_TO_SOCKET_EVENT, hasRedisConfigured } from './src/lib/redis';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function bootstrap() {
  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Socket.io Server instance
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Expose Socket.IO instance on globalThis for zero-hop in-process emissions from Next API routes
  (globalThis as { __saiSocketIO?: SocketIOServer }).__saiSocketIO = io;

  // Connect and subscribe to Redis channels only when REDIS_URL is configured
  if (hasRedisConfigured) {
    Promise.all([
      redisSub.status !== 'ready' && redisSub.status !== 'connecting' ? redisSub.connect() : Promise.resolve(),
      redisPub.status !== 'ready' && redisPub.status !== 'connecting' ? redisPub.connect() : Promise.resolve(),
    ])
      .then(() =>
        redisSub.subscribe(
          CHANNELS.SCORE_UPDATE,
          CHANNELS.MATCH_STATUS,
          CHANNELS.TIMER_UPDATE,
          CHANNELS.SCHEDULE_UPDATE,
          CHANNELS.ANNOUNCEMENT,
          (err, count) => {
            if (err) {
              console.warn('[Redis Subscriber] Subscription error:', err);
            } else {
              console.log(`[Redis Subscriber] Subscribed to ${count} channels.`);
            }
          }
        )
      )
      .catch((err: Error) => {
        console.warn('[Redis Warning] Operating with local Socket.IO fallback:', err.message);
      });

    redisSub.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        const socketEvent = CHANNEL_TO_SOCKET_EVENT[channel];
        if (socketEvent) {
          io.emit(socketEvent, data);
        }
      } catch (e) {
        console.error('Error decoding Redis message:', e);
      }
    });
  } else {
    console.log('[Socket.IO] In-memory real-time broadcast mode active (no REDIS_URL).');
  }

  // Socket.io connection events
  io.on('connection', (socket) => {
    // console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('ping_check', (callback) => {
      if (typeof callback === 'function') {
        callback();
      }
    });

    socket.on('join_court', (courtNumber: number) => {
      socket.join(`court_${courtNumber}`);
    });

    socket.on('leave_court', (courtNumber: number) => {
      socket.leave(`court_${courtNumber}`);
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> SAI Badminton Championship Server ready on http://${hostname}:${port}`);
    console.log(`> Real-time Socket.io & Redis Pub/Sub running`);
  });
}

bootstrap().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});

