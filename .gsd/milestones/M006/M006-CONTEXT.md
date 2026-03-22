# M006: Wave Scheduler & Headless Mode

## Goal

Enable parallel task execution within slices (wave scheduling) and non-interactive CI/CD execution (headless mode). Add quick mode for small single-task fixes without full planning ceremony.

## Constraints

- Wave scheduler must respect task dependency DAG — only independent tasks run in parallel
- Headless mode must work without TTY (piped stdin, CI environment)
- Quick mode uses budget profile by default — minimal cost for small fixes
- Parallel execution respects budget limits (total concurrent cost tracked)

## Key Components

1. **WaveScheduler** — analyzes task dependency graph within a slice, groups independent tasks into waves, executes each wave in parallel (Promise.all), sequential between waves.
2. **HeadlessMode** — `stupid headless auto` for CI/CD. No interactive prompts, JSON output, exponential backoff on transient failures, exit code reflects success/failure.
3. **QuickMode** — `stupid quick "fix typo"` skips research/architect/spec, goes straight to single implementer task with budget profile. Atomic commit.

## Success Criteria

1. Independent tasks within a slice execute in parallel (measurable speedup)
2. `stupid headless auto` runs without TTY, outputs structured JSON, exits cleanly
3. `stupid quick "fix"` completes a small change in one shot with atomic commit
4. Budget enforcement works correctly with parallel task execution
5. All existing tests pass

## plan.md References

- §20: Headless Mode
- §24: Wave-Based Parallel Execution
