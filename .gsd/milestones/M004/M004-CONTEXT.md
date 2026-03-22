# M004: Context Engine (Compressor + Snapshot Builder)

## Goal

Implement the context compression pipeline that reduces tool output from ~315KB to ~5.4KB, enabling agents to operate within token budgets without losing critical information. This is the optimization layer that makes budget profile genuinely cheap.

## Constraints

- Compression must be lossless for critical signals (errors, types, exports)
- Token profiles (budget/balanced/quality) control compression aggressiveness
- Compressor operates as middleware — transparent to agents
- No external services — all compression is local string manipulation

## Key Components

1. **ContextCompressor** — sandboxes tool outputs by type (file read, grep, bash, ls). Keeps imports/exports/errors, summarizes middle sections. ~98% reduction on large outputs.
2. **SnapshotBuilder** — creates priority-tiered XML snapshots ≤2KB for context compaction. Tiers: critical (errors, types) → high (recent changes) → medium (related files) → low (project structure).
3. **Token profile integration** — budget = aggressive compression, balanced = moderate, quality = no compression.

## Success Criteria

1. ContextCompressor reduces 300KB+ tool output to <10KB while preserving actionable info
2. SnapshotBuilder produces ≤2KB XML snapshots with tiered priorities
3. Token profiles control compression level end-to-end
4. Budget profile shows measurable token reduction vs no compression
5. All existing tests pass — compression is additive, not breaking

## plan.md References

- §11: Context Engine
- §17: Model Routing & Token Profiles
