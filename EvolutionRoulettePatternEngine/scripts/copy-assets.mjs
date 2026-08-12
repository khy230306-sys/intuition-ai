#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distPublic = path.join(root, 'dist/ui/public');
const srcPublic = path.join(root, 'src/ui/public');

fs.mkdirSync(distPublic, { recursive: true });
for (const file of fs.readdirSync(srcPublic)) {
  fs.copyFileSync(path.join(srcPublic, file), path.join(distPublic, file));
}
console.log('Copied UI assets to dist/ui/public');
