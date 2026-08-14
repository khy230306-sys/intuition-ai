/**
 * Full V1.2 SHADOW report — run on Toss-allowlisted PC.
 * Usage: npm run toss:report
 */
import { buildV12ShadowReport, formatV12ReportText } from '../src/services/v12Report.js';
import { ensureAutopilotRow } from '../src/services/autopilot.js';

await ensureAutopilotRow();
const report = await buildV12ShadowReport();
console.log(formatV12ReportText(report));
console.log('\n--- JSON summary ---');
console.log(
  JSON.stringify(
    {
      actualLiveOrdersSent: report.actualLiveOrdersSent,
      remainingRequirements: report.remainingRequirements,
      stages: report.stages?.map((s) => ({ name: s.name, result: s.result })),
    },
    null,
    2,
  ),
);
process.exit(report.actualLiveOrdersSent === 0 && report.stages?.find((s) => s.name === 'TOSS AUTH')?.result === 'PASS' ? 0 : 2);
