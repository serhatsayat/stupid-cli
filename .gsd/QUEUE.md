# Milestone Queue

<!-- Append-only. Milestones listed here are queued for future planning and execution.
     Each entry describes the scope and key deliverables.
     Auto-mode picks the next queued milestone when the current one completes. -->

---

## M003: Authentication & Interactive TUI

**Priority:** High — blocks usability for anyone without manual env var setup

**Scope:**
- First-run onboarding wizard (choose provider → OAuth browser login or API key paste)
- `AuthStorage` integration — persist credentials to `~/.stupid/auth.json`
- `ModelRegistry` integration — discover available models from auth'd providers
- Interactive TUI mode — `stupid` with no args opens chat-like session via Pi SDK `InteractiveMode`
- Session management — `SessionManager` for persist/resume conversations
- `/login` slash command inside TUI for re-authentication
- `ANTHROPIC_OAUTH_TOKEN` support in e2e test skip gate

**Key Dependencies:** `@mariozechner/pi-coding-agent` (AuthStorage, ModelRegistry, InteractiveMode, SessionManager, SettingsManager)

**Acceptance:** `stupid` with no args → onboarding if no auth → interactive TUI. `stupid "task"` still works as before.

**plan.md refs:** §14 (CLI Commands & UX), §16 (Authentication & Providers)

---

## M004: Context Engine (Compressor + Snapshot Builder)

**Priority:** Medium — optimization for token efficiency

**Scope:**
- Context compressor — tool output sandboxing, 315KB → 5.4KB reduction
- Snapshot builder — priority-tiered XML snapshots ≤2KB for context compaction
- Token profile integration — budget/balanced/quality control inline depth
- Session memory compression — tiered summarization within session

**Acceptance:** Orchestrator agents receive compressed context. Token usage drops measurably on budget profile.

**plan.md refs:** §11 (Context Engine), §17 (Model Routing & Token Profiles)

---

## M005: Governance Hardening & Quality Gate

**Priority:** Medium — safety rails for autonomous execution

**Scope:**
- Quality gate — secrets detection, file size limits, AI slop detection
- Budget pressure routing — downgrade models dynamically as budget consumed
- Loop detector enhancement — 5-state classification with auto-recovery
- Capture manager — `stupid capture "thought"` for fire-and-forget notes
- Steer command — `stupid steer "change direction"` mid-execution injection
- Doctor enhancement — full 13+ checks with auto-fix

**Acceptance:** Quality gate blocks commits with secrets. Budget pressure auto-downgrades model tier. Steer/capture commands work from second terminal.

**plan.md refs:** §12 (Governance), §19 (Crash Recovery & Doctor), §22 (Captures & Thought Triage)

---

## M006: Wave Scheduler & Headless Mode

**Priority:** Medium — parallelism and CI/CD support

**Scope:**
- Wave scheduler — parallel task execution within slices (dependency-aware DAG)
- Headless mode — `stupid headless auto` for CI/CD, non-interactive, exponential backoff
- Quick mode — `stupid quick "small fix"` single task without full planning ceremony

**Acceptance:** Independent tasks within a slice run in parallel. Headless mode works in CI without TTY. Quick mode completes a small fix in one shot.

**plan.md refs:** §20 (Headless Mode), §24 (Wave-Based Parallel Execution)

---

## M007: Reports, MCP Server & AGENTS.md

**Priority:** Low — visibility and integration features

**Scope:**
- HTML report generator — self-contained single-file reports with cost breakdown, timeline, agent outputs
- Terminal visualization — `stupid visualize` for progress dashboard
- MCP server exposure — run stupid as MCP server for other tools to consume
- AGENTS.md auto-generation — produce AGENTS.md from project memory and decisions

**Acceptance:** `stupid export --html` produces a readable report. `stupid --mode mcp` starts an MCP server. AGENTS.md reflects actual project patterns.

**plan.md refs:** §25 (HTML Reports), §26 (MCP Server), §27 (AGENTS.md)

---

## M008: Launch & Distribution

**Priority:** Low — final polish before public launch

**Scope:**
- Pi extension package — register stupid as slash commands inside Pi TUI
- README with demo GIF
- Documentation site (docs/)
- GitHub Actions CI/CD — ci.yml + release.yml for auto-publish on version tag
- Dogfooding — run stupid on itself
- npm publish automation

**Acceptance:** `npm install -g stupid-cli` works end-to-end. CI passes. README has working demo. Pi extension installable.

**plan.md refs:** §7 (Pi Extension), §29 (Distribution & Publishing), §30 (Roadmap)
