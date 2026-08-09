# Ideas · Claude heart

- Implementation: `src/life-os/ideas/ideaBrain.ts`
- Intent: `grow_idea` via `src/life-os/intentParse.ts`
- Provider: `src/ai-providers/providers/anthropicProvider.ts`
- Preserve original idea `content` on save; put AI expansion in `summary` / reply text
- Offline must still return a useful local scaffold, not hang
