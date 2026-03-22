---
estimated_steps: 5
estimated_files: 5
skills_used:
  - test
---

# T02: Wire FileSelector into Orchestrator, SliceRunner, CLI context, and public exports

**Slice:** S02 — File Selector & Context Wiring
**Milestone:** M002

## Description

The `FileSelector` module and `IFileSelector` interface exist from T01 but nothing uses them. This task replaces every `contextFiles: []` with real file selection by wiring `FileSelector` into the Orchestrator, SliceRunner, and CLI composition root. All changes are backward-compatible — `fileSelector` is optional with `[]` fallback.

Key wiring points:
- **Orchestrator.runAgent()** (line ~222): `contextFiles: []` → `contextFiles: await this.deps.fileSelector?.selectFiles(contextDescription, this.config.projectRoot) ?? []`
- **SliceRunner.executeTask()** (line ~210): pass `OrchestratorContext` to the method so it can access `fileSelector`, use it when `task.files` is empty
- **CLI buildContext()**: instantiate `FileSelector` and add to returned `OrchestratorContext`
- **packages/core/src/index.ts**: export `FileSelector` and `IFileSelector`

## Steps

1. Modify `packages/core/src/orchestrator/orchestrator.ts`:
   - In the `runAgent()` method, replace the hardcoded `contextFiles: []` with a call to `this.deps.fileSelector?.selectFiles()`, falling back to `[]` when no fileSelector is injected.
   - The task description (`contextDescription` param) serves as the input for keyword extraction.
   - Also replace `files: []` in the `taskSpec` with the same file list (so the TaskSpec carries the files too).
   - Keep the change minimal — the `Orchestrator` constructor already accepts `deps` which contains `OrchestratorContext` fields.

2. Modify `packages/core/src/workflow/slice-runner.ts`:
   - Change `executeTask()` signature to accept `OrchestratorContext` (or the relevant deps) instead of just `StupidConfig`.
   - Inside `executeTask()`, when `task.files` is empty, use `context.fileSelector?.selectFiles(task.description, context.config.projectRoot) ?? []` for `contextFiles`.
   - When `task.files` is non-empty, keep using `task.files` (the plan already specified files).
   - Update all call sites of `executeTask()` within `run()` to pass the context.
   - The `run()` method already receives `OrchestratorContext`, so the context is available.

3. Modify `packages/cli/src/context.ts`:
   - Import `FileSelector` from `@stupid/core`
   - Instantiate `new FileSelector()` and add `fileSelector` to the returned `OrchestratorContext` object

4. Modify `packages/core/src/index.ts`:
   - Add export for `FileSelector` from `"./context/file-selector.js"`
   - Add `IFileSelector` to the type exports from `"./orchestrator/interfaces.js"`

5. Run full test suite: `npm run test` (all packages) and `npm run typecheck`. Verify:
   - All existing orchestrator, slice-runner, and context tests still pass (optional field = backward-compatible)
   - No TypeScript errors from the new wiring
   - The `file-selector.test.ts` from T01 still passes

## Must-Haves

- [ ] `Orchestrator.runAgent()` calls `fileSelector.selectFiles()` instead of hardcoding `contextFiles: []`
- [ ] `SliceRunner.executeTask()` calls `fileSelector.selectFiles()` when `task.files` is empty
- [ ] `buildContext()` instantiates `FileSelector` and injects it into `OrchestratorContext`
- [ ] `FileSelector` and `IFileSelector` exported from `packages/core/src/index.ts`
- [ ] All existing tests pass (no regressions)
- [ ] `npm run typecheck` clean

## Verification

- `npm run test` — all tests pass across all packages (including existing M001 tests)
- `npm run typecheck` — TypeScript strict mode clean
- `grep -q "fileSelector" packages/core/src/orchestrator/orchestrator.ts` — confirms Orchestrator wiring
- `grep -q "fileSelector" packages/core/src/workflow/slice-runner.ts` — confirms SliceRunner wiring
- `grep -q "FileSelector" packages/cli/src/context.ts` — confirms CLI composition root wiring
- `grep -q "FileSelector" packages/core/src/index.ts` — confirms public export

## Inputs

- `packages/core/src/context/file-selector.ts` — FileSelector class created in T01
- `packages/core/src/orchestrator/interfaces.ts` — IFileSelector interface and OrchestratorContext.fileSelector field added in T01
- `packages/core/src/orchestrator/orchestrator.ts` — existing Orchestrator with hardcoded `contextFiles: []`
- `packages/core/src/workflow/slice-runner.ts` — existing SliceRunner with `executeTask(task, modelSelection, config)`
- `packages/cli/src/context.ts` — existing composition root without FileSelector
- `packages/core/src/index.ts` — existing public exports

## Expected Output

- `packages/core/src/orchestrator/orchestrator.ts` — modified to use `fileSelector.selectFiles()` in `runAgent()`
- `packages/core/src/workflow/slice-runner.ts` — modified to use `fileSelector.selectFiles()` in `executeTask()` when `task.files` is empty
- `packages/cli/src/context.ts` — modified to instantiate and inject `FileSelector`
- `packages/core/src/index.ts` — modified to export `FileSelector` and `IFileSelector`

## Observability Impact

- **Orchestrator.runAgent()**: `contextFiles` and `taskSpec.files` now contain dynamically selected file paths instead of empty arrays. When `fileSelector` is not injected (tests, standalone use), falls back to `[]` — behavior unchanged. Agents receiving populated `contextFiles` produce more targeted output.
- **SliceRunner.executeTask()**: When `task.files` is empty and `fileSelector` is available, dynamically resolves context files. When `task.files` is pre-populated (plan specified files), those are used unchanged. A future agent can inspect `spawnOptions.contextFiles` in agent logs to see which files were selected.
- **CLI buildContext()**: `FileSelector` is always instantiated. No failure mode — constructor is a no-op. Its presence in context enables the Orchestrator and SliceRunner wiring above.
- **Failure visibility**: If `fileSelector.selectFiles()` returns `[]`, agents get no file context — functionally identical to pre-wiring behavior. The optional chaining (`?.`) pattern ensures no runtime errors when `fileSelector` is absent.
