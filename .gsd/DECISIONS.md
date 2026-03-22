# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | Monorepo structure | Turborepo with 3 packages: @stupid/core, stupid (CLI), @stupid/pi-extension | Core logic shared between CLI and Pi extension. Turbo handles build ordering. | No |
| D002 | M001 | library | SQLite library for persistent memory | better-sqlite3 with FTS5 | Synchronous API, FTS5 full-text search, proven in Node.js. Privacy-first — no external DB. | No |
| D003 | M001 | arch | Sub-agent isolation mechanism | Pi SDK createAgentSession with SessionManager.inMemory() per sub-agent | Each sub-agent gets a fresh context window. No parent pollution. | Yes — if Pi SDK adds a dedicated spawn mode |
| D004 | M001 | convention | State directory name | .stupid/ per project | Matches product name. Contains state.json, STATE.md, SQLite DBs, activity logs. Git-ignored except config.yml. | No |
| D005 | M001 | arch | Agent prompt format | Markdown templates in prompts/ directory with {{TASK}}, {{MEMORY}}, {{FILES}} placeholders | Human-readable, version-controlled, easily customizable. | Yes — if structured config proves better |
| D006 | M001 | pattern | Sub-agent output format | Structured JSON blocks in markdown response, parsed with regex | LLMs reliably produce fenced JSON blocks. Simple extraction. | Yes — if Pi SDK adds structured output support |
| D007 | M001 | library | CLI framework | Commander.js | Lightweight, well-documented, ESM support. Inquirer for interactive prompts. | No |
| D008 | M001 | library | Config format | YAML (.stupid/config.yml) with Zod validation | Human-readable, comment-friendly. Zod for type-safe validation and defaults. | No |
| D009 | M001 | arch | Orchestrator constraint | Orchestrator NEVER calls read/write/edit/bash on project files | Keeps context clean for coordination. Max 15% context utilization. | No |
| D010 | M001 | pattern | Task execution order within slice | tester → implementer → verify → reviewer → finalizer | Test-first principle. Reviewer rejection = different agent, not same retry. | No |
| D011 | M001/S01 | convention | Workspace dependency syntax for npm workspaces | Use `"*"` instead of `"workspace:*"` for inter-package deps | `workspace:*` is pnpm/yarn syntax. npm workspaces resolve `"*"` to local packages automatically. | No |
| D012 | M001/S01 | convention | tsup banner config for CLI shebang | Use `tsup.config.ts` file instead of `--banner.js` CLI flag | tsup v8.5 doesn't support `--banner.js` CLI arg. Config file approach is stable across versions. | No |
| D013 | M001/S01 | convention | Per-package tsconfig overrides rootDir/outDir | Each package's tsconfig.json overrides `rootDir` and `outDir` from base | Base tsconfig paths resolve relative to repo root, not package root. | No |
| D014 | M001/S02 | pattern | deepMerge generic type constraint | Unconstrained generic `<T>` instead of `<T extends Record<string, unknown>>` | TypeScript interfaces don't satisfy index-signature constraints. | No |
| D015 | M001/S02 | pattern | Config file missing/malformed behavior | parseConfigFile silently returns `{}` — Zod validates after merge | Missing config is normal (first run, CI). Silent fallback lets deepMerge fill defaults. | No |
| D016 | M001/S02 | convention | Test import strategy | Tests import from `../index.js` (public API) not internal modules | Ensures tests validate the same surface downstream consumers use. | No |
| D017 | M001/S03 | arch | Forward dependencies on S04/S05/S06 | Interface injection — 7 interfaces in orchestrator/interfaces.ts, OrchestratorContext | Allows independent build/test. Interfaces are the contract, implementations pluggable. | No |
| D018 | M001/S03 | pattern | Model ID mapping for Pi SDK | Config stores short names (haiku/sonnet/opus). TaskRouter maps to Pi SDK IDs. | Config stays human-readable. Mapping centralized in TaskRouter. | Yes — when new models release |
| D019 | M001/S03 | pattern | Agent error handling — AgentResult, not exceptions | BaseAgent.execute() wraps all errors in AgentResult with success=false | Uniform contract. No exception-based control flow. | No |
| D020 | M001/S03 | pattern | Thin agent subclasses — override getTools() only | 7 agent subclasses only override getTools(). All lifecycle logic in BaseAgent. | Minimizes duplication. Tool-set is the only role-specific differentiator. | No |
| D021 | M001/S04 | arch | SliceRunner creates TaskRouter per run() call | Fresh TaskRouter from context config, not constructor arg | Keeps SliceRunner stateless. | No |
| D022 | M001/S04 | pattern | Escalation loop wraps implementer→verify→reviewer | Re-run full sub-pipeline on escalation | Rejected implementation needs re-verification and re-review. | No |
| D023 | M001/S04 | pattern | Budget check per individual task, not per phase | Check budgetEnforcer.check() before each task | More granular enforcement — stops sooner when budget is tight. | No |
| D024 | M001/S04 | pattern | Reviewer approval: structuredData.approved with fallback | Check structuredData.approved first, fall back to result.success | Graceful fallback prevents false rejections from missing data. | No |
| D025 | M001/S05 | pattern | FTS5 content-sync triggers for index maintenance | INSERT/DELETE/UPDATE triggers auto-sync FTS5 index | Eliminates manual dual-write. | No |
| D026 | M001/S05 | pattern | Prefix wildcard for short search terms | Terms ≤5 chars get `*` appended for fuzzy matching | Improves recall without hurting precision on longer queries. | No |
| D027 | M001/S05 | pattern | WAL journal mode for SQLite databases | Both MEMORY.db and sessions.db use WAL mode | Better concurrent read performance. | No |
| D028 | M001/S05 | pattern | Tiered snapshot compression at 2KB threshold | SessionMemory replaces arrays with counts when snapshot exceeds 2048 bytes | Prevents unbounded snapshot growth. | No |
| D029 | M001/S05 | pattern | Token budget estimation at 4 chars/token | MemoryInjector uses conservative 4 chars/token heuristic | Guarantees output fits within budget. | No |
| D030 | M001/S05 | pattern | Role-based record scoring via numeric weights | MemoryInjector scores records by role relevance with numeric weights | All records reachable; role affinity is ranking preference, not filter. | No |
| D031 | M001/S06 | pattern | State directory derivation | Derive stateDir as `join(config.projectRoot, '.stupid')` — not in StupidConfig | Keeps config type stable. One-liner derivation. | No |
| D032 | M001/S06 | pattern | Interface-first implementation — follow D017 contracts exactly | All S06 classes implement interface signatures from orchestrator/interfaces.ts | Signature deviation would cause runtime type errors when wired. | No |
| D033 | M001/S07 | pattern | CLI tsup bundling — externalize all runtime deps | Externalize all runtime deps in tsup.config.ts | Bundling @inquirer/prompts triggers dynamic require("tty") failure in ESM. | No |
| D034 | M001/S07 | library | Interactive prompt library | @inquirer/prompts (confirm) instead of full inquirer | Cleaner ESM import. Modular v2 API, lighter weight. | No |
| D035 | M002 | arch | M002 priority: end-to-end first, context engine later | Provider retry + file selector + worktree + doctor + real API proof before context compression | User needs a working pipeline; context compression is optimization. | No |
| D036 | M002 | scope | Provider retry scope: Anthropic-only in M002 | Only classify and retry Anthropic error types (rate_limit, overloaded, server_error) | Single provider simplifies implementation. Multi-provider in M003+. | Yes — when adding multi-provider |
| D037 | M002 | scope | Doctor scope: basic 5-7 checks in M002 | Lock integrity, state consistency, db integrity, stale worktree, config validity | Full 13+ checks with auto-fix deferred to M003. | No |
| D038 | M002 | scope | Real API test: requires ANTHROPIC_API_KEY, skippable | Integration test uses real Anthropic API; skipped in CI without the key | Proves assembled pipeline works. Not UAT — automated with assertions. | No |
| D039 | M002/S03 | pattern | IRoutingHistory interface: all methods synchronous | getBestModel returns `string \| null`, not `Promise`. getStats returns sync value. | better-sqlite3 is synchronous. TaskRouter.selectModel() must stay sync for backward compatibility with 23 existing tests. Async wrapper would add unnecessary complexity. | Yes — if RoutingHistory ever uses an async DB driver |
