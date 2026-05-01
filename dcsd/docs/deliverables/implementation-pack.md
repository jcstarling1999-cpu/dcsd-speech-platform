# Implementation Pack

Use `docs/deliverables/full-output.md` as the canonical ordered index.

Key runtime entrypoints:
- API server: `apps/api/src/index.ts`
- API runtime/orchestration loop: `apps/api/src/runtime.ts`
- Adapter contracts and capabilities: `packages/adapters/src/index.ts`
- State machine/routing/chunking: `packages/workflow/src/index.ts`
- In-memory operational DB: `packages/database/src/index.ts`

Developer quickstart:
1. `npm install`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`
