# S02: File Selector & Context Wiring

**Goal:** Agents receive task-relevant project files in their context instead of empty arrays.
**Demo:** `FileSelector.selectFiles("add a hello world function", projectRoot)` returns ranked file paths; Orchestrator and SliceRunner pass these to agents via `contextFiles`.

## Must-Haves

- `FileSelector` extracts keywords from task descriptions, walks project files (respecting exclusion patterns), scores by keyword hits, and returns ranked paths
- `IFileSelector` interface defined in `orchestrator/interfaces.ts` with `selectFiles(taskOrDescription, projectRoot, maxFiles?)` returning `Promise<string[]>`
- `OrchestratorContext` extended with optional `fileSelector?: IFileSelector`
- `Orchestrator.runAgent()` uses `fileSelector.selectFiles()` instead of hardcoded `contextFiles: []`
- `SliceRunner.executeTask()` uses `fileSelector.selectFiles()` when `task.files` is empty
- `buildContext()` in CLI instantiates and injects `FileSelector`
- Unit tests prove keyword extraction, file walking, scoring, ranking, and edge cases
- All existing M001 tests still pass (optional field addition is backward-compatible)

## Proof Level

- This slice proves: contract (FileSelector returns relevant files for known tasks)
- Real runtime required: no (unit tests with temp directory fixtures suffice)
- Human/UAT required: no

## Verification

- `cd packages/core && npx vitest run src/__tests__/file-selector.test.ts` — all FileSelector unit tests pass
- `npm run test` — all existing tests still pass (no regressions)
- `npm run typecheck` — TypeScript strict mode clean with new interface and context extension
- R030 proof: `file-selector.test.ts` includes a test that calls `selectFiles("add error handling", projectRoot)` on a temp fixture project and asserts the result is non-empty and contains expected files

## Integration Closure

- Upstream surfaces consumed: `OrchestratorContext` (interfaces.ts), `Orchestrator.runAgent()` (orchestrator.ts), `SliceRunner.executeTask()` (slice-runner.ts), `buildContext()` (context.ts)
- New wiring introduced in this slice: `FileSelector` instantiated in CLI composition root, injected via `OrchestratorContext.fileSelector`, consumed by Orchestrator and SliceRunner
- What remains before the milestone is truly usable end-to-end: S03 (complexity routing), S04 (git worktree), S05 (doctor), S06 (real API integration test)

## Tasks

- [x] **T01: Build FileSelector core module with IFileSelector interface and unit tests** `est:1h`
  - Why: The core file selection algorithm is the primary deliverable — keyword extraction, project walking, scoring, ranking. Building it with tests first proves correctness before wiring.
  - Files: `packages/core/src/context/file-selector.ts`, `packages/core/src/orchestrator/interfaces.ts`, `packages/core/src/__tests__/file-selector.test.ts`
  - Do: Create `FileSelector` class with `extractKeywords()`, `walkProject()`, `scoreFile()`, `selectFiles()`. Add `IFileSelector` interface and `fileSelector?: IFileSelector` to `OrchestratorContext`. Write comprehensive vitest unit tests using temp directory fixtures with known file content. Cover: keyword extraction (stop word removal, dedup), file walking (exclusion patterns, extension filtering), scoring (path match bonus, content match, extension bonus), ranking (sorted, capped at maxFiles), edge cases (empty keywords → fallback to recent files, no matches, large file lists).
  - Verify: `cd packages/core && npx vitest run src/__tests__/file-selector.test.ts` passes, `npm run typecheck` clean
  - Done when: `FileSelector.selectFiles()` returns relevant ranked file paths for test fixtures, all unit tests pass, `IFileSelector` interface accepted by TypeScript

- [ ] **T02: Wire FileSelector into Orchestrator, SliceRunner, CLI context, and public exports** `est:45m`
  - Why: The FileSelector exists but nothing uses it yet. This task replaces every `contextFiles: []` with real file selection and wires the composition root.
  - Files: `packages/core/src/orchestrator/orchestrator.ts`, `packages/core/src/workflow/slice-runner.ts`, `packages/cli/src/context.ts`, `packages/core/src/index.ts`
  - Do: In `Orchestrator.runAgent()`, replace `contextFiles: []` with `this.deps.fileSelector?.selectFiles(taskSpec, projectRoot) ?? []`. In `SliceRunner`, pass `OrchestratorContext` to `executeTask()` (replacing bare `config`), use `context.fileSelector?.selectFiles(task.description, context.config.projectRoot) ?? task.files` for contextFiles. In `buildContext()`, instantiate `FileSelector` and add to returned context. Export `FileSelector` and `IFileSelector` from `packages/core/src/index.ts`. Ensure all changes are backward-compatible (optional field, fallback to `[]`).
  - Verify: `npm run test` passes (all existing + new tests), `npm run typecheck` clean
  - Done when: Orchestrator and SliceRunner use real file selection when `fileSelector` is injected, CLI composition root provides it, all tests pass

## Files Likely Touched

- `packages/core/src/context/file-selector.ts` (new)
- `packages/core/src/__tests__/file-selector.test.ts` (new)
- `packages/core/src/orchestrator/interfaces.ts` (modify — add IFileSelector + OrchestratorContext field)
- `packages/core/src/orchestrator/orchestrator.ts` (modify — wire file selection in runAgent)
- `packages/core/src/workflow/slice-runner.ts` (modify — wire file selection in executeTask)
- `packages/cli/src/context.ts` (modify — instantiate FileSelector)
- `packages/core/src/index.ts` (modify — export FileSelector + IFileSelector)

## Observability / Diagnostics

- **Runtime signals:** `FileSelector.selectFiles()` returns `Promise<string[]>` — empty array signals no matches; consumers should log when result is empty vs. populated. Future: add structured logging of keyword count, walk count, scored count, and fallback trigger.
- **Inspection surfaces:** Static methods (`extractKeywords`, `walkProject`, `scoreFile`) are individually testable and inspectable — callers can verify intermediate outputs. The `IFileSelector` interface enables mock injection for deterministic testing.
- **Failure visibility:** Missing or unreadable project directories produce an empty result (no throw). `walkProject()` silently skips unreadable entries. `scoreFile()` skips unreadable files but still includes them in the candidate pool. Falls back to recently-modified files when keyword scoring yields <3 results — this fallback path is observable via test assertions.
- **Redaction:** No secrets or PII handled. File paths are project-relative. File content is read only for scoring (first 10KB) and never persisted or returned.
