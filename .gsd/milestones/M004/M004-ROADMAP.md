# M004 Roadmap: Context Engine

## Slices

- [ ] **S01: Context compressor with tool-type strategies** `risk:medium` `depends:[]`
  Build `ContextCompressor` class with per-tool compression strategies: file read (keep head/tail, summarize middle), grep (deduplicate, cap results), bash (keep exit code + last N lines), ls/find (tree summary). Wire as optional middleware in `BaseAgent.execute()` — compresses tool output before it enters agent context. Add unit tests with real-world-sized inputs.

- [ ] **S02: Snapshot builder with priority tiers** `risk:medium` `depends:[S01]`
  Build `SnapshotBuilder` that produces priority-tiered XML snapshots ≤2KB. Four tiers: critical (errors, failing tests, type signatures), high (recent file changes, current task context), medium (related file summaries), low (project structure overview). Used by `SessionMemory` during compaction. Add unit tests for tier ordering and size cap enforcement.

- [ ] **S03: Token profile compression integration** `risk:low` `depends:[S01,S02]`
  Wire compression level into token profiles: budget=aggressive (max compression, minimal inline), balanced=moderate (compress large outputs only), quality=none (full context). Update `Orchestrator.runAgent()` and `SliceRunner.executeTask()` to pass profile-appropriate compression config. Verify token usage delta between profiles.
