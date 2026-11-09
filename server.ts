import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { redisSub, CHANNELS } from './src/lib/redis';

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

  // Connect and subscribe to Redis channels for cross-instance pub/sub
  try {
    if (redisSub.status !== 'ready' && redisSub.status !== 'connecting') {
      await redisSub.connect();
    }
    
    await redisSub.subscribe(
      CHANNELS.SCORE_UPDATE,
      CHANNELS.MATCH_STATUS,
      CHANNELS.TIMER_UPDATE,
      CHANNELS.SCHEDULE_UPDATE,
      CHANNELS.ANNOUNCEMENT,
      (err, count) => {
        if (err) {
          console.warn('[Redis Subscriber] Subscription error:', err);
        } else {
          console.log(`[Redis Subscriber] Successfully subscribed to ${count} channels.`);
        }
      }
    );

    redisSub.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        switch (channel) {
          case CHANNELS.SCORE_UPDATE:
            io.emit('score_update', data);
            break;
          case CHANNELS.MATCH_STATUS:
            io.emit('match_status_change', data);
            break;
          case CHANNELS.TIMER_UPDATE:
            io.emit('timer_update', data);
            break;
          case CHANNELS.SCHEDULE_UPDATE:
            io.emit('schedule_update', data);
            break;
          case CHANNELS.ANNOUNCEMENT:
            io.emit('announcement', data);
            break;
        }
      } catch (e) {
        console.error('Error decoding Redis message:', e);
      }
    });
  } catch (err: any) {
    console.warn('[Redis Warning] Could not connect to Redis Pub/Sub, operating in in-memory mode:', err.message);
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

  server.listen(port, () => {
    console.log(`> SAI Badminton Championship Server ready on http://localhost:${port}`);
    console.log(`> Real-time Socket.io & Redis Pub/Sub running`);
  });
}

bootstrap().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
