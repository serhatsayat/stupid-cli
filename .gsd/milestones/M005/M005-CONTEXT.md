# M005: Governance Hardening & Quality Gate

## Goal

Add safety rails for autonomous execution: quality gate blocks dangerous commits, budget pressure auto-downgrades models, steer/capture commands allow mid-flight user intervention, and Doctor gets full auto-fix capabilities.

## Constraints

- Quality gate must never block legitimate code — false positive rate < 1%
- Budget pressure is adaptive, not cliff-edge — graceful degradation
- Steer/capture work from a second terminal (file-based IPC via `.stupid/`)
- Doctor auto-fix only repairs state it can safely reconstruct

## Key Components

1. **QualityGate** — pre-commit checks: secrets detection (API keys, passwords, tokens), file size limits, AI slop patterns ("as an AI", TODO stubs), test coverage regression.
2. **Budget pressure routing** — as spend approaches soft limit, auto-downgrade model tier (opus→sonnet→haiku). At hard limit, stop.
3. **Enhanced LoopDetector** — 5-state classification: healthy → repetitive → stagnating → stuck → deadlocked. Auto-recovery actions per state.
4. **CaptureManager** — `stupid capture "thought"` writes to `.stupid/CAPTURES.md`, triaged between tasks.
5. **SteerManager** — `stupid steer "change direction"` writes directive, orchestrator reads at phase boundary.
6. **Doctor v2** — expand from 5 to 13+ checks, add auto-fix for stale locks, orphaned worktrees, corrupt state.

## Success Criteria

1. Quality gate catches test secrets, rejects oversized files, flags AI slop
2. Budget pressure downgrades model before hard stop triggers
3. `stupid capture` and `stupid steer` work from second terminal
4. Doctor auto-fixes stale locks and orphaned worktrees
5. All existing tests pass

## plan.md References

- §12: Governance (Layer 5)
- §19: Crash Recovery & Doctor System
- §22: Captures & Thought Triage
