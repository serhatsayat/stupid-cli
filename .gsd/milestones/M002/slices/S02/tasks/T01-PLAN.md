---
estimated_steps: 5
estimated_files: 3
skills_used:
  - test
---

# T01: Build FileSelector core module with IFileSelector interface and unit tests

**Slice:** S02 — File Selector & Context Wiring
**Milestone:** M002

## Description

Create the `FileSelector` class that analyzes task descriptions to find relevant project files. The module extracts keywords from a task string, walks the project directory (excluding node_modules, dist, .git, etc.), scores files by keyword hits in both file paths and content, and returns ranked paths capped at `maxFiles`. Also add the `IFileSelector` interface to `orchestrator/interfaces.ts` and extend `OrchestratorContext` with an optional `fileSelector` field. Write comprehensive unit tests using temp directory fixtures.

The algorithm:
1. **extractKeywords(text)** — split on whitespace/punctuation, lowercase, remove stop words (the, a, an, is, to, for, of, in, on, with, and, or, etc.), remove words ≤2 chars, deduplicate
2. **walkProject(projectRoot, excludePatterns)** — recursive `readdirSync`, exclude `node_modules/dist/.git/.stupid/coverage/.turbo/.next` etc., include only `.ts/.tsx/.js/.jsx/.json/.md/.yml/.yaml/.css/.html/.vue/.svelte`, cap at ~500 files
3. **scoreFile(filePath, content, keywords)** — content keyword hit = +2, path keyword hit = +5, source file bonus = +1 for `.ts/.tsx`, test file matching keyword = +3
4. **selectFiles(taskOrDescription, projectRoot, maxFiles=15)** — orchestrate the pipeline, return sorted paths. If keywords produce <3 results, fall back to recently-modified files via `statSync().mtime`

The interface accepts both `string` and `TaskSpec` (extract `.description` from TaskSpec). Returns `Promise<string[]>` for future-proofing even though initial implementation is synchronous.

## Steps

1. Create `packages/core/src/context/file-selector.ts` with the `FileSelector` class implementing `IFileSelector`. Include:
   - `static extractKeywords(text: string): string[]` — tokenize, lowercase, strip stop words, dedupe
   - `static walkProject(projectRoot: string, excludePatterns?: string[]): string[]` — recursive walk with exclusion
   - `static scoreFile(filePath: string, content: string, keywords: string[]): number` — scoring algorithm
   - `async selectFiles(taskOrDescription: string | TaskSpec, projectRoot: string, maxFiles?: number): Promise<string[]>` — main entry point
   - Hardcoded `DEFAULT_EXCLUDE` and `DEFAULT_INCLUDE_EXT` arrays
   - Only read first 10KB of each file for scoring (truncate)

2. Add `IFileSelector` interface to `packages/core/src/orchestrator/interfaces.ts`:
   ```typescript
   export interface IFileSelector {
     selectFiles(
       taskOrDescription: string | TaskSpec,
       projectRoot: string,
       maxFiles?: number,
     ): Promise<string[]>;
   }
   ```
   Add `fileSelector?: IFileSelector` to `OrchestratorContext`.

3. Create `packages/core/src/__tests__/file-selector.test.ts` with vitest tests. Use `mkdtempSync` for temp fixtures. Test groups:
   - **extractKeywords**: stop word removal, short word removal, dedup, punctuation handling, empty input
   - **walkProject**: excludes node_modules/dist/.git, includes only allowed extensions, handles missing dir gracefully
   - **scoreFile**: path keyword match (+5), content keyword match (+2), .ts extension bonus (+1), test file bonus (+3)
   - **selectFiles**: full pipeline with fixture project, respects maxFiles cap, returns relative paths, falls back to recent files when keywords match <3 files, handles TaskSpec input
   - **R030 proof**: assert that `selectFiles("add error handling", fixtureRoot)` returns non-empty results containing expected files

4. Ensure the `TaskSpec` import is correct (from `../types/index.js`) and the interface handles both `string` and `TaskSpec` input types.

5. Run tests: `cd packages/core && npx vitest run src/__tests__/file-selector.test.ts` and `npm run typecheck`.

## Must-Haves

- [ ] `FileSelector.selectFiles()` returns relevant ranked file paths for known fixture inputs
- [ ] `extractKeywords()` strips stop words, handles punctuation, deduplicates
- [ ] `walkProject()` excludes node_modules, dist, .git; includes only allowed extensions
- [ ] `scoreFile()` weights path matches > content matches, gives bonuses for source/test files
- [ ] Fallback to recently-modified files when keyword matching produces <3 results
- [ ] `IFileSelector` interface added to `orchestrator/interfaces.ts`
- [ ] `OrchestratorContext` extended with optional `fileSelector?: IFileSelector`
- [ ] All unit tests pass
- [ ] `npm run typecheck` clean

## Verification

- `cd packages/core && npx vitest run src/__tests__/file-selector.test.ts` — all tests pass
- `npm run typecheck` — no type errors
- Tests include R030 assertion: `selectFiles()` for a known task on fixture project returns non-empty array with expected file paths

## Inputs

- `packages/core/src/orchestrator/interfaces.ts` — existing interface file to extend with `IFileSelector` and `fileSelector` field
- `packages/core/src/types/index.ts` — `TaskSpec` type definition (read-only, to import for `IFileSelector` signature)

## Expected Output

- `packages/core/src/context/file-selector.ts` — new FileSelector class with full algorithm
- `packages/core/src/__tests__/file-selector.test.ts` — comprehensive unit tests with fixture-based assertions
- `packages/core/src/orchestrator/interfaces.ts` — modified with `IFileSelector` interface and `OrchestratorContext.fileSelector` field

## Observability Impact

- **New signals:** `FileSelector` static methods (`extractKeywords`, `walkProject`, `scoreFile`) are individually callable and testable — a future agent can verify each pipeline stage in isolation. `selectFiles()` returns relative paths; empty array = no matches.
- **Inspection:** Future agents can call `FileSelector.extractKeywords(text)` to verify keyword extraction, or `FileSelector.walkProject(root)` to inspect which files are visible in a project. The `IFileSelector` interface enables mock injection.
- **Failure visibility:** Unreadable directories and files are silently skipped (no throws). The fallback to recently-modified files triggers when keyword matching yields <3 results — test assertions verify this path. Empty project root → empty result (no error).
