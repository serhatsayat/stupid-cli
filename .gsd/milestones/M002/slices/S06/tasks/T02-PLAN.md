---
estimated_steps: 4
estimated_files: 1
skills_used:
  - test
---

# T02: Create ANTHROPIC_API_KEY-gated end-to-end integration test

**Slice:** S06 — End-to-End Integration & Real API Test
**Milestone:** M002

## Description

R033 requires proof that `stupid "add a hello world function"` executes the full pipeline with real Anthropic API calls — not mocks — and produces a valid plan. This is the milestone's final acceptance evidence.

This task creates a single test file `packages/core/src/__tests__/e2e-integration.test.ts` that:
- Skips gracefully when `ANTHROPIC_API_KEY` is not set (D038)
- Creates a temporary git repo with initial commit (following the `worktree-manager-integration.test.ts` pattern)
- Builds a real `StupidConfig` + `OrchestratorContext` with all S01-S05 modules wired
- Runs `Orchestrator.run("add a hello world function")` with real API
- Asserts on plan structure: ≥1 slice, slices have tasks, agent outputs are non-empty
- Runs `Doctor.check()` on post-run state and asserts it passes
- Cleans up temp directory

The test imports modules directly (not via the barrel `index.ts`) to avoid mock interference from other test files that use `vi.mock`.

## Steps

1. **Create `packages/core/src/__tests__/e2e-integration.test.ts`**. Use `describe.skipIf(!process.env.ANTHROPIC_API_KEY)` to gate the entire suite on the API key. Set up temp directory management with `afterEach` cleanup.

2. **Set up temp git repo helper**. Follow the exact pattern from `packages/core/src/__tests__/worktree-manager-integration.test.ts`: `mkdtempSync`, `git init -b main`, configure user.name/email, create README.md, `git add -A`, `git commit -m "initial commit"`. Also create a `.stupid/` directory and a minimal source file (e.g. `src/index.ts` with a comment) so agents have something to read.

3. **Write the main integration test**. Import concrete classes directly: `Orchestrator` from `../orchestrator/orchestrator.js`, `ComplexityClassifier` from `../orchestrator/complexity-classifier.js`, `RoutingHistory` from `../orchestrator/routing-history.js`, `CostTracker` from `../governance/cost-tracker.js`, `BudgetEnforcer` from `../governance/budget-enforcer.js`, `FileSelector` from `../context/file-selector.js`, `Doctor` from `../infrastructure/doctor.js`, `DEFAULT_CONFIG` from `../config/config.js`. Build config with `{ ...DEFAULT_CONFIG, profile: "budget", projectRoot: tempDir }` (budget profile = cheapest/fastest, skips architect phase). Wire full OrchestratorContext. Call `orchestrator.run("add a hello world function")` with `180_000` ms timeout. Assert: `plan.slices.length >= 1`, `plan.slices[0].tasks.length >= 1`, plan has milestone with non-empty title.

4. **Write Doctor health check test**. After the orchestrator run, create a `Doctor` instance with the temp projectRoot and call `doctor.check()`. Assert `report.passed === true` or at minimum that no checks have `status: "fail"`. This verifies state directory integrity after a real pipeline execution.

## Must-Haves

- [ ] Test file exists at `packages/core/src/__tests__/e2e-integration.test.ts`
- [ ] Test suite skips when ANTHROPIC_API_KEY is not set
- [ ] Test creates a temp git repo, runs Orchestrator.run() with real API, asserts plan structure
- [ ] Doctor.check() is exercised and asserts no failures
- [ ] Test cleans up temp directory in afterEach
- [ ] Test uses 180s timeout for real API calls
- [ ] All existing 511 tests still pass (test file doesn't interfere)
- [ ] ANTHROPIC_API_KEY is never logged or echoed in test output

## Verification

- `npx vitest run packages/core/src/__tests__/e2e-integration.test.ts` — skips with "no tests" or "skipped" when ANTHROPIC_API_KEY is unset
- `ANTHROPIC_API_KEY=<real-key> npx vitest run packages/core/src/__tests__/e2e-integration.test.ts` — passes with real API (when key available)
- `npx vitest run` — full suite still 511+ tests, no regressions
- `npm run build && npm run typecheck` — clean

## Inputs

- `packages/core/src/__tests__/worktree-manager-integration.test.ts` — pattern for temp git repo setup/cleanup
- `packages/core/src/orchestrator/orchestrator.ts` — Orchestrator class (wired in T01)
- `packages/core/src/orchestrator/interfaces.ts` — OrchestratorContext type
- `packages/core/src/infrastructure/doctor.ts` — Doctor class
- `packages/core/src/config/config.ts` — DEFAULT_CONFIG
- `packages/core/src/orchestrator/complexity-classifier.ts` — ComplexityClassifier class
- `packages/core/src/orchestrator/routing-history.ts` — RoutingHistory class
- `packages/core/src/governance/cost-tracker.ts` — CostTracker class
- `packages/core/src/governance/budget-enforcer.ts` — BudgetEnforcer class
- `packages/core/src/context/file-selector.ts` — FileSelector class
- `packages/cli/src/context.ts` — reference for how buildContext wires everything (modified in T01)

## Observability Impact

- **New test signal**: `e2e-integration.test.ts` exercises the real Orchestrator pipeline end-to-end, validating plan structure and Doctor health post-execution. Future agents can run this test with a real API key to verify the assembled system.
- **Skip visibility**: When ANTHROPIC_API_KEY is absent, vitest reports the suite as "1 skipped" — no misleading pass/fail signals.
- **Doctor verification**: The test runs `Doctor.check()` on the `.stupid/` state directory created during execution, verifying SQLite DB integrity (routing.db, MEMORY.db), no stale locks, and no corrupt state files.
- **Failure state**: If the pipeline produces an invalid plan (no slices, no tasks, empty milestone title), the test fails with specific assertion messages identifying which structural check failed. If Doctor detects corruption, the failed checks are surfaced via `expect(failedChecks).toEqual([])`.

## Expected Output

- `packages/core/src/__tests__/e2e-integration.test.ts` — new file: ANTHROPIC_API_KEY-gated integration test proving full pipeline with real API
