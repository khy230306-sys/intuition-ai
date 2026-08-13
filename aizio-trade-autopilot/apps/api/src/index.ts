import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { env } from './config/env.js';
import { ensureAutopilotRow } from './services/autopilot.js';
import { bootstrapBrokers, runRecovery } from './services/recovery.js';
import { registerRoutes } from './routes/api.js';
import { runtime } from './workers/runtime.js';
import { onActivity, emitEvent } from './services/events.js';
import { prisma } from './db/client.js';

async function main() {
  // Ensure DB schema reachable
  await ensureAutopilotRow();
  await bootstrapBrokers();

  const recovery = await runRecovery();
  await emitEvent('SERVER_START', `AIZIO API boot — recovery resumed=${recovery.resumed}`, 'info', {
    details: recovery.details,
  });

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(websocket);

  await registerRoutes(app);

  app.get('/ws/activity', { websocket: true }, (socket) => {
    const off = onActivity((item) => {
      try {
        socket.send(JSON.stringify(item));
      } catch {
        /* closed */
      }
    });
    socket.on('close', () => off());
  });

  runtime.start();

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
  app.log.info(`AIZIO TRADE API on http://${env.API_HOST}:${env.API_PORT}`);

  const shutdown = async () => {
    runtime.stop();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
