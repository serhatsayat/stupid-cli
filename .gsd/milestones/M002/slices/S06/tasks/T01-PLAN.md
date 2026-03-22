---
estimated_steps: 5
estimated_files: 4
skills_used:
  - review
  - test
---

# T01: Wire S01-S05 modules into composition root and harden BaseAgent for real API

**Slice:** S06 — End-to-End Integration & Real API Test
**Milestone:** M002

## Description

All S01-S05 modules exist and are individually unit-tested (511 tests pass), but several critical wiring gaps prevent the real pipeline from using them:

1. `buildContext()` in `packages/cli/src/context.ts` doesn't instantiate `ComplexityClassifier` or `RoutingHistory`, so `TaskRouter` never uses complexity-based routing or history-based model selection.
2. `Orchestrator` and `SliceRunner` both create `TaskRouter` without passing `{ classifier, history }` deps.
3. `BaseAgent.execute()` calls `session.prompt()` directly instead of wrapping with `RetryableSession`, so rate_limit errors crash instead of retrying.
4. Both `Orchestrator.runAgent()` and `SliceRunner.executeTask()` pass `memoryRecords: []` instead of querying `context.memory`.
5. `BaseAgent.parseStructuredData()` uses a strict regex `/```json\n/` that may fail on real LLM output (e.g. `\`\`\`JSON`, trailing whitespace).

This task fixes all five gaps with surgical edits (5-15 lines each), then confirms all 511 existing tests still pass.

## Steps

1. **Edit `packages/cli/src/context.ts`**: Import `ComplexityClassifier` and `RoutingHistory` from `@stupid/core`. Instantiate them in `buildContext()` — `ComplexityClassifier` needs no constructor args, `RoutingHistory` needs `stateDir` (derive as `join(config.projectRoot, '.stupid')` per D031). Add both to the returned `OrchestratorContext` object.

2. **Edit `packages/core/src/orchestrator/orchestrator.ts`**: In the constructor, pass `{ classifier: this.deps.complexityClassifier, history: this.deps.routingHistory }` as the second arg to `new TaskRouter(config, deps)`. In `runAgent()`, replace `memoryRecords: []` with `memoryRecords: await this.deps.memory?.getRelevantRecords(spawnOptions.taskSpec) ?? []` (the `IProjectMemory.getRelevantRecords` method takes a `TaskSpec`).

3. **Edit `packages/core/src/workflow/slice-runner.ts`**: In `run()`, pass `{ classifier: context.complexityClassifier, history: context.routingHistory }` to `new TaskRouter(config, deps)`. In `executeTask()`, replace `memoryRecords: []` with `memoryRecords: await context?.memory?.getRelevantRecords(task) ?? []`.

4. **Edit `packages/core/src/agents/base-agent.ts`**: Import `RetryableSession` and `RetryResult` from `../infrastructure/provider-retry.js`. After `await createAgentSession(...)` and before `session.prompt(taskInput)`, create a `RetryableSession` wrapping `session`. Call `retryable.prompt(taskInput)` instead of `session.prompt(taskInput)`. Check the `RetryResult.success` — if false, throw an error with the classified error message so the existing catch block handles it. The event subscription (`agent_end`) still fires normally on success because `RetryableSession` wraps the same `session.prompt()` call.

5. **Harden `parseStructuredData()` regex**: Change `/```json\n([\s\S]*?)\n```/` to `/```(?:json|JSON)\s*\n([\s\S]*?)\n\s*```/` — this handles uppercase `JSON`, optional whitespace after the language tag, and whitespace before the closing fence.

## Must-Haves

- [ ] `buildContext()` returns `complexityClassifier` (ComplexityClassifier instance) and `routingHistory` (RoutingHistory instance with stateDir)
- [ ] Orchestrator constructor passes `{ classifier, history }` to TaskRouter
- [ ] SliceRunner.run() passes `{ classifier, history }` to TaskRouter
- [ ] BaseAgent.execute() wraps session.prompt with RetryableSession and checks RetryResult
- [ ] Orchestrator.runAgent() uses context.memory for memoryRecords (not hardcoded `[]`)
- [ ] SliceRunner.executeTask() uses context.memory for memoryRecords (not hardcoded `[]`)
- [ ] parseStructuredData() regex handles case-insensitive language tag and trailing whitespace
- [ ] All 511 existing tests pass
- [ ] `npm run build && npm run typecheck` clean

## Verification

- `npx vitest run` — all 511 existing tests pass (no regressions)
- `npm run build && npm run typecheck` — clean build, zero type errors
- `grep -q "complexityClassifier" packages/cli/src/context.ts` — confirms wiring
- `grep -q "RetryableSession" packages/core/src/agents/base-agent.ts` — confirms retry wiring
- `grep -q "memory?.getRelevantRecords" packages/core/src/orchestrator/orchestrator.ts` — confirms memory wiring

## Inputs

- `packages/cli/src/context.ts` — composition root, currently missing ComplexityClassifier + RoutingHistory
- `packages/core/src/agents/base-agent.ts` — agent execution, currently no retry wrapping
- `packages/core/src/orchestrator/orchestrator.ts` — orchestrator, currently doesn't pass deps to TaskRouter or wire memory
- `packages/core/src/workflow/slice-runner.ts` — slice runner, currently doesn't pass deps to TaskRouter or wire memory
- `packages/core/src/infrastructure/provider-retry.ts` — RetryableSession class to import
- `packages/core/src/orchestrator/complexity-classifier.ts` — ComplexityClassifier class to import
- `packages/core/src/orchestrator/routing-history.ts` — RoutingHistory class to import
- `packages/core/src/orchestrator/interfaces.ts` — OrchestratorContext type (has complexityClassifier + routingHistory fields)

## Expected Output

- `packages/cli/src/context.ts` — modified: imports and instantiates ComplexityClassifier + RoutingHistory
- `packages/core/src/agents/base-agent.ts` — modified: imports RetryableSession, wraps session.prompt, checks RetryResult, hardened regex
- `packages/core/src/orchestrator/orchestrator.ts` — modified: passes classifier+history to TaskRouter, wires memory records
- `packages/core/src/workflow/slice-runner.ts` — modified: passes classifier+history to TaskRouter, wires memory records

## Observability Impact

- **RetryableSession wrapping**: BaseAgent now surfaces retry attempt count and classified error type in error messages when prompt fails after retries. The `onRetry` callback is available for external logging; callers see `RetryResult.attempts` and `RetryResult.error.errorType` in the structured result.
- **RoutingHistory wiring**: `routing.db` in `.stupid/` is now created at context build time. Future agents can inspect `SELECT * FROM routing_history` for model selection decisions per phase+tier.
- **ComplexityClassifier wiring**: TaskRouter now classifies task complexity when `SelectModelOptions` are passed. No new logs, but model selection decisions are observable via routing history records.
- **Memory records injection**: Agent spawn options now include real project memory records instead of `[]`. Visible in compiled prompt templates via the `{memory}` placeholder.
- **Failure state**: Non-retryable provider errors (auth, permission, context overflow) abort immediately with classified error type. Retryable errors (rate limit, overload, network) are retried up to 3 times with exponential backoff before propagating.
