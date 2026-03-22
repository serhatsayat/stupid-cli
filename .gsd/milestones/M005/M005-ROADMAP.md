# M005 Roadmap: Governance Hardening & Quality Gate

## Slices

- [ ] **S01: Quality gate with secrets/slop/size detection** `risk:medium` `depends:[]`
  Build `QualityGate` class with pluggable check pipeline: secrets scanner (regex for API key patterns, passwords, tokens in staged diff), file size enforcer (reject files > configurable limit), AI slop detector (flag "as an AI", placeholder TODOs, hardcoded mock data). Wire into `SliceRunner` post-task commit flow. Returns pass/fail with actionable messages. Unit tests with known-bad inputs.

- [ ] **S02: Budget pressure adaptive model routing** `risk:medium` `depends:[]`
  Extend `BudgetEnforcer` with `getRecommendedTier()` that returns model tier based on spend ratio: 0-60% → configured tier, 60-80% → max sonnet, 80-95% → haiku only, 95%+ → hard stop. Wire into `TaskRouter.selectModel()` as a ceiling override. Unit tests for tier transitions at each threshold.

- [ ] **S03: Capture and steer commands** `risk:low` `depends:[]`
  Build `CaptureManager` (append to `.stupid/CAPTURES.md`) and `SteerManager` (write/read `.stupid/STEER.md`). Add CLI commands: `stupid capture "thought"` and `stupid steer "directive"`. Wire steer reading into `Orchestrator.executePhase()` at phase boundaries — if steer file exists, re-plan. Wire capture triaging into `SliceRunner` between tasks. Unit + integration tests.

- [ ] **S04: Enhanced loop detector and Doctor v2** `risk:low` `depends:[]`
  Upgrade `LoopDetector` to 5-state classification (healthy/repetitive/stagnating/stuck/deadlocked) with configurable thresholds and auto-recovery suggestions. Expand `Doctor` from 5 to 13+ checks: add git status consistency, activity log integrity, memory DB foreign key consistency, config schema drift, orphaned temp files. Add `--fix` flag for auto-repair of safe issues (stale locks, orphaned worktrees). Unit tests for all new checks.
