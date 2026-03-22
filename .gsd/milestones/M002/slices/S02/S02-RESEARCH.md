# S02 Research: File Selector & Context Wiring

**Slice:** S02 — File Selector & Context Wiring
**Risk:** high
**Depends on:** none
**Requirement coverage:** R030 (primary owner)

## Summary

This slice creates a `FileSelector` module that analyzes a task description, finds relevant project files via keyword extraction + grep-like matching, ranks them, and returns paths. Then it wires this into the `Orchestrator` and `SliceRunner` so agents receive relevant files instead of empty arrays. The work is self-contained — no external library dependencies, zero-dependency on S01, and the codebase has clear seams showing exactly where `contextFiles: []` needs to become `contextFiles: fileSelector.selectFiles(...)`.

## Recommendation

**Approach: Pure Node.js keyword-grep-rank pipeline, no external deps.**

The project runs on Node.js 22 which supports `readdirSync({recursive: true})` and `fs.globSync`. No need for `fast-glob` or `minimatch` — the project has zero glob dependencies today and shouldn't add one for this. The file selector should:

1. Walk project directory (respecting gitignore-like exclusion patterns)
2. Extract keywords from task description (strip stop words, tokenize)
3. Grep file contents for keyword matches using `readFileSync` + string matching
4. Score files by hit count, file-path relevance, and recency
5. Return ranked file paths capped at `maxFiles` (default ~15)

This follows the established project pattern: pure Node.js stdlib (`node:fs`, `node:path`), synchronous where possible, no external libraries for core logic.

## Implementation Landscape

### What exists today

| Component | File | Current State |
|---|---|---|
| `SubAgentSpawnOptions.contextFiles` | `types/index.ts:64` | `string[]` — already typed, ready to receive file paths |
| `BaseAgent.execute()` | `agents/base-agent.ts:71` | Joins `options.contextFiles` with `\n` into `{{FILES}}` placeholder — **already wired** |
| `SliceRunner.executeTask()` | `workflow/slice-runner.ts:216` | Passes `contextFiles: task.files` — but `task.files` is always `[]` |
| `Orchestrator.runAgent()` | `orchestrator/orchestrator.ts:222-224` | Hardcoded `files: []` and `contextFiles: []` |
| `TaskSpec.files` | `types/index.ts:56` | `string[]` — populated by `TaskPlanner` from architect structured data, but currently always empty |
| `OrchestratorContext` | `orchestrator/interfaces.ts` | No `fileSelector` field — needs addition |
| Prompt templates | `prompts/*.md` | All 8 prompts have `{{FILES}}` section — already expect file paths |
| `compilePrompt()` | `agents/prompt-loader.ts` | Replaces `{{FILES}}` with `vars.files` — **already wired** |
| `buildContext()` | `packages/cli/src/context.ts` | Composition root — creates all deps but no file selector |

### What needs to be built

1. **`packages/core/src/context/file-selector.ts`** — New module. The `FileSelector` class with `selectFiles(taskSpec, projectRoot, maxFiles?)` method.
2. **`packages/core/src/orchestrator/interfaces.ts`** — Add `IFileSelector` interface and optional `fileSelector?: IFileSelector` to `OrchestratorContext`.
3. **`packages/core/src/orchestrator/orchestrator.ts`** — Wire `fileSelector.selectFiles()` into `runAgent()` where it currently sets `files: []`.
4. **`packages/core/src/workflow/slice-runner.ts`** — Wire `fileSelector.selectFiles()` into `executeTask()` or use pre-populated `task.files`.
5. **`packages/cli/src/context.ts`** — Instantiate `FileSelector` and add to `OrchestratorContext` bag.
6. **`packages/core/src/index.ts`** — Export `FileSelector` and `IFileSelector`.
7. **`packages/core/src/__tests__/file-selector.test.ts`** — Unit tests for the selector.

### File selector algorithm (detail)

```
selectFiles(taskOrDescription, projectRoot, maxFiles = 15):
  1. keywords = extractKeywords(taskOrDescription)
     - Split on whitespace/punctuation
     - Lowercase
     - Remove stop words (the, a, an, is, to, for, of, in, on, with, and, or, etc.)
     - Remove very short words (≤2 chars)
     - Deduplicate

  2. allFiles = walkProject(projectRoot, excludePatterns)
     - Recursive readdirSync
     - Exclude: node_modules, dist, .git, .stupid, coverage, *.db, binary files
     - Include only: .ts, .js, .tsx, .jsx, .json, .md, .yml, .yaml, .css, .html
     - Cap at reasonable limit (~500 files scanned)

  3. scoredFiles = []
     For each file:
       score = 0
       content = readFileSync(file) (truncated to first 10KB)
       
       // Keyword hits in content
       for keyword in keywords:
         if content.includes(keyword): score += 2
         if filePath.includes(keyword): score += 5  // path match = strong signal
       
       // Bonus signals
       if file is in src/ (not test): score += 1
       if file is a test matching a keyword: score += 3  // tests are high-signal
       if file extension is .ts/.tsx: score += 1  // prefer source over config
       
       if score > 0: scoredFiles.push({path, score})

  4. return scoredFiles
       .sort((a,b) => b.score - a.score)
       .slice(0, maxFiles)
       .map(f => f.path)  // relative to projectRoot
```

### Wiring points (exact code changes)

**Orchestrator (`orchestrator.ts:210-226`):**
```
// Current:
contextFiles: [],
// After:
contextFiles: this.deps.fileSelector
  ? await this.deps.fileSelector.selectFiles(taskSpec, this.config.projectRoot)
  : [],
```
Where `taskSpec` is the synthetic `TaskSpec` built at line 215-222. The description field already contains the task text — that's the input for keyword extraction.

**SliceRunner (`slice-runner.ts:210-218`):**
The `executeTask` method receives `task.files` which comes from the plan. Two options:
- **Option A:** FileSelector runs per-task in `executeTask()` (dynamic selection per task)
- **Option B:** FileSelector runs once per slice in `run()` and enriches `task.files` before execution

**Recommendation: Option A** — run per-task. Each task has a different description and needs different files. The cost is minimal (disk reads, no network). The SliceRunner needs access to `context.fileSelector` from `OrchestratorContext`, which is already passed to `run()`.

### Interface contract

```typescript
// In orchestrator/interfaces.ts
export interface IFileSelector {
  selectFiles(
    taskOrDescription: string | TaskSpec,
    projectRoot: string,
    maxFiles?: number,
  ): Promise<string[]>;
}
```

The interface accepts both a raw string and a `TaskSpec` — the implementation extracts the description from either. Return type is `Promise<string[]>` for interface consistency (even though the initial implementation is synchronous, future versions may use async grep or git log).

### Exclusion patterns

The `.gitignore` already lists patterns that should be excluded. The file selector should have a hardcoded default exclusion set that covers the common cases:

```typescript
const DEFAULT_EXCLUDE = [
  'node_modules', 'dist', 'build', '.git', '.stupid',
  'coverage', '.turbo', '.next', '__pycache__',
  '.env', '*.db', '*.db-journal', '*.lock',
  '*.map', '*.min.js', '*.min.css',
];

const DEFAULT_INCLUDE_EXT = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.yml', '.yaml',
  '.css', '.html', '.vue', '.svelte',
];
```

No need to parse `.gitignore` in M002 — hardcoded defaults cover 95% of cases. Gitignore parsing can be added later if needed.

## Key Risks & Mitigations

### 1. Keyword extraction quality
**Risk:** Naive tokenization misses domain-specific keywords ("worktree" → should match files about git, "SQLite" → should match database files).
**Mitigation:** Keep keywords case-insensitive, include the original task words without over-filtering. Test with real task descriptions like "add a hello world function" and verify expected files are selected.

### 2. Performance on large projects
**Risk:** Reading every file's content for grep matching could be slow on projects with 10K+ files.
**Mitigation:** 
- Cap file walk at 500 files (configurable)
- Only read first 10KB of each file for scoring
- Path-based matching runs before content matching (cheap filter first)
- Most projects under 500 source files after exclusion

### 3. File selector returns irrelevant files
**Risk:** Keyword matching is blunt — "add a function" might match every file mentioning "function".
**Mitigation:**
- Path-match bonus (5x) strongly favors files whose path contains the keyword
- Common words like "function", "add", "create" can be added to stop words
- Test verification: for a known task on this repo, verify the top files are relevant

### 4. Empty results for vague tasks
**Risk:** Task like "fix the bug" matches nothing useful.
**Mitigation:** Fallback to returning recently modified files (via `statSync.mtime`) when keyword matching produces <3 results. This ensures agents always get some context.

## Task Decomposition (natural seams)

### T01: FileSelector core module
- Create `packages/core/src/context/file-selector.ts`
- Implement `extractKeywords()`, `walkProject()`, `scoreFile()`, `selectFiles()`
- Pure functions, no side effects beyond disk reads
- **Verifiable independently** — unit tests with temp directory fixtures

### T02: IFileSelector interface + OrchestratorContext extension
- Add `IFileSelector` to `orchestrator/interfaces.ts`
- Add `fileSelector?: IFileSelector` to `OrchestratorContext`
- Update `packages/core/src/index.ts` exports
- **Verifiable independently** — TypeScript typecheck passes

### T03: Wire into Orchestrator
- Modify `Orchestrator.runAgent()` to use `this.deps.fileSelector?.selectFiles()`
- Update `Orchestrator.executePhase()` to pass task description for file selection
- Ensure tests still pass (the field is optional, so existing tests keep working)

### T04: Wire into SliceRunner
- Modify `SliceRunner.executeTask()` to call `context.fileSelector?.selectFiles(task)` when `task.files` is empty
- Pass `OrchestratorContext` through to where it's needed (it's already in `run()`)

### T05: Wire into composition root
- Add `FileSelector` instantiation to `buildContext()` in `packages/cli/src/context.ts`

### T06: Unit tests for FileSelector
- Create temp directory fixtures with known files
- Test keyword extraction from various task descriptions
- Test file walking with exclusion patterns
- Test scoring and ranking
- Test the full `selectFiles()` pipeline
- Verify R030: "agents get relevant files, not empty arrays"

### Build order: T01 → T02 → T06 → T03 → T04 → T05

T01 and T02 can be done in parallel (no dependency). T06 tests T01. T03 and T04 depend on T02. T05 depends on T03+T04. T06 should be done early (test-first for the core module).

## Verification Strategy

1. **Unit tests** (`file-selector.test.ts`):
   - `extractKeywords("add a hello world function")` → `["hello", "world", "function"]` (stop words removed)
   - `walkProject(tempDir)` excludes `node_modules/`, `dist/`, `*.db`
   - `selectFiles("implement error handling", projectRoot)` returns files mentioning "error" and "handling"
   - Empty keyword edge case → returns fallback files (recently modified)
   - Large file list → respects `maxFiles` cap

2. **Integration verification** (R030 proof):
   - Run `FileSelector.selectFiles("add a hello world function", thisProjectRoot)` against this actual repo
   - Assert result includes relevant source files (e.g., files in `packages/core/src/`)
   - Assert result does NOT include `node_modules/`, `.git/`, or binary files
   - Assert result is non-empty (the current `[]` problem is fixed)

3. **Typecheck**: `npm run typecheck` passes with new interface + context extension
4. **Existing tests pass**: all M001 tests still pass (optional field addition is backward-compatible)

## Dependencies & Constraints

- **Zero external deps** — uses only `node:fs`, `node:path`, standard Node.js 22 APIs
- **No breaking changes** — `IFileSelector` is optional in `OrchestratorContext`, so all existing tests continue to work
- **File system access required** — tests need temp directories with fixture files (use `mkdtempSync`)
- **Synchronous internals, async interface** — implementation uses `readFileSync`/`readdirSync` but `IFileSelector.selectFiles()` returns `Promise<string[]>` for future-proofing
