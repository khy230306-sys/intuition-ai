import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ConfigStore } from '../storage/ConfigStore.js';
import { SessionStore } from '../storage/SessionStore.js';
import { UserStore } from '../auth/UserStore.js';
import { AppOrchestrator } from '../app/Orchestrator.js';
import { EvolutionPlaywrightAdapter, SimulationAdapter } from '../adapters/evolution/EvolutionAdapter.js';
import { parseResultSequence, resultFromNumber, resultFromColor } from '../core/roulette/result.js';
import type { CustomPatternDefinition, RouletteColor } from '../core/types.js';
import { ReplaySimulator } from '../core/session/ReplaySimulator.js';
import { buildRulesFromConfig } from '../app/Orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveRoot(): string {
  // dist/server -> project root; src/server via tsx -> project root
  const candidates = [
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '../../..'),
    process.cwd(),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json'))) return c;
  }
  return process.cwd();
}

export function createApp(rootDir = resolveRoot()) {
  const dataDir = path.join(rootDir, 'data');
  const configDir = path.join(rootDir, 'config');
  const logsDir = path.join(rootDir, 'logs');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });

  const configStore = new ConfigStore(path.join(configDir, 'app.json'));
  const sessionStore = new SessionStore(path.join(dataDir, 'sessions'));
  const userStore = new UserStore(path.join(dataDir, 'users.json'));
  const orch = new AppOrchestrator(configStore, sessionStore, logsDir);

  // Default simulation adapter
  orch.setAdapter(new SimulationAdapter());

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const publicDir = fs.existsSync(path.join(__dirname, '../ui/public'))
    ? path.join(__dirname, '../ui/public')
    : path.join(rootDir, 'src/ui/public');
  app.use(express.static(publicDir));

  // ---- Auth ----
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body ?? {};
    const user = userStore.authenticate(String(username ?? ''), String(password ?? ''));
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials or expired' });
    res.json({ ok: true, user });
  });

  app.get('/api/admin/users', (_req, res) => {
    res.json({ ok: true, users: userStore.list() });
  });

  app.post('/api/admin/users', (req, res) => {
    try {
      const { username, password, role, expiresAt, deviceMemo } = req.body ?? {};
      const user = userStore.createUser(String(username), String(password), {
        role,
        expiresAt: expiresAt ?? null,
        deviceMemo,
      });
      res.json({ ok: true, user });
    } catch (e) {
      res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.patch('/api/admin/users/:id', (req, res) => {
    const user = userStore.updateUser(req.params.id, req.body ?? {});
    if (!user) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, user });
  });

  // ---- Engine ----
  app.get('/api/dashboard', (_req, res) => {
    res.json({ ok: true, data: orch.dashboard(), logs: orch.logger.recent(100) });
  });

  app.post('/api/engine/start', (_req, res) => {
    orch.start();
    res.json({ ok: true, data: orch.dashboard() });
  });

  app.post('/api/engine/stop', (_req, res) => {
    orch.stop();
    res.json({ ok: true, data: orch.dashboard() });
  });

  app.post('/api/engine/reset', (_req, res) => {
    orch.resetSession();
    res.json({ ok: true, data: orch.dashboard() });
  });

  app.post('/api/engine/mode', (req, res) => {
    const mode = req.body?.mode === 'REAL' ? 'REAL' : 'DRY_RUN';
    orch.setMode(mode);
    res.json({ ok: true, data: orch.dashboard() });
  });

  app.post('/api/result', (req, res) => {
    try {
      let result;
      if (typeof req.body?.number === 'number') {
        result = resultFromNumber(req.body.number, { source: 'manual' });
      } else if (req.body?.color) {
        result = resultFromColor(req.body.color as RouletteColor, { source: 'manual' });
      } else {
        return res.status(400).json({ ok: false, error: 'Provide number or color' });
      }
      const out = orch.injectResult(result);
      res.json({ ok: true, record: out.record, data: orch.dashboard() });
    } catch (e) {
      res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/api/replay', (req, res) => {
    const input = String(req.body?.sequence ?? '');
    if (!input.trim()) return res.status(400).json({ ok: false, error: 'sequence required' });

    // Strict no-lookahead simulator for report lines
    const results = parseResultSequence(input);
    const sim = new ReplaySimulator(buildRulesFromConfig(configStore), configStore.get().strategy);
    const steps = sim.run(results);

    // Also run through live engine for session storage
    const live = orch.replaySequence(input);
    const sessionId = orch.saveCurrentSession(req.body?.label ?? 'replay');

    res.json({
      ok: true,
      lines: steps.map((s) => s.line),
      steps,
      liveLines: live.lines,
      sessionId,
      data: orch.dashboard(),
    });
  });

  app.get('/api/sessions', (_req, res) => {
    res.json({ ok: true, sessions: sessionStore.list() });
  });

  app.get('/api/sessions/:id', (req, res) => {
    const s = sessionStore.load(req.params.id);
    if (!s) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, session: s });
  });

  app.get('/api/logs', (_req, res) => {
    res.json({ ok: true, logs: orch.logger.recent(500) });
  });

  // ---- Config / patterns ----
  app.get('/api/config', (_req, res) => {
    res.json({ ok: true, config: configStore.get() });
  });

  app.put('/api/config', (req, res) => {
    const updated = configStore.update(req.body ?? {});
    orch.reloadRules();
    res.json({ ok: true, config: updated, data: orch.dashboard() });
  });

  app.get('/api/patterns', (_req, res) => {
    res.json({ ok: true, patterns: configStore.get().customPatterns });
  });

  app.post('/api/patterns', (req, res) => {
    const p = req.body as CustomPatternDefinition;
    if (!p?.id || !p?.name || !Array.isArray(p.sequence)) {
      return res.status(400).json({ ok: false, error: 'Invalid pattern' });
    }
    orch.upsertCustomPattern(p);
    res.json({ ok: true, patterns: configStore.get().customPatterns, data: orch.dashboard() });
  });

  app.delete('/api/patterns/:id', (req, res) => {
    orch.deleteCustomPattern(req.params.id);
    res.json({ ok: true, patterns: configStore.get().customPatterns });
  });

  // ---- Adapter ----
  app.post('/api/adapter/simulation', (_req, res) => {
    orch.setAdapter(new SimulationAdapter());
    res.json({ ok: true, adapter: 'simulation' });
  });

  app.post('/api/adapter/evolution', async (req, res) => {
    try {
      const adapter = new EvolutionPlaywrightAdapter({
        cdpUrl: req.body?.cdpUrl,
        tableUrl: req.body?.tableUrl,
        headless: Boolean(req.body?.headless),
      });
      orch.setAdapter(adapter);
      const table = await orch.connectAdapter();
      res.json({ ok: true, adapter: 'evolution', table });
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        hint: 'Start Chrome with --remote-debugging-port=9222 after manual login, then pass cdpUrl.',
      });
    }
  });

  app.post('/api/adapter/poll/start', (req, res) => {
    try {
      orch.startPolling(Number(req.body?.intervalMs ?? 1500));
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return { app, orch, configStore, userStore, rootDir };
}

export async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 8787);
  const { app, rootDir } = createApp();
  app.listen(port, '0.0.0.0', () => {
    console.log(`Evolution Roulette Pattern Engine V1`);
    console.log(`Root: ${rootDir}`);
    console.log(`Dashboard: http://127.0.0.1:${port}`);
    console.log(`Default mode: DRY_RUN`);
    console.log(`Disclaimer: Pattern tool only — European roulette RED/BLACK has house edge via ZERO; martingale does not change odds.`);
  });
}

const isDirectRun = process.argv[1] && (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].endsWith(`${path.sep}index.ts`) ||
  process.argv[1].endsWith(`${path.sep}index.js`) ||
  process.argv[1].endsWith('/index.ts') ||
  process.argv[1].endsWith('/index.js')
);
if (isDirectRun) {
  void main();
}
