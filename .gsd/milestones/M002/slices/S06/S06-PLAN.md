# S06: End-to-End Integration & Real API Test

**Goal:** `stupid "add a hello world function"` runs the full pipeline with real Anthropic API calls — research through commit — proving M002's assembled system works.
**Demo:** An ANTHROPIC_API_KEY-gated integration test creates a temp git repo, runs the orchestrator with real API calls, and verifies the plan has slices, agents produced output, structured JSON was extracted, and Doctor reports clean state.

## Must-Haves

- ComplexityClassifier and RoutingHistory wired into `buildContext()` and passed to TaskRouter in both Orchestrator and SliceRunner
- RetryableSession wraps `session.prompt()` in BaseAgent for automatic retry on transient provider errors
- Memory records from ProjectMemory injected into agent spawn options (not hardcoded `[]`)
- JSON extraction regex hardened for real LLM output (case-insensitive, whitespace-tolerant)
- End-to-end integration test that exercises real Anthropic API (skipped without `ANTHROPIC_API_KEY`)
- All 511 existing tests still pass after wiring changes
- `npm run build && npm run typecheck` clean

## Proof Level

- This slice proves: final-assembly (R033 — all M002 modules assembled and exercised with real API)
- Real runtime required: yes (real Anthropic API calls)
- Human/UAT required: no (automated integration test with assertions)

## Verification

- `npx vitest run` — all 511+ existing tests pass (no regressions from wiring)
- `npm run build && npm run typecheck` — clean build, no type errors
- `ANTHROPIC_API_KEY=... npx vitest run packages/core/src/__tests__/e2e-integration.test.ts` — integration test passes with real API
- `npx vitest run packages/core/src/__tests__/e2e-integration.test.ts` — test gracefully skips when no API key set

## Observability / Diagnostics

- Runtime signals: RetryableSession logs retry attempts via `onRetry` callback; RoutingHistory records phase outcomes to `routing.db`; Doctor reports per-check pass/fail
- Inspection surfaces: `.stupid/routing.db` (SQLite) for routing history; `Doctor.check()` for state health; integration test output for pipeline trace
- Failure visibility: BaseAgent returns `AgentResult.error` with classified ProviderError on failure; RetryableSession.prompt() returns `RetryResult` with attempt count and error classification
- Redaction constraints: ANTHROPIC_API_KEY never logged or output by tests

## Integration Closure

- Upstream surfaces consumed: `RetryableSession` (S01), `FileSelector` (S02), `ComplexityClassifier` + `RoutingHistory` (S03), `WorktreeManager` (S04), `Doctor` (S05)
- New wiring introduced in this slice: `buildContext()` instantiates all S01-S05 modules; Orchestrator/SliceRunner pass classifier+history to TaskRouter; BaseAgent wraps session with RetryableSession; memory records injected from ProjectMemory
- What remains before the milestone is truly usable end-to-end: nothing — this slice is the final assembly proof

## Tasks

- [ ] **T01: Wire S01-S05 modules into composition root and harden BaseAgent for real API** `est:45m`
  - Why: All S01-S05 modules exist and are unit-tested but aren't connected in the composition root. Without wiring, the pipeline ignores retry logic, complexity routing, routing history, and memory records during real execution.
  - Files: `packages/cli/src/context.ts`, `packages/core/src/agents/base-agent.ts`, `packages/core/src/orchestrator/orchestrator.ts`, `packages/core/src/workflow/slice-runner.ts`
  - Do: (1) Add ComplexityClassifier + RoutingHistory to buildContext(). (2) Pass `{ classifier, history }` deps to TaskRouter in Orchestrator constructor and SliceRunner.run(). (3) Wire memory records from `context.memory` into agent spawn options in both Orchestrator.runAgent() and SliceRunner.executeTask(). (4) Wrap `session.prompt()` with RetryableSession in BaseAgent.execute(). (5) Harden `parseStructuredData()` regex to handle case-insensitive language tag and trailing whitespace. Constraint: RetryableSession.prompt() returns RetryResult — check success before proceeding; preserve event-based output capture.
  - Verify: `npx vitest run` — all 511 existing tests still pass; `npm run build && npm run typecheck` clean
  - Done when: buildContext returns complexityClassifier and routingHistory; BaseAgent uses RetryableSession; TaskRouter receives classifier+history deps; 511 tests pass; build clean

- [ ] **T02: Create ANTHROPIC_API_KEY-gated end-to-end integration test** `est:1h`
  - Why: R033 requires proof that the assembled pipeline works with real Anthropic API calls. This test is the milestone's final acceptance evidence.
  - Files: `packages/core/src/__tests__/e2e-integration.test.ts`
  - Do: (1) Create test file with `describe.skipIf(!process.env.ANTHROPIC_API_KEY)`. (2) Set up temp git repo with initial commit (follow worktree-manager-integration.test.ts pattern). (3) Build StupidConfig pointing at temp repo, wire full OrchestratorContext via imports. (4) Run `Orchestrator.run("add a hello world function")` and assert: plan has ≥1 slice, slices have tasks, agent outputs are non-empty. (5) Assert Doctor.check() passes on post-run state. (6) Verify test gracefully skips without API key. (7) Use 180s timeout for real API calls. Constraint: Import modules directly (not via barrel) to avoid mock interference from other test files.
  - Verify: `npx vitest run packages/core/src/__tests__/e2e-integration.test.ts` — skips without key, passes with key; `npx vitest run` — full suite still 511+ tests
  - Done when: Integration test file exists; passes with real API key; skips without key; full test suite has no regressions; build clean

## Files Likely Touched

- `packages/cli/src/context.ts`
- `packages/core/src/agents/base-agent.ts`
- `packages/core/src/orchestrator/orchestrator.ts`
- `packages/core/src/workflow/slice-runner.ts`
- `packages/core/src/__tests__/e2e-integration.test.ts`
