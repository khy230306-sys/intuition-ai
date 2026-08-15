import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

const MUTATING_PREFIXES = [
  '/api/autopilot/start',
  '/api/autopilot/stop',
  '/api/autopilot/emergency-stop',
  '/api/diagnostics/live',
  '/api/diagnostics/recovery',
  '/api/diagnostics/shadow-verify',
];

function isMutating(req: FastifyRequest): boolean {
  const path = req.url.split('?')[0];
  if (req.method === 'GET' && path === '/api/diagnostics/live') return true; // can unlock live
  if (req.method === 'GET') return false;
  return MUTATING_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

/**
 * Optional control-plane auth. When CONTROL_PLANE_TOKEN is set, mutating routes
 * require Authorization: Bearer <token>. When unset, log a warn once (dev OK).
 */
let warnedMissing = false;

export function registerControlPlaneAuth(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    if (!isMutating(req)) return;
    const token = env.CONTROL_PLANE_TOKEN;
    if (!token) {
      if (!warnedMissing && env.ALLOW_LIVE) {
        warnedMissing = true;
        req.log.warn('CONTROL_PLANE_TOKEN empty while ALLOW_LIVE=true — control plane unprotected');
      }
      return;
    }
    const header = req.headers.authorization ?? '';
    const ok = header === `Bearer ${token}` || header === token;
    if (!ok) {
      return reply.code(401).send({ ok: false, error: 'CONTROL_PLANE_UNAUTHORIZED' });
    }
  });
}

export function requireControlPlane(req: FastifyRequest, reply: FastifyReply): boolean {
  const token = env.CONTROL_PLANE_TOKEN;
  if (!token) return true;
  const header = req.headers.authorization ?? '';
  if (header === `Bearer ${token}` || header === token) return true;
  void reply.code(401).send({ ok: false, error: 'CONTROL_PLANE_UNAUTHORIZED' });
  return false;
}
