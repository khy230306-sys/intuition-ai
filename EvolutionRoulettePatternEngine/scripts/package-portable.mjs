#!/usr/bin/env node
/**
 * Builds a portable distribution folder + ZIP.
 * On Linux CI we produce a Node-based portable package with start scripts.
 * Windows .exe is produced when `pkg` is available or via bundled node runner script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outName = 'RoulettePatternEngine';
const outDir = path.join(root, 'dist-portable', outName);

fs.rmSync(path.join(root, 'dist-portable'), { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyDir(path.join(root, 'dist'), path.join(outDir, 'dist'));
copyDir(path.join(root, 'config'), path.join(outDir, 'config'));
fs.mkdirSync(path.join(outDir, 'data'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'logs'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'data', '.gitkeep'), '');
fs.writeFileSync(path.join(outDir, 'logs', '.gitkeep'), '');

// Minimal package.json for portable run
const pkg = {
  name: 'roulette-pattern-engine-portable',
  version: '1.0.0',
  type: 'module',
  private: true,
  dependencies: {
    bcryptjs: '^2.4.3',
    express: '^4.21.2',
    nanoid: '^5.1.5',
    uuid: '^11.1.0',
  },
};
fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkg, null, 2));

// Copy node_modules production deps (from root)
execSync('npm install --omit=dev', { cwd: outDir, stdio: 'inherit' });

fs.writeFileSync(
  path.join(outDir, 'start.bat'),
  `@echo off
cd /d %~dp0
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20+ is required. Install from https://nodejs.org and re-run.
  pause
  exit /b 1
)
node dist/server/index.js
pause
`,
);

fs.writeFileSync(
  path.join(outDir, 'start.sh'),
  `#!/usr/bin/env bash
cd "$(dirname "$0")"
node dist/server/index.js
`,
);
fs.chmodSync(path.join(outDir, 'start.sh'), 0o755);

fs.writeFileSync(
  path.join(outDir, 'README.txt'),
  `Evolution Roulette Pattern Engine V1 — Portable

1) Unzip this folder anywhere.
2) Windows: double-click start.bat  (requires Node.js 20+)
   Or run RoulettePatternEngine.exe if present.
3) Open http://127.0.0.1:8787
4) Login: admin / admin123  (change immediately)
5) Default mode is DRY RUN — no real bets.

Windows EXE:
  If RoulettePatternEngine.exe is included, run it directly (Node embedded via pkg).
  If not, use start.bat with system Node.js.

IMPORTANT:
- Log into Evolution yourself (CAPTCHA/2FA). This tool does not bypass security.
- European roulette RED/BLACK has house edge via ZERO. Martingale does not change EV.
`,
);

// Try to build Windows EXE with npx pkg if possible
let exePath = null;
try {
  console.log('Attempting Windows EXE build with pkg...');
  execSync('npm install --no-save pkg@5.8.1', { cwd: root, stdio: 'inherit' });
  const entry = path.join(outDir, 'dist/server/index.js');
  // pkg needs commonjs-friendly or specific targets — try
  execSync(
    `npx pkg "${entry}" --targets node18-win-x64 --output "${path.join(outDir, 'RoulettePatternEngine.exe')}"`,
    { cwd: root, stdio: 'inherit' },
  );
  if (fs.existsSync(path.join(outDir, 'RoulettePatternEngine.exe'))) {
    exePath = path.join(outDir, 'RoulettePatternEngine.exe');
    console.log('EXE created:', exePath);
  }
} catch (e) {
  console.warn('pkg EXE build skipped/failed — portable ZIP with start.bat still available.');
  fs.writeFileSync(
    path.join(outDir, 'RoulettePatternEngine.cmd'),
    `@echo off\r\ncd /d %~dp0\r\nnode dist\\server\\index.js\r\n`,
  );
}

// ZIP
const zipPath = path.join(root, 'dist-portable', 'RoulettePatternEngine-portable.zip');
try {
  execSync(`cd "${path.join(root, 'dist-portable')}" && zip -r RoulettePatternEngine-portable.zip "${outName}"`, {
    stdio: 'inherit',
  });
} catch {
  // fallback tar
  execSync(
    `tar -czf "${path.join(root, 'dist-portable', 'RoulettePatternEngine-portable.tar.gz')}" -C "${path.join(root, 'dist-portable')}" "${outName}"`,
    { stdio: 'inherit' },
  );
}

console.log('Portable package ready at', outDir);
if (exePath) console.log('EXE:', exePath);
console.log('ZIP:', zipPath);
