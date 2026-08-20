# Pre Future Road Engine V2 Backup

Source: https://intuition-ai-delta.vercel.app/ (production bundle, 2026-08-16)

Storage keys preserved:
- intuitionHistory
- predictionRecords
- patternMemory

Old prediction logic (removed from live pick path):
- exact suffix pattern match weighted by length^2
- patternMemory learned counts
- streak (장줄) bias
- ping-pong (퐁당) bias
- recent 10 majority bias
- confidence clamped 50-85

TIE: recorded in history, excluded from BP road filter and from WIN/LOSE judgment.
