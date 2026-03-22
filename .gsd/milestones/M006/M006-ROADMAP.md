# M006 Roadmap: Wave Scheduler & Headless Mode

## Slices

- [ ] **S01: Wave scheduler for parallel task execution** `risk:high` `depends:[]`
  Build `WaveScheduler` class that takes a slice's task list and dependency graph, groups independent tasks into execution waves, and runs each wave with `Promise.all`. Tasks within a wave share a budget pool — track concurrent cost. Wire into `SliceRunner.run()` as an alternative to sequential execution (controlled by config flag `governance.parallelExecution`). Integration tests with mock agents verifying correct wave grouping and parallel execution.

- [ ] **S02: Headless mode for CI/CD** `risk:medium` `depends:[]`
  Build `HeadlessRunner` that wraps `Orchestrator.run()` + `Orchestrator.auto()` for non-interactive environments. No TTY required, JSON-structured output to stdout, structured error output to stderr. Exponential backoff on transient API failures (reuse `RetryableSession`). CLI command: `stupid headless auto` and `stupid headless "task"`. Exit code 0 on success, 1 on failure, 2 on budget exceeded. Integration tests in non-TTY environment.

- [ ] **S03: Quick mode for atomic single-task fixes** `risk:low` `depends:[]`
  Build `QuickRunner` — bypasses full orchestrator pipeline. Takes task description, creates single implementer agent with budget profile, executes, commits atomically. CLI command: `stupid quick "fix typo in README"`. No plan approval prompt. Wire `WorktreeManager` in none mode (commit directly to current branch). Unit + integration tests.
