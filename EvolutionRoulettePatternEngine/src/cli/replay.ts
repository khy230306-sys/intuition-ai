import { createApp, main } from '../server/index.js';

const args = process.argv.slice(2);
if (args[0] === 'replay') {
  const seq = args[1] ?? 'R,R,R,B,B,R,B,R,B';
  const { orch } = createApp();
  const out = orch.replaySequence(seq);
  console.log(out.lines.join('\n'));
  process.exit(0);
}

void main();
