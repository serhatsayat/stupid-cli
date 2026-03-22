# Stupid — Complete Project Blueprint

> **"Define. Approve. Sleep. Ship."**
>
> Autonomous multi-agent coding orchestrator with persistent memory, context engineering, and cost governance.
> Built on Pi SDK. Agent-agnostic. Privacy-first.

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Core Principles](#2-core-principles)
3. [Architecture Overview](#3-architecture-overview)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Package: @stupid/core](#5-package-stupidcore)
6. [Package: stupid (CLI)](#6-package-stupid-cli)
7. [Package: @stupid/pi-extension](#7-package-stupidpi-extension)
8. [Layer 1: Orchestrator (Lead Agent)](#8-layer-1-orchestrator-lead-agent)
9. [Layer 2: Agent Team (Sub-agents)](#9-layer-2-agent-team-sub-agents)
10. [Layer 3: Memory Engine](#10-layer-3-memory-engine)
11. [Layer 4: Context Engine](#11-layer-4-context-engine)
12. [Layer 5: Governance](#12-layer-5-governance)
13. [Workflow State Machine](#13-workflow-state-machine)
14. [CLI Commands & UX](#14-cli-commands--ux)
15. [Configuration System](#15-configuration-system)
16. [Authentication & Providers](#16-authentication--providers)
17. [Model Routing & Token Profiles](#17-model-routing--token-profiles)
18. [Git Strategy & Worktree Isolation](#18-git-strategy--worktree-isolation)
19. [Crash Recovery & Doctor System](#19-crash-recovery--doctor-system)
20. [Headless Mode](#20-headless-mode)
21. [Activity Logging & JSONL](#21-activity-logging--jsonl)
22. [Captures & Thought Triage](#22-captures--thought-triage)
23. [Provider Error Handling & Retry](#23-provider-error-handling--retry)
24. [Wave-Based Parallel Execution](#24-wave-based-parallel-execution)
25. [HTML Reports & Visualization](#25-html-reports--visualization)
26. [MCP Server Exposure](#26-mcp-server-exposure)
27. [AGENTS.md Auto-Generation](#27-agentsmd-auto-generation)
28. [Testing Strategy](#28-testing-strategy)
29. [Distribution & Publishing](#29-distribution--publishing)
30. [Roadmap & Milestones](#30-roadmap--milestones)
31. [File-by-File Implementation Guide](#31-file-by-file-implementation-guide)

---

## 1. Project Vision

Stupid is a CLI tool and Pi SDK extension that transforms a single user prompt into a fully completed, tested, and committed feature — autonomously.

The user describes what they want. Stupid asks every clarifying question upfront. Once the user approves the plan, they can walk away ("enter to sleep"). A lead agent orchestrates a team of specialized sub-agents — researcher, architect, tester, implementer, reviewer — each running in a fresh context window. When done, tests are passing and a PR is ready.

### What Makes Stupid Different

| Capability | GSD-2 | Superpowers | OpenSpec | Agent Teams Lite | Squad | Stupid |
|---|---|---|---|---|---|---|
| Lead agent never writes code | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Cross-session persistent memory | ✗ | ✗ | ✗ | ✗ | Partial | ✓ |
| Context compression (~98%) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Test-first mandatory | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Failed agent gets replaced | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Cost tracking + budget cap | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Loop detection + auto-recovery | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Multi-provider (20+ LLM) | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ |
| Smart model routing per task | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Token profiles (budget/balanced/quality) | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Budget-pressure adaptive routing | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Git worktree isolation | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Headless mode (CI/CD) | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Crash recovery + doctor | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Mid-execution steering | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Wave-based parallel tasks | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Spec as executable contract | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ |
| Atomic commits per task | ✓ | ✗ | ✓ | ✗ | ✗ | ✓ |
| AGENTS.md auto-generation | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Activity logging (JSONL) | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| HTML reports & visualization | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| MCP server exposure | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Quick mode (no full planning) | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Captures & thought triage | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Provider error retry strategies | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Agent-agnostic | ✗ | Partial | ✓ | ✓ | ✗ | ✓ |
| Enter-to-sleep autonomous | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| End-to-end with E2E tests | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

---

## 2. Core Principles

### P1: The Orchestrator Never Touches Code

The lead agent (orchestrator) has exactly one job: coordinate. It reads plans, dispatches tasks to sub-agents, collects results, makes routing decisions. It never runs `read`, `edit`, `write`, or `bash` on project files. This keeps its context window clean — max 15% utilization — leaving 85% for decision-making.

### P2: Every Sub-agent Gets a Fresh Context Window

No sub-agent inherits the orchestrator's context pollution. Each one is spawned with only: (a) the task specification, (b) relevant file paths pre-selected by the orchestrator, and (c) relevant memory records from the project memory database. This is how we defeat context rot.

### P3: Test-First Is Not Optional

The Tester agent writes tests BEFORE the Implementer writes code. If the Implementer produces code that doesn't pass the Tester's tests, it fails. The Orchestrator may retry with a different model, a different strategy, or smaller task decomposition — but never skips tests.

### P4: A Failing Agent Gets Replaced, Not Retried

Inspired by Squad's protocol: if a Reviewer rejects code, the same Implementer does NOT get another chance with the same context. The Orchestrator either assigns a different model, decomposes the task further, or escalates to the Architect. This breaks the infinite retry loop that plagues all current tools.

### P5: Memory Survives Across Sessions

Every completed task generates a "decision record" stored in a local SQLite database. Three weeks later, when the user asks for a similar feature, the orchestrator retrieves those decisions and injects them into the new sub-agents' context. The agent remembers what worked, what failed, and what patterns were established.

### P6: Privacy-First, Zero Cloud

All data stays local. SQLite database in the project directory. No telemetry, no cloud sync, no API calls except to the LLM provider the user chose. The user owns their data.

### P7: Cost Is a First-Class Citizen

Every token sent and received is tracked. Every sub-agent's cost is logged. Budget caps (soft warning + hard stop) are enforced. The user sees exactly what each slice costs before it runs, and gets a full cost report at the end.

### P8: Disk-First, Crash-Proof

All state lives on disk — not in memory. `.stupid/STATE.md`, `state.json`, `auto.lock`, activity logs, metrics. If the process crashes, the next `stupid auto` detects the lock file, reads the last known state, and resumes exactly where it left off. Two terminals can coordinate through the same `.stupid/` directory. No in-memory singletons, no lost progress.

### P9: Every Task = One Atomic Commit

Each completed task produces exactly one git commit. This enables `git bisect` for debugging, clean task-level revertability, and builds a self-documenting git history that future sessions can reference. The commit message includes the task ID, slice ID, and a summary extracted from the agent's work.

### P10: Token Profiles Control Everything

Three profiles — **budget**, **balanced**, **quality** — control model selection, context inline depth, phase execution, and compression aggressiveness. Budget profile saves 40-60% tokens by using cheap models and minimal inline. Quality profile uses full models and complete context. The profile is a single config knob that cascades through every layer.

### P11: The Agent Can Steer Mid-Flight

Even in autonomous mode, the user can inject `stupid steer "change direction"` from another terminal. The orchestrator picks up the steer file on the next phase boundary and re-plans accordingly. `stupid capture "thought"` records fire-and-forget notes that get triaged between tasks.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Stupid CLI                           │
│                   stupid "add feature X"                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 1: ORCHESTRATOR                         │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Task Planner │  │ Task Router  │  │ Result Aggregator  │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                 │
│  Rules:                                                         │
│  - NEVER reads/writes project files                             │
│  - Uses max 15% of context budget                               │
│  - Delegates ALL work to sub-agents                             │
│  - Replaces failing agents, never retries same one              │
│  - Reads STATE.md to track progress                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ spawn / fork
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 2: AGENT TEAM                           │
│                                                                 │
│  ┌──────────┐ ┌──────┐ ┌───────────┐ ┌────────┐ ┌───────────┐│
│  │ Research  │ │ Spec │ │ Architect │ │ Tester │ │Implementer││
│  └──────────┘ └──────┘ └───────────┘ └────────┘ └───────────┘│
│  ┌──────────┐ ┌───────────┐                                    │
│  │ Reviewer  │ │ Finalizer │                                    │
│  └──────────┘ └───────────┘                                    │
│                                                                 │
│  Rules:                                                         │
│  - Each runs in FRESH context window (spawn mode)               │
│  - Receives only: task spec + relevant files + memory records   │
│  - Returns only: structured result summary (≤500 tokens)        │
│  - Never communicates directly with other sub-agents            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ events
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 3: MEMORY ENGINE                        │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Session Memory   │  │ Project Memory   │  │ Decision       │ │
│  │ (in-session      │  │ (cross-session   │  │ Extractor      │ │
│  │  compression)    │  │  SQLite+FTS5)    │  │                │ │
│  └─────────────────┘  └──────────────────┘  └───────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │ events
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 4: CONTEXT ENGINE                       │
│                                                                 │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────┐ │
│  │ Compressor   │  │ File Selector │  │ Snapshot Builder    │ │
│  │ (tool output │  │ (relevant     │  │ (priority-tiered    │ │
│  │  sandboxing) │  │  files only)  │  │  XML ≤2KB)          │ │
│  └──────────────┘  └───────────────┘  └─────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │ events
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 5: GOVERNANCE                           │
│                                                                 │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Loop Detector │  │ Cost Tracker │  │ Budget Enforcer     │ │
│  └───────────────┘  └──────────────┘  └─────────────────────┘ │
│  ┌───────────────┐  ┌──────────────┐                           │
│  │ Quality Gate  │  │Provider Retry│                           │
│  └───────────────┘  └──────────────┘                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 6: INFRASTRUCTURE                       │
│                                                                 │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Crash Recovery│  │Activity Log  │  │ Git Worktree        │ │
│  │ + Doctor      │  │(JSONL)       │  │ Isolation            │ │
│  └───────────────┘  └──────────────┘  └─────────────────────┘ │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Headless Mode │  │ MCP Server   │  │ Wave Scheduler      │ │
│  └───────────────┘  └──────────────┘  └─────────────────────┘ │
│  ┌───────────────┐  ┌──────────────┐                           │
│  │ Token Profiles│  │ HTML Reports │                           │
│  └───────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Monorepo Structure

```
stupid/
├── package.json                     # Workspace root (turborepo)
├── turbo.json                       # Turborepo config
├── tsconfig.base.json               # Shared TS config
├── LICENSE                          # MIT
├── README.md
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Lint + test + build
│       └── release.yml              # npm publish on tag
│
├── packages/
│   ├── core/                        # @stupid/core — shared logic
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts             # Public API exports
│   │       ├── orchestrator/        # Layer 1
│   │       ├── agents/              # Layer 2
│   │       ├── memory/              # Layer 3
│   │       ├── context/             # Layer 4
│   │       ├── governance/          # Layer 5
│   │       ├── infrastructure/     # Layer 6 (crash, headless, worktree, etc.)
│   │       ├── workflow/            # State machine + runners
│   │       ├── config/              # Configuration system
│   │       └── types/               # Shared TypeScript interfaces
│   │
│   ├── cli/                         # stupid — standalone CLI
│   │   ├── package.json             # bin: { "stupid": "./dist/cli.js" }
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── cli.ts               # Entry point (#!/usr/bin/env node)
│   │       ├── commands/            # CLI command handlers
│   │       │   ├── run.ts           # stupid "task"
│   │       │   ├── auto.ts          # stupid auto
│   │       │   ├── plan.ts          # stupid plan "task"
│   │       │   ├── recall.ts        # stupid recall "query"
│   │       │   ├── status.ts        # stupid status
│   │       │   ├── cost.ts          # stupid cost
│   │       │   ├── prefs.ts         # stupid prefs
│   │       │   ├── init.ts          # stupid init
│   │       │   ├── resume.ts        # stupid resume
│   │       │   ├── steer.ts         # stupid steer "new direction"
│   │       │   ├── quick.ts         # stupid quick "small fix"
│   │       │   ├── doctor.ts        # stupid doctor
│   │       │   ├── capture.ts       # stupid capture "thought"
│   │       │   ├── headless.ts      # stupid headless auto
│   │       │   ├── visualize.ts     # stupid visualize
│   │       │   └── export.ts        # stupid export --html
│   │       ├── ui/                  # Terminal UI (Pi TUI or ink)
│   │       └── updater.ts           # Auto-update check
│   │
│   └── pi-extension/                # @stupid/pi-extension
│       ├── package.json             # keywords: ["pi-package"]
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts             # Pi extension entry (default export)
│           ├── commands.ts          # /stupid slash commands
│           └── hooks.ts             # Pi lifecycle event handlers
│
├── skills/                          # Pi skills (markdown-based)
│   ├── stupid-run/
│   │   └── SKILL.md
│   ├── stupid-auto/
│   │   └── SKILL.md
│   └── stupid-recall/
│       └── SKILL.md
│
├── prompts/                         # Agent prompt templates
│   ├── orchestrator.md
│   ├── research.md
│   ├── spec.md
│   ├── architect.md
│   ├── tester.md
│   ├── implementer.md
│   ├── reviewer.md
│   └── finalizer.md
│
├── tests/
│   ├── unit/                        # Vitest unit tests
│   ├── integration/                 # Integration tests
│   └── fixtures/                    # Test fixtures (mock sessions)
│
└── docs/
    ├── getting-started.md
    ├── architecture.md
    ├── configuration.md
    ├── agents.md
    ├── memory.md
    ├── governance.md
    └── contributing.md
```

### Root package.json

```json
{
  "name": "stupid-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.5.0",
    "tsup": "^8.4.0"
  }
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

---

## 5. Package: @stupid/core

This is the heart of Stupid. All business logic lives here. Both the CLI and the Pi extension import from this package.

### packages/core/package.json

```json
{
  "name": "@stupid/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@mariozechner/pi-coding-agent": "latest",
    "@mariozechner/pi-ai": "latest",
    "@mariozechner/pi-agent-core": "latest",
    "better-sqlite3": "^11.8.0",
    "zod": "^3.24.0",
    "yaml": "^2.7.0",
    "chalk": "^5.4.0",
    "ora": "^8.2.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "tsup": "^8.4.0",
    "typescript": "^5.7.0"
  }
}
```

### packages/core/src/index.ts — Public API

```typescript
// =============================================================================
// @stupid/core — Public API
// =============================================================================

// Types
export type {
  StupidConfig,
  AgentRole,
  AgentResult,
  TaskSpec,
  SliceSpec,
  MilestoneSpec,
  PlanSpec,
  SessionState,
  ProjectMemoryRecord,
  DecisionRecord,
  CostEntry,
  LoopState,
  GovernanceReport,
  SubAgentSpawnOptions,
} from "./types/index.js";

// Orchestrator
export { Orchestrator } from "./orchestrator/orchestrator.js";
export { TaskPlanner } from "./orchestrator/task-planner.js";
export { TaskRouter } from "./orchestrator/task-router.js";
export { ResultAggregator } from "./orchestrator/result-aggregator.js";

// Agents
export { AgentFactory } from "./agents/agent-factory.js";
export { ResearchAgent } from "./agents/research.js";
export { SpecAgent } from "./agents/spec.js";
export { ArchitectAgent } from "./agents/architect.js";
export { TesterAgent } from "./agents/tester.js";
export { ImplementerAgent } from "./agents/implementer.js";
export { ReviewerAgent } from "./agents/reviewer.js";
export { FinalizerAgent } from "./agents/finalizer.js";

// Memory
export { SessionMemory } from "./memory/session-memory.js";
export { ProjectMemory } from "./memory/project-memory.js";
export { DecisionExtractor } from "./memory/decision-extractor.js";
export { MemoryInjector } from "./memory/memory-injector.js";

// Context
export { ContextCompressor } from "./context/compressor.js";
export { FileSelector } from "./context/file-selector.js";
export { SnapshotBuilder } from "./context/snapshot-builder.js";

// Governance
export { LoopDetector } from "./governance/loop-detector.js";
export { CostTracker } from "./governance/cost-tracker.js";
export { BudgetEnforcer } from "./governance/budget-enforcer.js";
export { QualityGate } from "./governance/quality-gate.js";

// Workflow
export { StateMachine } from "./workflow/state-machine.js";
export { SliceRunner } from "./workflow/slice-runner.js";
export { TestRunner } from "./workflow/test-runner.js";
export { PRBuilder } from "./workflow/pr-builder.js";

// Config
export { loadConfig, DEFAULT_CONFIG } from "./config/config.js";
```

---

## 6. Package: stupid (CLI)

The standalone CLI binary. Users install globally with `npm install -g stupid` and run `stupid` from any project directory.

### packages/cli/package.json

```json
{
  "name": "stupid",
  "version": "0.1.0",
  "description": "Autonomous multi-agent coding orchestrator. Define. Approve. Sleep. Ship.",
  "type": "module",
  "bin": {
    "stupid": "./dist/cli.js"
  },
  "main": "dist/cli.js",
  "scripts": {
    "build": "tsup src/cli.ts --format esm --banner.js '#!/usr/bin/env node'",
    "dev": "tsup src/cli.ts --format esm --watch",
    "test": "vitest run",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@stupid/core": "workspace:*",
    "@mariozechner/pi-coding-agent": "latest",
    "@mariozechner/pi-ai": "latest",
    "@mariozechner/pi-tui": "latest",
    "commander": "^13.1.0",
    "inquirer": "^12.3.0",
    "chalk": "^5.4.0",
    "ora": "^8.2.0",
    "boxen": "^8.0.0",
    "update-notifier": "^7.3.0"
  },
  "keywords": [
    "ai",
    "agent",
    "coding",
    "autonomous",
    "multi-agent",
    "cli",
    "stupid",
    "pi-package"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/stupid-ai/stupid"
  },
  "license": "MIT"
}
```

### packages/cli/src/cli.ts — Entry Point

```typescript
#!/usr/bin/env node

// =============================================================================
// Stupid CLI — Entry Point
// =============================================================================

import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, Orchestrator } from "@stupid/core";
import { runCommand } from "./commands/run.js";
import { autoCommand } from "./commands/auto.js";
import { planCommand } from "./commands/plan.js";
import { recallCommand } from "./commands/recall.js";
import { statusCommand } from "./commands/status.js";
import { costCommand } from "./commands/cost.js";
import { prefsCommand } from "./commands/prefs.js";
import { initCommand } from "./commands/init.js";
import { resumeCommand } from "./commands/resume.js";
import { checkForUpdates } from "./updater.js";

const program = new Command();

program
  .name("stupid")
  .description("Autonomous multi-agent coding orchestrator")
  .version("0.1.0")
  .option("--provider <provider>", "LLM provider (anthropic, openai, google, copilot, openrouter)")
  .option("--model <model>", "Override default model")
  .option("--budget <amount>", "Max budget in USD for this session", parseFloat)
  .option("--dry-run", "Show plan without executing")
  .option("--verbose", "Show detailed agent activity")
  .option("--no-memory", "Disable project memory injection")
  .option("--config <path>", "Path to config file");

// Default command: stupid "task description"
program
  .argument("[task]", "Task description in natural language")
  .action(async (task, options) => {
    await checkForUpdates();
    if (task) {
      await runCommand(task, options);
    } else {
      // No argument — show interactive mode
      program.help();
    }
  });

// stupid auto — autonomous mode (enter to sleep)
program
  .command("auto")
  .description("Resume or start autonomous execution (enter to sleep)")
  .action(async (options) => {
    await autoCommand(options);
  });

// stupid plan "task" — only create plan, don't execute
program
  .command("plan <task>")
  .description("Create execution plan without running it")
  .action(async (task, options) => {
    await planCommand(task, options);
  });

// stupid recall "query" — search project memory
program
  .command("recall <query>")
  .description("Search project memory for past decisions and patterns")
  .action(async (query, options) => {
    await recallCommand(query, options);
  });

// stupid status — show current state
program
  .command("status")
  .description("Show current session status and progress")
  .action(async () => {
    await statusCommand();
  });

// stupid cost — show cost report
program
  .command("cost")
  .description("Show cost report for current/past sessions")
  .option("--session <id>", "Show cost for specific session")
  .option("--all", "Show cost for all sessions")
  .action(async (options) => {
    await costCommand(options);
  });

// stupid prefs — configure model routing and preferences
program
  .command("prefs")
  .description("Configure model routing and preferences")
  .action(async () => {
    await prefsCommand();
  });

// stupid init — initialize Stupid in current project
program
  .command("init")
  .description("Initialize Stupid in the current project")
  .action(async () => {
    await initCommand();
  });

// stupid resume — resume interrupted session
program
  .command("resume")
  .description("Resume the last interrupted session")
  .option("--session <id>", "Resume specific session")
  .action(async (options) => {
    await resumeCommand(options);
  });

program.parse();
```

---

## 7. Package: @stupid/pi-extension

For users who already have Pi installed. Registers Stupid as slash commands inside Pi's TUI.

### packages/pi-extension/package.json

```json
{
  "name": "@stupid/pi-extension",
  "version": "0.1.0",
  "description": "Stupid extension for Pi coding agent",
  "type": "module",
  "main": "dist/index.js",
  "keywords": ["pi-package"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@stupid/core": "workspace:*"
  },
  "license": "MIT"
}
```

### packages/pi-extension/src/index.ts

```typescript
// =============================================================================
// Stupid Pi Extension — Entry Point
// =============================================================================
//
// Pi extensions export a default function that receives the ExtensionAPI.
// This function is called once when the extension is loaded.
// We hook into Pi's lifecycle events and register our commands.
//
// Installation: pi install @stupid/pi-extension
// Usage inside Pi: /stupid "add feature X"
//                  /stupid-auto
//                  /stupid-recall "how does auth work?"

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
  Orchestrator,
  SessionMemory,
  CostTracker,
  LoopDetector,
  ContextCompressor,
  loadConfig,
} from "@stupid/core";

export default function stupid(pi: ExtensionAPI): void {
  const config = loadConfig();
  const costTracker = new CostTracker(config);
  const loopDetector = new LoopDetector(config);
  const compressor = new ContextCompressor(config);
  const sessionMemory = new SessionMemory(config);

  // ─── Lifecycle Hooks ───────────────────────────────────────────────

  // Track session start for memory initialization
  pi.on("session_start", async (ctx: ExtensionContext) => {
    await sessionMemory.initialize(ctx.sessionId);
  });

  // Compress tool outputs before they fill the context window
  pi.on("tool_result", async (ctx: ExtensionContext) => {
    const compressed = compressor.compress(ctx.toolResult);
    ctx.toolResult = compressed;
  });

  // Track costs on every provider request
  pi.on("before_provider_request", async (ctx: ExtensionContext) => {
    costTracker.trackRequest(ctx);
  });

  // Detect loops on every tool call
  pi.on("tool_call", async (ctx: ExtensionContext) => {
    const loopState = loopDetector.check(ctx);
    if (loopState === "stuck") {
      ctx.abort("Stupid: Loop detected. Stopping agent.");
    }
  });

  // Build snapshot before compaction
  pi.on("before_compact", async (ctx: ExtensionContext) => {
    await sessionMemory.saveSnapshot(ctx);
  });

  // ─── Commands ──────────────────────────────────────────────────────

  pi.registerCommand("stupid", async (args: string) => {
    const orchestrator = new Orchestrator(config, pi);
    await orchestrator.run(args);
  });

  pi.registerCommand("stupid-auto", async () => {
    const orchestrator = new Orchestrator(config, pi);
    await orchestrator.auto();
  });

  pi.registerCommand("stupid-recall", async (query: string) => {
    const { ProjectMemory } = await import("@stupid/core");
    const memory = new ProjectMemory(config);
    const results = await memory.search(query);
    return results;
  });

  pi.registerCommand("stupid-status", async () => {
    const { StateMachine } = await import("@stupid/core");
    const state = new StateMachine(config);
    return state.getStatus();
  });

  pi.registerCommand("stupid-cost", async () => {
    return costTracker.getReport();
  });
}
```

---

## 8. Layer 1: Orchestrator (Lead Agent)

The orchestrator is the brain. It coordinates all other agents but never writes code itself.

### packages/core/src/orchestrator/orchestrator.ts

```typescript
// =============================================================================
// Orchestrator — The Lead Agent
// =============================================================================
//
// Responsibilities:
// 1. Receive user task and ask clarifying questions
// 2. Dispatch Research agent to analyze codebase
// 3. Dispatch Spec agent to create technical specification
// 4. Dispatch Architect agent to design solution
// 5. Create execution plan (milestones → slices → tasks)
// 6. Execute plan: for each slice, run task sequence
// 7. Handle failures: replace agent, decompose task, or escalate
// 8. Collect results and build final summary
//
// CRITICAL RULES:
// - The orchestrator NEVER calls read, write, edit, bash on project files
// - It only communicates via structured messages to sub-agents
// - It uses max 15% of context budget
// - When a sub-agent fails, it NEVER retries with the same agent+context

import { createAgentSession } from "@mariozechner/pi-coding-agent";
import type {
  StupidConfig,
  PlanSpec,
  SliceSpec,
  TaskSpec,
  AgentResult,
  SessionState,
} from "../types/index.js";
import { TaskPlanner } from "./task-planner.js";
import { TaskRouter } from "./task-router.js";
import { ResultAggregator } from "./result-aggregator.js";
import { AgentFactory } from "../agents/agent-factory.js";
import { StateMachine } from "../workflow/state-machine.js";
import { SliceRunner } from "../workflow/slice-runner.js";
import { ProjectMemory } from "../memory/project-memory.js";
import { CostTracker } from "../governance/cost-tracker.js";
import { LoopDetector } from "../governance/loop-detector.js";
import { BudgetEnforcer } from "../governance/budget-enforcer.js";

export class Orchestrator {
  private config: StupidConfig;
  private planner: TaskPlanner;
  private router: TaskRouter;
  private aggregator: ResultAggregator;
  private agentFactory: AgentFactory;
  private stateMachine: StateMachine;
  private sliceRunner: SliceRunner;
  private memory: ProjectMemory;
  private costTracker: CostTracker;
  private loopDetector: LoopDetector;
  private budgetEnforcer: BudgetEnforcer;

  constructor(config: StupidConfig, piContext?: any) {
    this.config = config;
    this.planner = new TaskPlanner(config);
    this.router = new TaskRouter(config);
    this.aggregator = new ResultAggregator();
    this.agentFactory = new AgentFactory(config, piContext);
    this.stateMachine = new StateMachine(config);
    this.sliceRunner = new SliceRunner(config, this.agentFactory);
    this.memory = new ProjectMemory(config);
    this.costTracker = new CostTracker(config);
    this.loopDetector = new LoopDetector(config);
    this.budgetEnforcer = new BudgetEnforcer(config);
  }

  // ─── Main Entry: Interactive Mode ────────────────────────────────

  async run(taskDescription: string): Promise<void> {
    // Phase 1: Research
    const researchResult = await this.executePhase("research", taskDescription);

    // Phase 2: Ask clarifying questions (if any)
    const clarifications = await this.askClarifications(researchResult);

    // Phase 3: Create spec
    const specResult = await this.executePhase("spec", {
      task: taskDescription,
      research: researchResult,
      clarifications,
    });

    // Phase 4: Architecture design
    const architectResult = await this.executePhase("architect", {
      spec: specResult,
      research: researchResult,
    });

    // Phase 5: Create plan
    const plan = await this.planner.createPlan({
      task: taskDescription,
      spec: specResult,
      architecture: architectResult,
      research: researchResult,
    });

    // Phase 6: Show plan and get approval
    const approved = await this.presentPlan(plan);
    if (!approved) {
      console.log("Plan rejected. Exiting.");
      return;
    }

    // Phase 7: Save state and execute
    await this.stateMachine.savePlan(plan);
    await this.executeAllSlices(plan);
  }

  // ─── Auto Mode: Enter to Sleep ───────────────────────────────────

  async auto(): Promise<void> {
    // Resume from saved state
    const state = await this.stateMachine.loadState();

    if (!state || !state.plan) {
      console.log("No active plan found. Run 'stupid <task>' first.");
      return;
    }

    // Find first incomplete slice
    const pendingSlices = state.plan.slices.filter(
      (s) => s.status === "pending" || s.status === "in_progress"
    );

    if (pendingSlices.length === 0) {
      console.log("All slices complete!");
      return;
    }

    // Execute remaining slices
    for (const slice of pendingSlices) {
      await this.executeSlice(slice, state.plan);
    }

    // Final summary
    await this.buildFinalSummary(state.plan);
  }

  // ─── Phase Execution ─────────────────────────────────────────────

  private async executePhase(
    phase: string,
    input: any
  ): Promise<AgentResult> {
    // Get relevant memory for this phase
    const memoryRecords = await this.memory.getRelevantRecords(phase, input);

    // Select model for this phase
    const model = this.router.selectModel(phase);

    // Spawn sub-agent
    const agent = this.agentFactory.create(phase, {
      model,
      input,
      memoryRecords,
    });

    const result = await agent.execute();

    // Track cost
    this.costTracker.track(phase, result.tokensUsed, model);

    return result;
  }

  // ─── Slice Execution ─────────────────────────────────────────────

  private async executeAllSlices(plan: PlanSpec): Promise<void> {
    for (let i = 0; i < plan.slices.length; i++) {
      const slice = plan.slices[i];

      // Check budget before each slice
      const budgetCheck = this.budgetEnforcer.check();
      if (budgetCheck === "hard_stop") {
        console.log(`Budget exceeded. Stopping at slice ${i + 1}/${plan.slices.length}`);
        break;
      }
      if (budgetCheck === "soft_warning") {
        console.log(`Warning: Approaching budget limit.`);
      }

      await this.executeSlice(slice, plan);
    }
  }

  private async executeSlice(slice: SliceSpec, plan: PlanSpec): Promise<void> {
    // Update state
    await this.stateMachine.updateSlice(slice.id, "in_progress");

    try {
      // Run all tasks in this slice via SliceRunner
      const result = await this.sliceRunner.run(slice, {
        plan,
        memory: this.memory,
        costTracker: this.costTracker,
        loopDetector: this.loopDetector,
        budgetEnforcer: this.budgetEnforcer,
      });

      if (result.success) {
        await this.stateMachine.updateSlice(slice.id, "completed");
        // Extract decisions and save to memory
        await this.memory.saveDecisionRecord(slice, result);
      } else {
        await this.handleSliceFailure(slice, result, plan);
      }
    } catch (error) {
      await this.stateMachine.updateSlice(slice.id, "failed");
      throw error;
    }
  }

  // ─── Failure Handling ────────────────────────────────────────────

  private async handleSliceFailure(
    slice: SliceSpec,
    result: AgentResult,
    plan: PlanSpec
  ): Promise<void> {
    const strategy = this.determineRecoveryStrategy(slice, result);

    switch (strategy) {
      case "different_model":
        // Retry with a different, more powerful model
        slice.modelOverride = this.router.getEscalationModel(slice.model);
        await this.executeSlice(slice, plan);
        break;

      case "decompose":
        // Split the slice into smaller tasks
        const subSlices = await this.planner.decomposeSlice(slice);
        for (const sub of subSlices) {
          await this.executeSlice(sub, plan);
        }
        break;

      case "rearchitect":
        // Send back to architect for redesign
        const newArchitecture = await this.executePhase("architect", {
          failedSlice: slice,
          error: result.error,
          previousArchitecture: plan.architecture,
        });
        slice.architecture = newArchitecture;
        await this.executeSlice(slice, plan);
        break;

      case "escalate":
        // Cannot recover — ask human
        await this.stateMachine.updateSlice(slice.id, "needs_human");
        console.log(`Slice "${slice.name}" needs human intervention.`);
        console.log(`Error: ${result.error}`);
        break;
    }
  }

  private determineRecoveryStrategy(
    slice: SliceSpec,
    result: AgentResult
  ): "different_model" | "decompose" | "rearchitect" | "escalate" {
    // If the agent was stuck in a loop, try a different model
    if (result.failureReason === "loop_detected") {
      return "different_model";
    }

    // If tests fail consistently, task might be too complex
    if (result.failureReason === "tests_failing" && slice.retryCount < 2) {
      return "decompose";
    }

    // If architecture mismatch, rearchitect
    if (result.failureReason === "architecture_mismatch") {
      return "rearchitect";
    }

    // If already retried, escalate to human
    if (slice.retryCount >= 2) {
      return "escalate";
    }

    // Default: try different model first
    return "different_model";
  }

  // ─── User Interaction ────────────────────────────────────────────

  private async askClarifications(researchResult: AgentResult): Promise<Record<string, string>> {
    // The research agent returns a list of questions it couldn't answer
    // from the codebase alone. These are presented to the user.
    const questions = researchResult.data?.clarificationQuestions || [];

    if (questions.length === 0) {
      return {};
    }

    // In CLI mode, use inquirer to ask questions
    // In Pi extension mode, return questions for the user to answer
    const answers: Record<string, string> = {};

    for (const q of questions) {
      // This will be replaced with actual CLI input in the cli package
      answers[q.key] = await this.promptUser(q.question, q.options);
    }

    return answers;
  }

  private async presentPlan(plan: PlanSpec): Promise<boolean> {
    // Show plan summary to user
    // Return true if approved, false if rejected
    // In auto mode, this is skipped (pre-approved)
    console.log("\n📋 Execution Plan:");
    console.log(`   ${plan.slices.length} slices, ~${plan.estimatedTasks} tasks`);
    console.log(`   ⏱️  ~${plan.estimatedMinutes} min  |  💰 ~$${plan.estimatedCost}`);
    console.log(`   🧪 ~${plan.estimatedTests} tests\n`);

    for (const slice of plan.slices) {
      console.log(`   Slice ${slice.order}: ${slice.name} (${slice.tasks.length} tasks)`);
    }

    // Return approval (will be replaced with actual prompt)
    return await this.promptApproval();
  }

  private async buildFinalSummary(plan: PlanSpec): Promise<void> {
    const costReport = this.costTracker.getReport();
    const completedSlices = plan.slices.filter((s) => s.status === "completed");
    const totalTests = plan.slices.reduce((sum, s) => sum + (s.testsPassing || 0), 0);

    console.log("\n🎉 Stupid completed!\n");
    console.log(`   ✅ ${completedSlices.length}/${plan.slices.length} slices`);
    console.log(`   🧪 ${totalTests} tests passing`);
    console.log(`   💰 $${costReport.totalCost.toFixed(2)}`);
    console.log(`   ⏱️  ${costReport.totalMinutes} min`);

    if (plan.prUrl) {
      console.log(`   🔗 ${plan.prUrl}`);
    }
  }

  // Placeholder methods — implemented in CLI/Pi extension packages
  private async promptUser(question: string, options?: string[]): Promise<string> {
    // Override in CLI package with inquirer
    return "";
  }

  private async promptApproval(): Promise<boolean> {
    // Override in CLI package with inquirer
    return true;
  }
}
```

### packages/core/src/orchestrator/task-planner.ts

```typescript
// =============================================================================
// Task Planner — Decomposes user task into milestones → slices → tasks
// =============================================================================
//
// Hierarchy:
//   Milestone = Shippable version (1 per stupid run, usually)
//   Slice     = Demonstrable vertical feature (1-7 tasks)
//   Task      = Atomic unit that fits in ONE context window
//
// Iron rule: if a task doesn't fit in one context window, split it into two.

import type {
  StupidConfig,
  PlanSpec,
  SliceSpec,
  TaskSpec,
  AgentResult,
} from "../types/index.js";

export class TaskPlanner {
  private config: StupidConfig;

  constructor(config: StupidConfig) {
    this.config = config;
  }

  // Create a full execution plan from research + spec + architecture
  async createPlan(input: {
    task: string;
    spec: AgentResult;
    architecture: AgentResult;
    research: AgentResult;
  }): Promise<PlanSpec> {
    // The planner creates a structured plan with:
    // 1. Milestone definition (what "done" looks like)
    // 2. Slices ordered by dependency (slice 2 may depend on slice 1)
    // 3. Tasks within each slice ordered by execution sequence
    // 4. Each task annotated with: required files, agent role, expected output

    const slices = this.decomposeIntoSlices(input);
    const estimatedCost = this.estimateCost(slices);
    const estimatedMinutes = this.estimateTime(slices);
    const estimatedTests = this.estimateTests(slices);

    return {
      id: this.generateId(),
      task: input.task,
      milestone: {
        description: input.spec.data?.milestone || input.task,
        successCriteria: input.spec.data?.successCriteria || [],
      },
      slices,
      architecture: input.architecture,
      estimatedTasks: slices.reduce((sum, s) => sum + s.tasks.length, 0),
      estimatedCost,
      estimatedMinutes,
      estimatedTests,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  // Break a failed slice into smaller sub-slices
  async decomposeSlice(slice: SliceSpec): Promise<SliceSpec[]> {
    // Each task in the original slice becomes its own mini-slice
    // This ensures finer granularity for retry
    return slice.tasks.map((task, index) => ({
      id: `${slice.id}-decomposed-${index}`,
      name: `${slice.name} (part ${index + 1})`,
      order: slice.order + index * 0.1,
      tasks: [task],
      dependencies: index > 0 ? [`${slice.id}-decomposed-${index - 1}`] : slice.dependencies,
      status: "pending" as const,
      retryCount: 0,
    }));
  }

  private decomposeIntoSlices(input: any): SliceSpec[] {
    // This method uses the architecture result to create slices
    // Each slice is a vertical feature that can be tested independently
    //
    // Example for "Add TikTok integration":
    // Slice 1: TikTok OAuth module (controller + service + entity)
    // Slice 2: Metric collection service (service + queue job)
    // Slice 3: Dashboard widget (frontend component + API hook)
    // Slice 4: E2E tests + documentation

    const architectureSlices = input.architecture.data?.slices || [];

    return architectureSlices.map((s: any, index: number) => ({
      id: this.generateId(),
      name: s.name,
      order: index + 1,
      tasks: this.createTasksForSlice(s),
      dependencies: s.dependencies || [],
      status: "pending" as const,
      retryCount: 0,
      model: undefined, // Use default from config
      modelOverride: undefined,
    }));
  }

  private createTasksForSlice(sliceData: any): TaskSpec[] {
    // Each task has a specific agent role and clear deliverable
    // Tasks follow the order: test → implement → review
    const tasks: TaskSpec[] = [];

    for (const taskData of sliceData.tasks || []) {
      // Test task comes first (test-first principle)
      if (taskData.needsTest !== false) {
        tasks.push({
          id: this.generateId(),
          name: `Write tests for: ${taskData.name}`,
          role: "tester",
          input: taskData,
          expectedOutput: "Test file(s) that define expected behavior",
          requiredFiles: taskData.testFiles || [],
          status: "pending",
        });
      }

      // Implementation task
      tasks.push({
        id: this.generateId(),
        name: taskData.name,
        role: "implementer",
        input: taskData,
        expectedOutput: taskData.expectedOutput || "Implementation code",
        requiredFiles: taskData.files || [],
        status: "pending",
      });

      // Review task
      tasks.push({
        id: this.generateId(),
        name: `Review: ${taskData.name}`,
        role: "reviewer",
        input: taskData,
        expectedOutput: "Code review with approval or rejection",
        requiredFiles: taskData.files || [],
        status: "pending",
      });
    }

    return tasks;
  }

  private estimateCost(slices: SliceSpec[]): number {
    // Rough estimation: ~$0.50-2.00 per task depending on model
    const totalTasks = slices.reduce((sum, s) => sum + s.tasks.length, 0);
    const avgCostPerTask = this.config.modelRouting?.defaultModel?.includes("opus") ? 2.0 : 0.75;
    return Math.round(totalTasks * avgCostPerTask * 100) / 100;
  }

  private estimateTime(slices: SliceSpec[]): number {
    // Rough estimation: ~2-5 min per task
    const totalTasks = slices.reduce((sum, s) => sum + s.tasks.length, 0);
    return Math.round(totalTasks * 3.5);
  }

  private estimateTests(slices: SliceSpec[]): number {
    // Rough estimation: ~3-8 tests per slice
    return slices.length * 5;
  }

  private generateId(): string {
    return `ns_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
```

### packages/core/src/orchestrator/task-router.ts

```typescript
// =============================================================================
// Task Router — Selects the right model for each phase/task
// =============================================================================
//
// Different phases need different models:
// - Research: fast + cheap (Gemini Flash, Haiku)
// - Planning: deep reasoning (Opus, o3)
// - Implementation: balanced (Sonnet, GPT-4o)
// - Review: thorough (Opus, o3)
// - Finalization: fast (Sonnet, GPT-4o-mini)

import type { StupidConfig, AgentRole } from "../types/index.js";

interface ModelSelection {
  provider: string;
  model: string;
}

// Default model routing table
const DEFAULT_ROUTING: Record<string, ModelSelection> = {
  research: { provider: "google", model: "gemini-2.5-flash" },
  spec: { provider: "anthropic", model: "claude-sonnet-4-6" },
  architect: { provider: "anthropic", model: "claude-opus-4-6" },
  tester: { provider: "anthropic", model: "claude-sonnet-4-6" },
  implementer: { provider: "anthropic", model: "claude-sonnet-4-6" },
  reviewer: { provider: "anthropic", model: "claude-opus-4-6" },
  finalizer: { provider: "anthropic", model: "claude-sonnet-4-6" },
};

// Escalation chain: when a model fails, try the next one
const ESCALATION_CHAIN: ModelSelection[] = [
  { provider: "anthropic", model: "claude-sonnet-4-6" },
  { provider: "anthropic", model: "claude-opus-4-6" },
  { provider: "openai", model: "o3" },
];

export class TaskRouter {
  private config: StupidConfig;
  private routing: Record<string, ModelSelection>;

  constructor(config: StupidConfig) {
    this.config = config;
    this.routing = { ...DEFAULT_ROUTING, ...config.modelRouting?.overrides };
  }

  // Select model for a phase/role
  selectModel(phase: string): ModelSelection {
    // Check if there's a user override for this phase
    if (this.config.modelRouting?.overrides?.[phase]) {
      return this.config.modelRouting.overrides[phase];
    }
    return this.routing[phase] || DEFAULT_ROUTING.implementer;
  }

  // Get next model in escalation chain
  getEscalationModel(currentModel?: string): ModelSelection {
    if (!currentModel) {
      return ESCALATION_CHAIN[1]; // Start with Opus
    }

    const currentIndex = ESCALATION_CHAIN.findIndex(
      (m) => m.model === currentModel
    );

    if (currentIndex < ESCALATION_CHAIN.length - 1) {
      return ESCALATION_CHAIN[currentIndex + 1];
    }

    // Already at the top of the chain
    return ESCALATION_CHAIN[ESCALATION_CHAIN.length - 1];
  }

  // Update routing for a specific phase
  setRouting(phase: string, model: ModelSelection): void {
    this.routing[phase] = model;
  }
}
```

### packages/core/src/orchestrator/result-aggregator.ts

```typescript
// =============================================================================
// Result Aggregator — Collects and synthesizes sub-agent results
// =============================================================================

import type { AgentResult, SliceSpec } from "../types/index.js";

export class ResultAggregator {
  // Merge multiple agent results into a single summary
  merge(results: AgentResult[]): AgentResult {
    const success = results.every((r) => r.success);
    const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
    const errors = results.filter((r) => !r.success).map((r) => r.error);
    const summaries = results.map((r) => r.summary).filter(Boolean);

    return {
      success,
      summary: summaries.join("\n"),
      tokensUsed: totalTokens,
      error: errors.length > 0 ? errors.join("; ") : undefined,
      data: {
        individualResults: results,
      },
    };
  }

  // Create a slice completion summary (for state file and memory)
  createSliceSummary(slice: SliceSpec, results: AgentResult[]): string {
    const merged = this.merge(results);
    const testResults = results.filter((r) => r.data?.role === "tester");
    const testCount = testResults.reduce(
      (sum, r) => sum + (r.data?.testCount || 0), 0
    );

    return [
      `## Slice: ${slice.name}`,
      `Status: ${merged.success ? "✅ Completed" : "❌ Failed"}`,
      `Tests: ${testCount} passing`,
      `Tokens: ${merged.tokensUsed}`,
      ``,
      `### Summary`,
      merged.summary,
      ``,
      merged.error ? `### Errors\n${merged.error}` : "",
    ].join("\n");
  }
}
```

---

## 9. Layer 2: Agent Team (Sub-agents)

Each sub-agent is a specialized worker. It receives a task specification, executes in a fresh context window, and returns a structured result.

### packages/core/src/agents/agent-factory.ts

```typescript
// =============================================================================
// Agent Factory — Creates sub-agents for each role
// =============================================================================
//
// Each sub-agent is spawned as a Pi sub-agent in "spawn" mode (fresh context).
// The factory builds the correct prompt, injects relevant files and memory,
// and configures the model based on the TaskRouter's selection.

import { createAgentSession } from "@mariozechner/pi-coding-agent";
import type {
  StupidConfig,
  AgentRole,
  AgentResult,
  SubAgentSpawnOptions,
  ProjectMemoryRecord,
} from "../types/index.js";
import { ResearchAgent } from "./research.js";
import { SpecAgent } from "./spec.js";
import { ArchitectAgent } from "./architect.js";
import { TesterAgent } from "./tester.js";
import { ImplementerAgent } from "./implementer.js";
import { ReviewerAgent } from "./reviewer.js";
import { FinalizerAgent } from "./finalizer.js";
import { loadPromptTemplate } from "./prompt-loader.js";

// Map of role → agent class
const AGENT_MAP: Record<string, any> = {
  research: ResearchAgent,
  spec: SpecAgent,
  architect: ArchitectAgent,
  tester: TesterAgent,
  implementer: ImplementerAgent,
  reviewer: ReviewerAgent,
  finalizer: FinalizerAgent,
};

export class AgentFactory {
  private config: StupidConfig;
  private piContext: any;

  constructor(config: StupidConfig, piContext?: any) {
    this.config = config;
    this.piContext = piContext;
  }

  create(role: AgentRole, options: SubAgentSpawnOptions): BaseAgent {
    const AgentClass = AGENT_MAP[role];
    if (!AgentClass) {
      throw new Error(`Unknown agent role: ${role}`);
    }

    // Load the prompt template for this role
    const promptTemplate = loadPromptTemplate(role);

    // Build the full prompt with injected context
    const fullPrompt = this.buildPrompt(promptTemplate, options);

    return new AgentClass({
      config: this.config,
      piContext: this.piContext,
      prompt: fullPrompt,
      model: options.model,
      input: options.input,
      memoryRecords: options.memoryRecords || [],
      role,
    });
  }

  private buildPrompt(
    template: string,
    options: SubAgentSpawnOptions
  ): string {
    // Replace template variables with actual values
    let prompt = template;

    // Inject task specification
    prompt = prompt.replace("{{TASK}}", JSON.stringify(options.input, null, 2));

    // Inject relevant memory records
    if (options.memoryRecords && options.memoryRecords.length > 0) {
      const memorySection = options.memoryRecords
        .map((r) => `- [${r.date}] ${r.summary}`)
        .join("\n");
      prompt = prompt.replace("{{MEMORY}}", memorySection);
    } else {
      prompt = prompt.replace("{{MEMORY}}", "No relevant past decisions found.");
    }

    // Inject file list
    if (options.input?.requiredFiles) {
      prompt = prompt.replace(
        "{{FILES}}",
        options.input.requiredFiles.join("\n")
      );
    }

    return prompt;
  }
}
```

### packages/core/src/agents/base-agent.ts

```typescript
// =============================================================================
// Base Agent — Abstract class for all sub-agents
// =============================================================================

import { createAgentSession } from "@mariozechner/pi-coding-agent";
import type {
  StupidConfig,
  AgentRole,
  AgentResult,
  ProjectMemoryRecord,
} from "../types/index.js";

export interface BaseAgentOptions {
  config: StupidConfig;
  piContext: any;
  prompt: string;
  model: { provider: string; model: string };
  input: any;
  memoryRecords: ProjectMemoryRecord[];
  role: AgentRole;
}

export abstract class BaseAgent {
  protected config: StupidConfig;
  protected piContext: any;
  protected prompt: string;
  protected model: { provider: string; model: string };
  protected input: any;
  protected memoryRecords: ProjectMemoryRecord[];
  protected role: AgentRole;

  constructor(options: BaseAgentOptions) {
    this.config = options.config;
    this.piContext = options.piContext;
    this.prompt = options.prompt;
    this.model = options.model;
    this.input = options.input;
    this.memoryRecords = options.memoryRecords;
    this.role = options.role;
  }

  // Execute the agent in a fresh context window
  async execute(): Promise<AgentResult> {
    const startTime = Date.now();
    let tokensUsed = 0;

    try {
      // Spawn a fresh Pi agent session
      const session = await createAgentSession({
        provider: this.model.provider,
        model: this.model.model,
        mode: "sdk", // Programmatic control
        spawnMode: "spawn", // Fresh context (no parent pollution)
      });

      // Send the prompt and get result
      const response = await session.sendMessage(this.prompt);
      tokensUsed = response.usage?.totalTokens || 0;

      // Parse the structured result from the agent's response
      const result = this.parseResult(response);

      return {
        success: result.success,
        summary: result.summary,
        tokensUsed,
        duration: Date.now() - startTime,
        data: {
          role: this.role,
          ...result.data,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        summary: `Agent ${this.role} failed: ${error.message}`,
        error: error.message,
        tokensUsed,
        duration: Date.now() - startTime,
        data: { role: this.role },
      };
    }
  }

  // Each agent type overrides this to parse its specific result format
  protected abstract parseResult(response: any): {
    success: boolean;
    summary: string;
    data?: Record<string, any>;
  };
}
```

### packages/core/src/agents/research.ts

```typescript
// =============================================================================
// Research Agent — Analyzes codebase, finds patterns, identifies constraints
// =============================================================================
//
// The Research agent is the FIRST agent to run. Its job:
// 1. Scan the project structure (file tree, package.json, configs)
// 2. Identify existing patterns (architecture, naming, testing)
// 3. Find relevant files that will be affected by the task
// 4. Identify constraints (dependencies, env vars, migrations needed)
// 5. Generate clarifying questions the user needs to answer
//
// This agent runs in FORK mode (gets parent context) because it needs
// to explore the full codebase. All other agents run in SPAWN mode.

import { BaseAgent } from "./base-agent.js";
import type { AgentResult } from "../types/index.js";

export class ResearchAgent extends BaseAgent {
  async execute(): Promise<AgentResult> {
    // Override: Research agent uses FORK mode to access codebase
    const startTime = Date.now();

    try {
      const session = await this.createSession({
        spawnMode: "fork", // Gets parent context for codebase access
      });

      const response = await session.sendMessage(this.prompt);
      const tokensUsed = response.usage?.totalTokens || 0;
      const result = this.parseResult(response);

      return {
        success: result.success,
        summary: result.summary,
        tokensUsed,
        duration: Date.now() - startTime,
        data: {
          role: "research",
          fileTree: result.data?.fileTree,
          patterns: result.data?.patterns,
          relevantFiles: result.data?.relevantFiles,
          constraints: result.data?.constraints,
          clarificationQuestions: result.data?.clarificationQuestions,
          existingTests: result.data?.existingTests,
          dependencies: result.data?.dependencies,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        summary: `Research failed: ${error.message}`,
        error: error.message,
        tokensUsed: 0,
        duration: Date.now() - startTime,
        data: { role: "research" },
      };
    }
  }

  protected parseResult(response: any) {
    // Parse the structured research report from the agent's response
    // The agent is prompted to return a specific JSON structure
    try {
      const content = response.content || response.text || "";

      // Extract JSON block from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        return { success: true, summary: data.summary || "", data };
      }

      // Fallback: treat entire response as summary
      return {
        success: true,
        summary: content.slice(0, 500),
        data: { rawResponse: content },
      };
    } catch {
      return {
        success: false,
        summary: "Failed to parse research result",
        data: {},
      };
    }
  }

  private async createSession(overrides: any) {
    const { createAgentSession } = await import("@mariozechner/pi-coding-agent");
    return createAgentSession({
      provider: this.model.provider,
      model: this.model.model,
      mode: "sdk",
      ...overrides,
    });
  }
}
```

### packages/core/src/agents/tester.ts

```typescript
// =============================================================================
// Tester Agent — Writes tests BEFORE implementation (test-first)
// =============================================================================
//
// The Tester agent:
// 1. Receives the task spec + architecture design
// 2. Writes test files that define expected behavior
// 3. Runs the tests (they SHOULD fail — red phase)
// 4. Returns the test file paths and test count
//
// After the Implementer writes code, the Tester runs again to verify
// tests pass (green phase).

import { BaseAgent } from "./base-agent.js";
import type { AgentResult } from "../types/index.js";

export class TesterAgent extends BaseAgent {
  protected parseResult(response: any) {
    try {
      const content = response.content || response.text || "";
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        return {
          success: true,
          summary: `Wrote ${data.testCount || 0} tests in ${data.testFiles?.length || 0} files`,
          data: {
            testFiles: data.testFiles || [],
            testCount: data.testCount || 0,
            testFramework: data.testFramework || "vitest",
            runCommand: data.runCommand || "npm test",
            allPassing: data.allPassing || false,
          },
        };
      }

      return { success: true, summary: content.slice(0, 500), data: {} };
    } catch {
      return { success: false, summary: "Failed to parse test result", data: {} };
    }
  }
}
```

### packages/core/src/agents/implementer.ts

```typescript
// =============================================================================
// Implementer Agent — Writes code to pass the Tester's tests
// =============================================================================
//
// The Implementer agent:
// 1. Receives task spec + test files (written by Tester)
// 2. Reads only the required files (selected by Orchestrator)
// 3. Writes implementation code
// 4. Runs tests to verify they pass
// 5. Returns file changes and test results
//
// CRITICAL: The Implementer runs in SPAWN mode (fresh context).
// It only sees: task spec + relevant files + memory records.

import { BaseAgent } from "./base-agent.js";
import type { AgentResult } from "../types/index.js";

export class ImplementerAgent extends BaseAgent {
  protected parseResult(response: any) {
    try {
      const content = response.content || response.text || "";
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        return {
          success: data.testsPassing === true,
          summary: data.summary || "Implementation complete",
          data: {
            filesChanged: data.filesChanged || [],
            filesCreated: data.filesCreated || [],
            testsPassing: data.testsPassing || false,
            testOutput: data.testOutput || "",
            lintPassing: data.lintPassing || false,
          },
        };
      }

      return { success: true, summary: content.slice(0, 500), data: {} };
    } catch {
      return { success: false, summary: "Failed to parse implementation result", data: {} };
    }
  }
}
```

### packages/core/src/agents/reviewer.ts

```typescript
// =============================================================================
// Reviewer Agent — Reviews code for quality, security, and pattern consistency
// =============================================================================
//
// The Reviewer agent:
// 1. Receives the changed files from the Implementer
// 2. Checks: security vulnerabilities, pattern consistency, code quality
// 3. Returns: APPROVE or REJECT with detailed feedback
//
// CRITICAL RULE: If Reviewer rejects, the SAME Implementer does NOT retry.
// The Orchestrator must either:
// - Assign a different model
// - Decompose the task further
// - Send back to Architect

import { BaseAgent } from "./base-agent.js";
import type { AgentResult } from "../types/index.js";

export class ReviewerAgent extends BaseAgent {
  protected parseResult(response: any) {
    try {
      const content = response.content || response.text || "";
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        return {
          success: data.decision === "approve",
          summary: data.decision === "approve"
            ? "Code review: APPROVED"
            : `Code review: REJECTED — ${data.reason}`,
          data: {
            decision: data.decision, // "approve" | "reject"
            reason: data.reason || "",
            issues: data.issues || [],
            securityConcerns: data.securityConcerns || [],
            patternViolations: data.patternViolations || [],
            suggestions: data.suggestions || [],
          },
        };
      }

      return { success: false, summary: "Could not parse review result", data: {} };
    } catch {
      return { success: false, summary: "Failed to parse review result", data: {} };
    }
  }
}
```

### packages/core/src/agents/spec.ts

```typescript
// =============================================================================
// Spec Agent — Converts user requirements into technical specification
// =============================================================================

import { BaseAgent } from "./base-agent.js";

export class SpecAgent extends BaseAgent {
  protected parseResult(response: any) {
    try {
      const content = response.content || response.text || "";
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        return {
          success: true,
          summary: data.summary || "Spec created",
          data: {
            milestone: data.milestone || "",
            successCriteria: data.successCriteria || [],
            requirements: data.requirements || [],
            outOfScope: data.outOfScope || [],
            assumptions: data.assumptions || [],
          },
        };
      }

      return { success: true, summary: content.slice(0, 500), data: {} };
    } catch {
      return { success: false, summary: "Failed to parse spec result", data: {} };
    }
  }
}
```

### packages/core/src/agents/architect.ts

```typescript
// =============================================================================
// Architect Agent — Designs file structure, API contracts, DB schema
// =============================================================================

import { BaseAgent } from "./base-agent.js";

export class ArchitectAgent extends BaseAgent {
  protected parseResult(response: any) {
    try {
      const content = response.content || response.text || "";
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        return {
          success: true,
          summary: data.summary || "Architecture designed",
          data: {
            slices: data.slices || [],
            fileStructure: data.fileStructure || {},
            apiContracts: data.apiContracts || [],
            dbChanges: data.dbChanges || [],
            dependencies: data.dependencies || [],
            migrationNeeded: data.migrationNeeded || false,
          },
        };
      }

      return { success: true, summary: content.slice(0, 500), data: {} };
    } catch {
      return { success: false, summary: "Failed to parse architecture result", data: {} };
    }
  }
}
```

### packages/core/src/agents/finalizer.ts

```typescript
// =============================================================================
// Finalizer Agent — Lint, format, commit, create PR
// =============================================================================

import { BaseAgent } from "./base-agent.js";

export class FinalizerAgent extends BaseAgent {
  protected parseResult(response: any) {
    try {
      const content = response.content || response.text || "";
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        return {
          success: data.success !== false,
          summary: data.summary || "Finalization complete",
          data: {
            lintPassed: data.lintPassed || false,
            formatApplied: data.formatApplied || false,
            commitHash: data.commitHash || "",
            commitMessage: data.commitMessage || "",
            branch: data.branch || "",
            prUrl: data.prUrl || null,
            prNumber: data.prNumber || null,
          },
        };
      }

      return { success: true, summary: content.slice(0, 500), data: {} };
    } catch {
      return { success: false, summary: "Failed to parse finalizer result", data: {} };
    }
  }
}
```

### packages/core/src/agents/prompt-loader.ts

```typescript
// =============================================================================
// Prompt Loader — Loads and caches prompt templates from the prompts/ directory
// =============================================================================

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AgentRole } from "../types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, "../../../prompts");

const promptCache = new Map<string, string>();

export function loadPromptTemplate(role: AgentRole): string {
  if (promptCache.has(role)) {
    return promptCache.get(role)!;
  }

  const templatePath = join(PROMPTS_DIR, `${role}.md`);

  if (!existsSync(templatePath)) {
    throw new Error(`Prompt template not found: ${templatePath}`);
  }

  const template = readFileSync(templatePath, "utf-8");
  promptCache.set(role, template);
  return template;
}
```

---

## 10. Layer 3: Memory Engine

### packages/core/src/memory/project-memory.ts

```typescript
// =============================================================================
// Project Memory — Cross-session persistent knowledge store
// =============================================================================
//
// Stores decision records, patterns, bugs, and architectural choices
// in a local SQLite database with FTS5 full-text search.
//
// Every completed slice generates a decision record automatically.
// When a new session starts, relevant records are retrieved via
// semantic search (FTS5 + BM25 scoring) and injected into sub-agents.
//
// Database location: .stupid/MEMORY.db (per-project, git-ignored)
//
// Schema:
//   decisions    — What was decided and why
//   patterns     — Code patterns discovered or established
//   bugs         — Bugs encountered and how they were fixed
//   files        — File-level change history
//   decisions_fts — FTS5 virtual table for full-text search

import Database from "better-sqlite3";
import { join } from "path";
import type {
  StupidConfig,
  DecisionRecord,
  ProjectMemoryRecord,
  SliceSpec,
  AgentResult,
} from "../types/index.js";

export class ProjectMemory {
  private db: Database.Database;
  private config: StupidConfig;

  constructor(config: StupidConfig) {
    this.config = config;
    const dbPath = join(config.stateDir, "MEMORY.db");
    this.db = new Database(dbPath);
    this.initSchema();
  }

  // ─── Schema ──────────────────────────────────────────────────────

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        slice_name TEXT NOT NULL,
        date TEXT NOT NULL,
        summary TEXT NOT NULL,
        decisions_json TEXT NOT NULL,    -- JSON array of decision strings
        patterns_json TEXT NOT NULL,     -- JSON array of pattern strings
        bugs_json TEXT NOT NULL,         -- JSON array of bug descriptions
        files_changed_json TEXT NOT NULL, -- JSON array of file paths
        tests_added INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        model TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        pattern_type TEXT NOT NULL,      -- "architecture" | "naming" | "testing" | "config"
        description TEXT NOT NULL,
        file_example TEXT,               -- Example file path
        code_example TEXT,               -- Example code snippet
        frequency INTEGER DEFAULT 1,     -- How many times this pattern appeared
        last_seen TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS bugs (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        root_cause TEXT,
        fix_description TEXT NOT NULL,
        files_affected_json TEXT,
        prevention_note TEXT,            -- How to prevent in future
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- FTS5 full-text search index
      CREATE VIRTUAL TABLE IF NOT EXISTS decisions_fts USING fts5(
        summary,
        decisions_json,
        patterns_json,
        bugs_json,
        files_changed_json,
        content='decisions',
        content_rowid='rowid'
      );

      -- Triggers to keep FTS index in sync
      CREATE TRIGGER IF NOT EXISTS decisions_ai AFTER INSERT ON decisions BEGIN
        INSERT INTO decisions_fts(rowid, summary, decisions_json, patterns_json, bugs_json, files_changed_json)
        VALUES (new.rowid, new.summary, new.decisions_json, new.patterns_json, new.bugs_json, new.files_changed_json);
      END;

      CREATE TRIGGER IF NOT EXISTS decisions_ad AFTER DELETE ON decisions BEGIN
        INSERT INTO decisions_fts(decisions_fts, rowid, summary, decisions_json, patterns_json, bugs_json, files_changed_json)
        VALUES ('delete', old.rowid, old.summary, old.decisions_json, old.patterns_json, old.bugs_json, old.files_changed_json);
      END;

      CREATE TRIGGER IF NOT EXISTS decisions_au AFTER UPDATE ON decisions BEGIN
        INSERT INTO decisions_fts(decisions_fts, rowid, summary, decisions_json, patterns_json, bugs_json, files_changed_json)
        VALUES ('delete', old.rowid, old.summary, old.decisions_json, old.patterns_json, old.bugs_json, old.files_changed_json);
        INSERT INTO decisions_fts(rowid, summary, decisions_json, patterns_json, bugs_json, files_changed_json)
        VALUES (new.rowid, new.summary, new.decisions_json, new.patterns_json, new.bugs_json, new.files_changed_json);
      END;
    `);
  }

  // ─── Write ───────────────────────────────────────────────────────

  async saveDecisionRecord(
    slice: SliceSpec,
    result: AgentResult
  ): Promise<void> {
    const record = await this.extractDecisions(slice, result);

    const stmt = this.db.prepare(`
      INSERT INTO decisions (id, session_id, slice_name, date, summary, decisions_json, patterns_json, bugs_json, files_changed_json, tests_added, cost, model)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.sessionId,
      record.sliceName,
      record.date,
      record.summary,
      JSON.stringify(record.decisions),
      JSON.stringify(record.patterns),
      JSON.stringify(record.bugs),
      JSON.stringify(record.filesChanged),
      record.testsAdded,
      record.cost,
      record.model
    );

    // Also save any new patterns discovered
    for (const pattern of record.patterns) {
      this.upsertPattern(pattern);
    }

    // Save any bugs for future reference
    for (const bug of record.bugs) {
      this.saveBug(bug);
    }
  }

  // ─── Read ────────────────────────────────────────────────────────

  // Full-text search across all decision records
  async search(query: string, limit: number = 10): Promise<ProjectMemoryRecord[]> {
    const stmt = this.db.prepare(`
      SELECT d.*, rank
      FROM decisions_fts fts
      JOIN decisions d ON d.rowid = fts.rowid
      WHERE decisions_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(query, limit);
    return rows.map(this.rowToRecord);
  }

  // Get records relevant to a specific phase/task
  async getRelevantRecords(
    phase: string,
    input: any,
    limit: number = 5
  ): Promise<ProjectMemoryRecord[]> {
    // Build a search query from the phase and input
    const searchTerms: string[] = [];

    if (typeof input === "string") {
      searchTerms.push(input);
    } else if (input?.task) {
      searchTerms.push(input.task);
    }

    // Add phase-specific search terms
    if (phase === "architect" || phase === "implementer") {
      searchTerms.push("pattern", "architecture", "structure");
    }
    if (phase === "tester") {
      searchTerms.push("test", "bug", "fix");
    }

    if (searchTerms.length === 0) {
      return [];
    }

    // Use OR to find any matching records
    const query = searchTerms.join(" OR ");
    return this.search(query, limit);
  }

  // Get all patterns of a specific type
  async getPatterns(type?: string): Promise<any[]> {
    if (type) {
      return this.db.prepare("SELECT * FROM patterns WHERE pattern_type = ? ORDER BY frequency DESC").all(type);
    }
    return this.db.prepare("SELECT * FROM patterns ORDER BY frequency DESC").all();
  }

  // Get recent bugs for prevention
  async getRecentBugs(limit: number = 10): Promise<any[]> {
    return this.db.prepare("SELECT * FROM bugs ORDER BY created_at DESC LIMIT ?").all(limit);
  }

  // Get summary statistics
  async getStats(): Promise<{
    totalDecisions: number;
    totalPatterns: number;
    totalBugs: number;
    oldestRecord: string | null;
    newestRecord: string | null;
  }> {
    const decisions = this.db.prepare("SELECT COUNT(*) as count FROM decisions").get() as any;
    const patterns = this.db.prepare("SELECT COUNT(*) as count FROM patterns").get() as any;
    const bugs = this.db.prepare("SELECT COUNT(*) as count FROM bugs").get() as any;
    const oldest = this.db.prepare("SELECT MIN(date) as date FROM decisions").get() as any;
    const newest = this.db.prepare("SELECT MAX(date) as date FROM decisions").get() as any;

    return {
      totalDecisions: decisions.count,
      totalPatterns: patterns.count,
      totalBugs: bugs.count,
      oldestRecord: oldest.date,
      newestRecord: newest.date,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  private async extractDecisions(
    slice: SliceSpec,
    result: AgentResult
  ): Promise<DecisionRecord> {
    // The DecisionExtractor analyzes the slice results and
    // extracts structured decision records
    const { DecisionExtractor } = await import("./decision-extractor.js");
    const extractor = new DecisionExtractor();
    return extractor.extract(slice, result);
  }

  private upsertPattern(pattern: any): void {
    const existing = this.db
      .prepare("SELECT id, frequency FROM patterns WHERE description = ?")
      .get(pattern.description) as any;

    if (existing) {
      this.db
        .prepare("UPDATE patterns SET frequency = ?, last_seen = datetime('now') WHERE id = ?")
        .run(existing.frequency + 1, existing.id);
    } else {
      this.db
        .prepare("INSERT INTO patterns (id, pattern_type, description, file_example, code_example) VALUES (?, ?, ?, ?, ?)")
        .run(
          `pat_${Date.now().toString(36)}`,
          pattern.type || "architecture",
          pattern.description,
          pattern.fileExample || null,
          pattern.codeExample || null
        );
    }
  }

  private saveBug(bug: any): void {
    this.db
      .prepare("INSERT INTO bugs (id, description, root_cause, fix_description, files_affected_json, prevention_note) VALUES (?, ?, ?, ?, ?, ?)")
      .run(
        `bug_${Date.now().toString(36)}`,
        bug.description,
        bug.rootCause || null,
        bug.fixDescription || "",
        JSON.stringify(bug.filesAffected || []),
        bug.preventionNote || null
      );
  }

  private rowToRecord(row: any): ProjectMemoryRecord {
    return {
      id: row.id,
      sessionId: row.session_id,
      sliceName: row.slice_name,
      date: row.date,
      summary: row.summary,
      decisions: JSON.parse(row.decisions_json),
      patterns: JSON.parse(row.patterns_json),
      bugs: JSON.parse(row.bugs_json),
      filesChanged: JSON.parse(row.files_changed_json),
      testsAdded: row.tests_added,
      cost: row.cost,
      model: row.model,
    };
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}
```

### packages/core/src/memory/session-memory.ts

```typescript
// =============================================================================
// Session Memory — In-session context compression (Context Mode approach)
// =============================================================================
//
// Inspired by mksglu/context-mode:
// - Compresses tool outputs before they fill the context window
// - Tracks all events in a per-session SQLite table
// - Builds priority-tiered snapshots (≤2KB) before compaction
// - Enables 6x longer sessions before context degradation
//
// Compression strategy:
// - Tool outputs (file reads, grep results, test outputs) are summarized
// - Large outputs are truncated with key information preserved
// - Binary/image outputs are replaced with metadata
// - Repeated patterns are deduplicated

import Database from "better-sqlite3";
import { join } from "path";
import type { StupidConfig } from "../types/index.js";

interface SessionEvent {
  type: "tool_call" | "tool_result" | "file_change" | "error" | "decision" | "test_result";
  timestamp: string;
  agent: string;
  summary: string;
  data?: string; // Compressed JSON
  priority: number; // 1 = critical, 2 = important, 3 = informational
}

export class SessionMemory {
  private db: Database.Database;
  private config: StupidConfig;
  private sessionId: string | null = null;

  constructor(config: StupidConfig) {
    this.config = config;
    const dbPath = join(config.stateDir, "sessions.db");
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        agent TEXT,
        summary TEXT NOT NULL,
        data TEXT,
        priority INTEGER DEFAULT 2
      );

      CREATE TABLE IF NOT EXISTS session_snapshots (
        session_id TEXT PRIMARY KEY,
        snapshot TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_session_events_session
        ON session_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_events_priority
        ON session_events(session_id, priority);
    `);
  }

  // Initialize for a new session
  async initialize(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
  }

  // Record an event
  async recordEvent(event: SessionEvent): Promise<void> {
    if (!this.sessionId) return;

    this.db
      .prepare(
        "INSERT INTO session_events (session_id, type, timestamp, agent, summary, data, priority) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        this.sessionId,
        event.type,
        event.timestamp,
        event.agent,
        event.summary,
        event.data || null,
        event.priority
      );
  }

  // Build a priority-tiered snapshot before compaction (≤2KB)
  async saveSnapshot(ctx: any): Promise<void> {
    if (!this.sessionId) return;

    const MAX_SNAPSHOT_SIZE = 2048; // 2KB

    // Get all events for this session, ordered by priority
    const events = this.db
      .prepare(
        "SELECT * FROM session_events WHERE session_id = ? ORDER BY priority ASC, id DESC"
      )
      .all(this.sessionId) as SessionEvent[];

    // Build snapshot in priority tiers
    const snapshot = this.buildTieredSnapshot(events, MAX_SNAPSHOT_SIZE);

    // Save snapshot
    this.db
      .prepare(
        "INSERT OR REPLACE INTO session_snapshots (session_id, snapshot) VALUES (?, ?)"
      )
      .run(this.sessionId, snapshot);
  }

  // Retrieve snapshot for session resume
  async getSnapshot(sessionId: string): Promise<string | null> {
    const row = this.db
      .prepare("SELECT snapshot FROM session_snapshots WHERE session_id = ?")
      .get(sessionId) as any;
    return row?.snapshot || null;
  }

  private buildTieredSnapshot(
    events: SessionEvent[],
    maxSize: number
  ): string {
    // Priority tiers:
    // Tier 1 (always included): active files, current tasks, critical decisions
    // Tier 2 (if space): recent errors, test results
    // Tier 3 (if space): tool call summaries, informational events

    let snapshot = "<session_resume>\n";
    let currentSize = snapshot.length;

    // Tier 1: Critical state
    const criticalEvents = events.filter((e) => e.priority === 1);
    for (const event of criticalEvents) {
      const line = `<${event.type} agent="${event.agent}">${event.summary}</${event.type}>\n`;
      if (currentSize + line.length < maxSize) {
        snapshot += line;
        currentSize += line.length;
      }
    }

    // Tier 2: Important
    const importantEvents = events.filter((e) => e.priority === 2);
    for (const event of importantEvents) {
      const line = `<${event.type}>${event.summary}</${event.type}>\n`;
      if (currentSize + line.length < maxSize) {
        snapshot += line;
        currentSize += line.length;
      }
    }

    // Tier 3: Informational (only if we have lots of space)
    if (currentSize < maxSize * 0.7) {
      const infoEvents = events.filter((e) => e.priority === 3).slice(0, 5);
      for (const event of infoEvents) {
        const line = `<info>${event.summary}</info>\n`;
        if (currentSize + line.length < maxSize) {
          snapshot += line;
          currentSize += line.length;
        }
      }
    }

    snapshot += "</session_resume>";
    return snapshot;
  }

  close(): void {
    this.db.close();
  }
}
```

### packages/core/src/memory/decision-extractor.ts

```typescript
// =============================================================================
// Decision Extractor — Extracts structured knowledge from completed slices
// =============================================================================
//
// After each slice completes, the extractor analyzes the results and
// pulls out: decisions made, patterns used, bugs found, files changed.
// This structured data is stored in ProjectMemory for cross-session retrieval.

import type { SliceSpec, AgentResult, DecisionRecord } from "../types/index.js";

export class DecisionExtractor {
  extract(slice: SliceSpec, result: AgentResult): DecisionRecord {
    const individualResults = result.data?.individualResults || [];

    return {
      id: `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId: slice.sessionId || "unknown",
      sliceName: slice.name,
      date: new Date().toISOString().split("T")[0],
      summary: this.buildSummary(slice, result),
      decisions: this.extractDecisions(individualResults),
      patterns: this.extractPatterns(individualResults),
      bugs: this.extractBugs(individualResults),
      filesChanged: this.extractFilesChanged(individualResults),
      testsAdded: this.countTests(individualResults),
      cost: result.tokensUsed ? this.estimateCost(result.tokensUsed) : 0,
      model: slice.model || "unknown",
    };
  }

  private buildSummary(slice: SliceSpec, result: AgentResult): string {
    return `Completed "${slice.name}": ${result.summary}`;
  }

  private extractDecisions(results: AgentResult[]): string[] {
    const decisions: string[] = [];

    for (const r of results) {
      // Architect decisions
      if (r.data?.role === "architect") {
        if (r.data?.apiContracts) {
          decisions.push(`API: ${JSON.stringify(r.data.apiContracts)}`);
        }
        if (r.data?.dbChanges) {
          decisions.push(`DB: ${JSON.stringify(r.data.dbChanges)}`);
        }
      }

      // Reviewer observations
      if (r.data?.role === "reviewer" && r.data?.suggestions) {
        for (const s of r.data.suggestions) {
          decisions.push(`Review suggestion: ${s}`);
        }
      }
    }

    return decisions;
  }

  private extractPatterns(results: AgentResult[]): any[] {
    const patterns: any[] = [];

    for (const r of results) {
      if (r.data?.role === "research" && r.data?.patterns) {
        patterns.push(...r.data.patterns);
      }
    }

    return patterns;
  }

  private extractBugs(results: AgentResult[]): any[] {
    const bugs: any[] = [];

    for (const r of results) {
      if (!r.success && r.error) {
        bugs.push({
          description: r.error,
          rootCause: r.data?.failureReason || "unknown",
          fixDescription: r.data?.fixApplied || "manual intervention",
          filesAffected: r.data?.filesChanged || [],
        });
      }
    }

    return bugs;
  }

  private extractFilesChanged(results: AgentResult[]): string[] {
    const files = new Set<string>();

    for (const r of results) {
      if (r.data?.filesChanged) {
        for (const f of r.data.filesChanged) {
          files.add(f);
        }
      }
      if (r.data?.filesCreated) {
        for (const f of r.data.filesCreated) {
          files.add(f);
        }
      }
    }

    return Array.from(files);
  }

  private countTests(results: AgentResult[]): number {
    return results
      .filter((r) => r.data?.role === "tester")
      .reduce((sum, r) => sum + (r.data?.testCount || 0), 0);
  }

  private estimateCost(tokens: number): number {
    // Rough estimate: $3 per 1M input tokens (Sonnet pricing)
    return (tokens / 1_000_000) * 3;
  }
}
```

### packages/core/src/memory/memory-injector.ts

```typescript
// =============================================================================
// Memory Injector — Selects and formats memory records for sub-agent injection
// =============================================================================
//
// When a sub-agent is spawned, the Memory Injector:
// 1. Queries ProjectMemory for relevant records
// 2. Filters by relevance to the current task
// 3. Formats into a concise context block (≤500 tokens)
// 4. Injects into the sub-agent's prompt

import type { ProjectMemoryRecord, AgentRole } from "../types/index.js";

export class MemoryInjector {
  // Build a memory context block for a sub-agent
  format(records: ProjectMemoryRecord[], role: AgentRole, maxTokens: number = 500): string {
    if (records.length === 0) {
      return "No relevant past decisions found.";
    }

    // Filter records by role relevance
    const relevant = this.filterByRole(records, role);

    // Build formatted context
    let context = "## Past Decisions (from project memory)\n\n";
    let estimatedTokens = 20;

    for (const record of relevant) {
      const block = this.formatRecord(record, role);
      const blockTokens = this.estimateTokens(block);

      if (estimatedTokens + blockTokens > maxTokens) {
        break;
      }

      context += block + "\n";
      estimatedTokens += blockTokens;
    }

    return context;
  }

  private filterByRole(
    records: ProjectMemoryRecord[],
    role: AgentRole
  ): ProjectMemoryRecord[] {
    // Different roles care about different aspects
    switch (role) {
      case "architect":
        // Architects care about patterns and file structure
        return records.filter(
          (r) => r.patterns.length > 0 || r.decisions.length > 0
        );
      case "implementer":
        // Implementers care about patterns and past bugs
        return records.filter(
          (r) => r.patterns.length > 0 || r.bugs.length > 0
        );
      case "tester":
        // Testers care about past bugs and test patterns
        return records.filter(
          (r) => r.bugs.length > 0 || r.testsAdded > 0
        );
      case "reviewer":
        // Reviewers care about everything
        return records;
      default:
        return records.slice(0, 3);
    }
  }

  private formatRecord(record: ProjectMemoryRecord, role: AgentRole): string {
    let block = `### [${record.date}] ${record.sliceName}\n`;

    if (record.decisions.length > 0 && (role === "architect" || role === "reviewer")) {
      block += `Decisions: ${record.decisions.slice(0, 3).join("; ")}\n`;
    }

    if (record.patterns.length > 0 && (role === "architect" || role === "implementer")) {
      block += `Patterns: ${record.patterns.slice(0, 2).map((p: any) => p.description || p).join("; ")}\n`;
    }

    if (record.bugs.length > 0 && (role === "tester" || role === "implementer")) {
      block += `Past bugs: ${record.bugs.slice(0, 2).map((b: any) => b.description || b).join("; ")}\n`;
    }

    return block;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

---

## 11. Layer 4: Context Engine

### packages/core/src/context/compressor.ts

```typescript
// =============================================================================
// Context Compressor — Reduces tool output size by ~98%
// =============================================================================
//
// Inspired by mksglu/context-mode:
// - Sandboxes tool outputs so raw data doesn't flood the context window
// - 315KB → 5.4KB compression on typical tool outputs
// - Strategy varies by tool type (file read, grep, test output, etc.)

export class ContextCompressor {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  compress(toolResult: any): any {
    const toolName = toolResult?.tool || toolResult?.name || "";
    const output = toolResult?.output || toolResult?.content || "";

    if (typeof output !== "string") {
      return toolResult;
    }

    // Skip compression for small outputs
    if (output.length < 500) {
      return toolResult;
    }

    let compressed: string;

    switch (toolName) {
      case "read":
      case "Read":
        compressed = this.compressFileRead(output);
        break;
      case "grep":
      case "Grep":
        compressed = this.compressGrepResult(output);
        break;
      case "bash":
      case "Bash":
        compressed = this.compressBashOutput(output);
        break;
      case "ls":
      case "find":
        compressed = this.compressFileList(output);
        break;
      default:
        compressed = this.compressGeneric(output);
    }

    return {
      ...toolResult,
      output: compressed,
      _originalSize: output.length,
      _compressedSize: compressed.length,
      _compressionRatio: Math.round((1 - compressed.length / output.length) * 100),
    };
  }

  private compressFileRead(output: string): string {
    const lines = output.split("\n");

    if (lines.length <= 50) {
      return output; // Small file, no compression needed
    }

    // Keep first 20 lines (imports, class definition)
    // Keep last 10 lines (exports, closing)
    // Summarize middle
    const head = lines.slice(0, 20).join("\n");
    const tail = lines.slice(-10).join("\n");
    const middleCount = lines.length - 30;

    return `${head}\n\n[... ${middleCount} lines omitted — contains function implementations ...]\n\n${tail}`;
  }

  private compressGrepResult(output: string): string {
    const lines = output.split("\n").filter(Boolean);

    if (lines.length <= 20) {
      return output;
    }

    // Keep first 15 matches, summarize rest
    const kept = lines.slice(0, 15).join("\n");
    const omitted = lines.length - 15;

    return `${kept}\n\n[... ${omitted} more matches omitted]`;
  }

  private compressBashOutput(output: string): string {
    const lines = output.split("\n");

    if (lines.length <= 30) {
      return output;
    }

    // For test output: keep summary lines (PASS/FAIL/Error)
    const importantLines = lines.filter(
      (l) =>
        l.includes("PASS") ||
        l.includes("FAIL") ||
        l.includes("Error") ||
        l.includes("error") ||
        l.includes("✓") ||
        l.includes("✗") ||
        l.includes("Tests:") ||
        l.includes("Test Suites:") ||
        l.trim().startsWith("●")
    );

    if (importantLines.length > 0) {
      return `[Test output compressed — ${lines.length} lines → ${importantLines.length} key lines]\n\n${importantLines.join("\n")}`;
    }

    // Generic: keep first 15 + last 10
    const head = lines.slice(0, 15).join("\n");
    const tail = lines.slice(-10).join("\n");
    return `${head}\n\n[... ${lines.length - 25} lines omitted ...]\n\n${tail}`;
  }

  private compressFileList(output: string): string {
    const lines = output.split("\n").filter(Boolean);

    if (lines.length <= 50) {
      return output;
    }

    // Group by directory
    const dirs = new Map<string, string[]>();
    for (const line of lines) {
      const parts = line.split("/");
      const dir = parts.slice(0, -1).join("/") || ".";
      const file = parts[parts.length - 1];
      if (!dirs.has(dir)) dirs.set(dir, []);
      dirs.get(dir)!.push(file);
    }

    // Format as directory summary
    let result = `[${lines.length} files found]\n\n`;
    for (const [dir, files] of dirs) {
      result += `${dir}/ (${files.length} files)\n`;
      // Show first 3 files per dir
      for (const f of files.slice(0, 3)) {
        result += `  ${f}\n`;
      }
      if (files.length > 3) {
        result += `  ... and ${files.length - 3} more\n`;
      }
    }

    return result;
  }

  private compressGeneric(output: string): string {
    if (output.length <= 2000) {
      return output;
    }

    // Keep first 1000 chars + last 500 chars
    const head = output.slice(0, 1000);
    const tail = output.slice(-500);
    const omitted = output.length - 1500;

    return `${head}\n\n[... ${omitted} characters omitted ...]\n\n${tail}`;
  }
}
```

### packages/core/src/context/file-selector.ts

```typescript
// =============================================================================
// File Selector — Chooses which files to inject into sub-agent context
// =============================================================================
//
// The Research agent maps the codebase. The File Selector uses that map
// to pick only the files relevant to each sub-agent's task.
// This prevents context pollution — the implementer only sees what it needs.

import type { TaskSpec, AgentResult } from "../types/index.js";

export class FileSelector {
  // Select files relevant to a specific task
  selectForTask(
    task: TaskSpec,
    researchData: AgentResult
  ): string[] {
    const files = new Set<string>();

    // 1. Files explicitly required by the task
    if (task.requiredFiles) {
      for (const f of task.requiredFiles) {
        files.add(f);
      }
    }

    // 2. Files identified by research as related
    if (researchData.data?.relevantFiles) {
      for (const f of researchData.data.relevantFiles) {
        // Only add if relevant to this task's domain
        if (this.isRelevantToTask(f, task)) {
          files.add(f);
        }
      }
    }

    // 3. Always include configuration files
    const configFiles = [
      "package.json",
      "tsconfig.json",
      ".env.example",
    ];
    for (const f of configFiles) {
      // Only add if they exist in the research data
      if (researchData.data?.fileTree?.includes(f)) {
        files.add(f);
      }
    }

    return Array.from(files);
  }

  private isRelevantToTask(filePath: string, task: TaskSpec): boolean {
    // Simple relevance check: does the file path contain any keywords from the task name?
    const taskKeywords = task.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const pathLower = filePath.toLowerCase();
    return taskKeywords.some((kw) => pathLower.includes(kw));
  }
}
```

### packages/core/src/context/snapshot-builder.ts

```typescript
// =============================================================================
// Snapshot Builder — Creates priority-tiered XML snapshots for compaction
// =============================================================================
//
// When the context window is about to compact, the Snapshot Builder
// creates a ≤2KB XML summary of the current session state.
// This snapshot is used to resume the agent's work after compaction.
//
// Priority tiers (if budget is tight, lower tiers are dropped first):
// Tier 1 (ALWAYS): active files, current task state, critical decisions, rules
// Tier 2 (important): recent errors, test results, MCP tool counts
// Tier 3 (nice-to-have): intent notes, general observations

import type { SessionState } from "../types/index.js";

export class SnapshotBuilder {
  private maxSize: number;

  constructor(maxSize: number = 2048) {
    this.maxSize = maxSize;
  }

  build(state: SessionState): string {
    let xml = "<stupid_snapshot>\n";
    let size = xml.length;

    // Tier 1: Critical (always included)
    const tier1 = this.buildTier1(state);
    if (size + tier1.length < this.maxSize) {
      xml += tier1;
      size += tier1.length;
    }

    // Tier 2: Important
    const tier2 = this.buildTier2(state);
    if (size + tier2.length < this.maxSize) {
      xml += tier2;
      size += tier2.length;
    }

    // Tier 3: Informational
    if (size < this.maxSize * 0.7) {
      const tier3 = this.buildTier3(state);
      if (size + tier3.length < this.maxSize) {
        xml += tier3;
      }
    }

    xml += "</stupid_snapshot>";
    return xml;
  }

  private buildTier1(state: SessionState): string {
    let xml = "  <state priority='critical'>\n";

    // Current task
    if (state.currentTask) {
      xml += `    <task>${state.currentTask.name}</task>\n`;
      xml += `    <task_status>${state.currentTask.status}</task_status>\n`;
    }

    // Current slice
    if (state.currentSlice) {
      xml += `    <slice>${state.currentSlice.name} (${state.currentSlice.order}/${state.totalSlices})</slice>\n`;
    }

    // Active files
    if (state.activeFiles && state.activeFiles.length > 0) {
      xml += `    <active_files>${state.activeFiles.join(", ")}</active_files>\n`;
    }

    // Critical decisions
    if (state.decisions && state.decisions.length > 0) {
      for (const d of state.decisions.slice(0, 5)) {
        xml += `    <decision>${d}</decision>\n`;
      }
    }

    xml += "  </state>\n";
    return xml;
  }

  private buildTier2(state: SessionState): string {
    let xml = "  <context priority='important'>\n";

    if (state.recentErrors && state.recentErrors.length > 0) {
      for (const e of state.recentErrors.slice(0, 3)) {
        xml += `    <error>${e}</error>\n`;
      }
    }

    if (state.testResults) {
      xml += `    <tests passing='${state.testResults.passing}' failing='${state.testResults.failing}'/>\n`;
    }

    xml += "  </context>\n";
    return xml;
  }

  private buildTier3(state: SessionState): string {
    let xml = "  <info priority='low'>\n";

    if (state.totalCost) {
      xml += `    <cost>$${state.totalCost.toFixed(2)}</cost>\n`;
    }

    if (state.elapsedMinutes) {
      xml += `    <elapsed>${state.elapsedMinutes}min</elapsed>\n`;
    }

    xml += "  </info>\n";
    return xml;
  }
}
```

---

## 12. Layer 5: Governance

### packages/core/src/governance/loop-detector.ts

```typescript
// =============================================================================
// Loop Detector — Detects when an agent is stuck in a loop
// =============================================================================
//
// Based on research analyzing 220 agent loops:
// - 45% of loops are problematic (stagnation, not catastrophe)
// - Resolution rate drops to 37.2% after 11-15 errors
// - Each loop can cost $50-100+ in API credits
//
// Detection strategy:
// - Track file modifications: same file edited 3+ times → stagnating
// - Track error messages: same error 3+ times → stuck
// - Track tool calls: same sequence repeated → looping
// - Track test results: same tests failing repeatedly → stuck
//
// 5-state classification:
//   productive → stagnating → stuck → failing → recovering

export type LoopState =
  | "productive"
  | "stagnating"
  | "stuck"
  | "failing"
  | "recovering";

interface FileModification {
  path: string;
  timestamp: number;
  hash?: string;
}

interface ErrorEntry {
  message: string;
  timestamp: number;
  count: number;
}

export class LoopDetector {
  private config: any;
  private fileModifications: FileModification[] = [];
  private errors: Map<string, ErrorEntry> = new Map();
  private toolCallSequence: string[] = [];
  private state: LoopState = "productive";
  private stateHistory: Array<{ state: LoopState; timestamp: number }> = [];

  // Thresholds
  private readonly FILE_EDIT_THRESHOLD = 3;     // Same file edited 3+ times
  private readonly ERROR_REPEAT_THRESHOLD = 3;   // Same error 3+ times
  private readonly SEQUENCE_LENGTH = 5;          // Check last 5 tool calls for patterns
  private readonly MAX_ERRORS_BEFORE_STUCK = 5;  // Total errors before "stuck"

  constructor(config: any) {
    this.config = config;

    // Allow config overrides
    if (config.governance?.loopDetection) {
      const ld = config.governance.loopDetection;
      if (ld.fileEditThreshold) this.FILE_EDIT_THRESHOLD = ld.fileEditThreshold;
      if (ld.errorRepeatThreshold) this.ERROR_REPEAT_THRESHOLD = ld.errorRepeatThreshold;
    }
  }

  // Check current state after a tool call
  check(ctx: any): LoopState {
    const toolName = ctx.tool || ctx.name || "";
    const toolArgs = ctx.args || ctx.input || {};

    // Track tool call
    this.toolCallSequence.push(toolName);
    if (this.toolCallSequence.length > 20) {
      this.toolCallSequence.shift();
    }

    // Track file modification
    if (["edit", "write", "Edit", "Write"].includes(toolName)) {
      this.trackFileModification(toolArgs.file_path || toolArgs.path || "");
    }

    // Track errors
    if (ctx.error || ctx.isError) {
      this.trackError(ctx.error || ctx.output || "unknown error");
    }

    // Classify state
    this.state = this.classify();
    this.stateHistory.push({ state: this.state, timestamp: Date.now() });

    return this.state;
  }

  // Get current state
  getState(): LoopState {
    return this.state;
  }

  // Get full report
  getReport(): {
    state: LoopState;
    fileEditCounts: Record<string, number>;
    errorCounts: Record<string, number>;
    isSequenceRepeating: boolean;
  } {
    const fileEditCounts: Record<string, number> = {};
    for (const mod of this.fileModifications) {
      fileEditCounts[mod.path] = (fileEditCounts[mod.path] || 0) + 1;
    }

    const errorCounts: Record<string, number> = {};
    for (const [msg, entry] of this.errors) {
      errorCounts[msg] = entry.count;
    }

    return {
      state: this.state,
      fileEditCounts,
      errorCounts,
      isSequenceRepeating: this.isSequenceRepeating(),
    };
  }

  // Reset detector (e.g., when starting a new task)
  reset(): void {
    this.fileModifications = [];
    this.errors.clear();
    this.toolCallSequence = [];
    this.state = "productive";
    this.stateHistory = [];
  }

  // ─── Private Methods ─────────────────────────────────────────────

  private trackFileModification(path: string): void {
    if (!path) return;
    this.fileModifications.push({ path, timestamp: Date.now() });
  }

  private trackError(message: string): void {
    // Normalize error message (remove line numbers, timestamps)
    const normalized = message
      .replace(/\d+/g, "N")
      .replace(/at .+:\d+:\d+/g, "at <location>")
      .slice(0, 200);

    const existing = this.errors.get(normalized);
    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
      this.errors.set(normalized, { message: normalized, timestamp: Date.now(), count: 1 });
    }
  }

  private classify(): LoopState {
    // Check for stuck: same file edited too many times
    const fileCounts = new Map<string, number>();
    for (const mod of this.fileModifications) {
      fileCounts.set(mod.path, (fileCounts.get(mod.path) || 0) + 1);
    }
    const maxFileEdits = Math.max(...fileCounts.values(), 0);

    // Check for stuck: same error repeated
    const maxErrorCount = Math.max(
      ...Array.from(this.errors.values()).map((e) => e.count),
      0
    );

    // Check for repeating tool call sequence
    const isRepeating = this.isSequenceRepeating();

    // Classification logic
    if (maxFileEdits >= this.FILE_EDIT_THRESHOLD * 2 || maxErrorCount >= this.MAX_ERRORS_BEFORE_STUCK) {
      return "failing";
    }

    if (maxFileEdits >= this.FILE_EDIT_THRESHOLD || maxErrorCount >= this.ERROR_REPEAT_THRESHOLD || isRepeating) {
      return "stuck";
    }

    if (maxFileEdits >= 2 || maxErrorCount >= 2) {
      return "stagnating";
    }

    // Check if recovering from a previous bad state
    if (this.stateHistory.length > 2) {
      const prev = this.stateHistory[this.stateHistory.length - 2];
      if (prev.state === "stuck" || prev.state === "failing") {
        return "recovering";
      }
    }

    return "productive";
  }

  private isSequenceRepeating(): boolean {
    if (this.toolCallSequence.length < this.SEQUENCE_LENGTH * 2) {
      return false;
    }

    // Check if the last N calls repeat a pattern
    const recent = this.toolCallSequence.slice(-this.SEQUENCE_LENGTH);
    const previous = this.toolCallSequence.slice(
      -this.SEQUENCE_LENGTH * 2,
      -this.SEQUENCE_LENGTH
    );

    return JSON.stringify(recent) === JSON.stringify(previous);
  }
}
```

### packages/core/src/governance/cost-tracker.ts

```typescript
// =============================================================================
// Cost Tracker — Tracks token usage and costs in real-time
// =============================================================================

import type { CostEntry } from "../types/index.js";

// Pricing per 1M tokens (as of March 2026, approximate)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 0.25, output: 1.25 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gpt-4o": { input: 2.50, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "o3": { input: 10.0, output: 40.0 },
  "o4-mini": { input: 1.10, output: 4.40 },
};

export class CostTracker {
  private entries: CostEntry[] = [];
  private config: any;
  private sessionStartTime: number;

  constructor(config: any) {
    this.config = config;
    this.sessionStartTime = Date.now();
  }

  // Track a single agent call
  track(
    phase: string,
    tokensUsed: number,
    model: { provider: string; model: string },
    inputTokens?: number,
    outputTokens?: number
  ): void {
    const pricing = MODEL_PRICING[model.model] || { input: 3.0, output: 15.0 };

    // If we don't have separate input/output counts, estimate 70/30 split
    const input = inputTokens || Math.round(tokensUsed * 0.7);
    const output = outputTokens || Math.round(tokensUsed * 0.3);

    const cost =
      (input / 1_000_000) * pricing.input +
      (output / 1_000_000) * pricing.output;

    this.entries.push({
      phase,
      model: model.model,
      provider: model.provider,
      inputTokens: input,
      outputTokens: output,
      totalTokens: tokensUsed,
      cost: Math.round(cost * 10000) / 10000, // Round to 4 decimal places
      timestamp: new Date().toISOString(),
    });
  }

  // Track from Pi extension context
  trackRequest(ctx: any): void {
    const model = ctx.model || "unknown";
    const tokens = ctx.usage?.totalTokens || 0;
    const inputTokens = ctx.usage?.inputTokens || 0;
    const outputTokens = ctx.usage?.outputTokens || 0;

    this.track(
      ctx.phase || "unknown",
      tokens,
      { provider: ctx.provider || "unknown", model },
      inputTokens,
      outputTokens
    );
  }

  // Get total cost
  getTotalCost(): number {
    return this.entries.reduce((sum, e) => sum + e.cost, 0);
  }

  // Get cost for a specific phase
  getPhaseCost(phase: string): number {
    return this.entries
      .filter((e) => e.phase === phase)
      .reduce((sum, e) => sum + e.cost, 0);
  }

  // Get full report
  getReport(): {
    totalCost: number;
    totalTokens: number;
    totalMinutes: number;
    byPhase: Record<string, { cost: number; tokens: number; calls: number }>;
    byModel: Record<string, { cost: number; tokens: number; calls: number }>;
    entries: CostEntry[];
  } {
    const byPhase: Record<string, any> = {};
    const byModel: Record<string, any> = {};

    for (const entry of this.entries) {
      // By phase
      if (!byPhase[entry.phase]) {
        byPhase[entry.phase] = { cost: 0, tokens: 0, calls: 0 };
      }
      byPhase[entry.phase].cost += entry.cost;
      byPhase[entry.phase].tokens += entry.totalTokens;
      byPhase[entry.phase].calls++;

      // By model
      if (!byModel[entry.model]) {
        byModel[entry.model] = { cost: 0, tokens: 0, calls: 0 };
      }
      byModel[entry.model].cost += entry.cost;
      byModel[entry.model].tokens += entry.totalTokens;
      byModel[entry.model].calls++;
    }

    return {
      totalCost: this.getTotalCost(),
      totalTokens: this.entries.reduce((sum, e) => sum + e.totalTokens, 0),
      totalMinutes: Math.round((Date.now() - this.sessionStartTime) / 60000),
      byPhase,
      byModel,
      entries: this.entries,
    };
  }
}
```

### packages/core/src/governance/budget-enforcer.ts

```typescript
// =============================================================================
// Budget Enforcer — Enforces cost limits (soft warning + hard stop)
// =============================================================================

import { CostTracker } from "./cost-tracker.js";

export type BudgetCheckResult = "ok" | "soft_warning" | "hard_stop";

export class BudgetEnforcer {
  private config: any;
  private costTracker: CostTracker;

  constructor(config: any, costTracker?: CostTracker) {
    this.config = config;
    this.costTracker = costTracker || new CostTracker(config);
  }

  setCostTracker(tracker: CostTracker): void {
    this.costTracker = tracker;
  }

  check(): BudgetCheckResult {
    const currentCost = this.costTracker.getTotalCost();
    const hardLimit = this.config.governance?.budget?.hardLimit || Infinity;
    const softLimit = this.config.governance?.budget?.softLimit || hardLimit * 0.8;

    if (currentCost >= hardLimit) {
      return "hard_stop";
    }

    if (currentCost >= softLimit) {
      return "soft_warning";
    }

    return "ok";
  }

  // Check if a specific task is within per-task budget
  checkTask(taskCost: number): BudgetCheckResult {
    const perTaskLimit = this.config.governance?.budget?.perTaskLimit || Infinity;

    if (taskCost >= perTaskLimit) {
      return "hard_stop";
    }

    if (taskCost >= perTaskLimit * 0.8) {
      return "soft_warning";
    }

    return "ok";
  }

  getRemainingBudget(): number {
    const hardLimit = this.config.governance?.budget?.hardLimit || Infinity;
    return Math.max(0, hardLimit - this.costTracker.getTotalCost());
  }
}
```

### packages/core/src/governance/quality-gate.ts

```typescript
// =============================================================================
// Quality Gate — Pre-commit checks on agent-generated code
// =============================================================================

export class QualityGate {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  // Run all quality checks on changed files
  async check(changedFiles: string[]): Promise<{
    passed: boolean;
    issues: QualityIssue[];
  }> {
    const issues: QualityIssue[] = [];

    // 1. Check for secrets/credentials
    const secretIssues = await this.checkSecrets(changedFiles);
    issues.push(...secretIssues);

    // 2. Check for large file additions
    const sizeIssues = await this.checkFileSize(changedFiles);
    issues.push(...sizeIssues);

    // 3. Check for common AI code patterns (AI slop indicators)
    const slopIssues = await this.checkAISlop(changedFiles);
    issues.push(...slopIssues);

    const passed = issues.filter((i) => i.severity === "error").length === 0;

    return { passed, issues };
  }

  private async checkSecrets(files: string[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];

    // Patterns that indicate secrets
    const secretPatterns = [
      /(?:api[_-]?key|apikey)\s*[:=]\s*['"]\S+['"]/gi,
      /(?:secret|password|passwd|pwd)\s*[:=]\s*['"]\S+['"]/gi,
      /(?:token)\s*[:=]\s*['"]\S{20,}['"]/gi,
      /-----BEGIN (?:RSA|EC|DSA)? ?PRIVATE KEY-----/g,
      /(?:sk-|pk_live_|sk_live_)\S{20,}/g,
    ];

    for (const file of files) {
      // Skip non-text files and config examples
      if (file.endsWith(".example") || file.endsWith(".template")) continue;

      try {
        const { readFileSync } = await import("fs");
        const content = readFileSync(file, "utf-8");

        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            issues.push({
              file,
              severity: "error",
              message: `Potential secret/credential detected: ${pattern.source.slice(0, 30)}...`,
              category: "security",
            });
          }
        }
      } catch {
        // File might not exist yet
      }
    }

    return issues;
  }

  private async checkFileSize(files: string[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];
    const maxFileSize = this.config.governance?.qualityGate?.maxFileSize || 500; // lines

    for (const file of files) {
      try {
        const { readFileSync } = await import("fs");
        const content = readFileSync(file, "utf-8");
        const lineCount = content.split("\n").length;

        if (lineCount > maxFileSize) {
          issues.push({
            file,
            severity: "warning",
            message: `File has ${lineCount} lines (max recommended: ${maxFileSize}). Consider splitting.`,
            category: "maintainability",
          });
        }
      } catch {
        // File might not exist yet
      }
    }

    return issues;
  }

  private async checkAISlop(files: string[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];

    // Common AI slop indicators
    const slopPatterns = [
      { pattern: /TODO: implement/gi, msg: "Contains unimplemented TODO" },
      { pattern: /\/\/ This (function|method|class) .{50,}/g, msg: "Overly verbose AI-style comment" },
      { pattern: /console\.log\(.{0,5}(debug|test|here|todo)/gi, msg: "Debug console.log left in code" },
      { pattern: /any(?:\[\])?;/g, msg: "TypeScript 'any' type used (consider specific type)" },
    ];

    for (const file of files) {
      if (!file.match(/\.(ts|tsx|js|jsx)$/)) continue;

      try {
        const { readFileSync } = await import("fs");
        const content = readFileSync(file, "utf-8");

        for (const { pattern, msg } of slopPatterns) {
          const matches = content.match(pattern);
          if (matches && matches.length > 2) {
            issues.push({
              file,
              severity: "warning",
              message: `${msg} (${matches.length} occurrences)`,
              category: "code_quality",
            });
          }
        }
      } catch {
        // File might not exist yet
      }
    }

    return issues;
  }
}

interface QualityIssue {
  file: string;
  severity: "error" | "warning" | "info";
  message: string;
  category: "security" | "maintainability" | "code_quality";
}
```

---

## 13. Workflow State Machine

### packages/core/src/workflow/state-machine.ts

```typescript
// =============================================================================
// State Machine — File-based state management (GSD-2 approach)
// =============================================================================
//
// All state is persisted in .stupid/ directory:
// - STATE.md     → Human-readable current state
// - state.json   → Machine-readable state
// - MEMORY.db    → SQLite project memory
// - sessions.db  → Session memory
// - cost-log.json → Cost history

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { StupidConfig, PlanSpec, SliceSpec, SessionState } from "../types/index.js";

export class StateMachine {
  private config: StupidConfig;
  private stateDir: string;
  private stateFile: string;
  private markdownFile: string;

  constructor(config: StupidConfig) {
    this.config = config;
    this.stateDir = config.stateDir;
    this.stateFile = join(this.stateDir, "state.json");
    this.markdownFile = join(this.stateDir, "STATE.md");

    // Ensure state directory exists
    if (!existsSync(this.stateDir)) {
      mkdirSync(this.stateDir, { recursive: true });
    }
  }

  // Save a new plan
  async savePlan(plan: PlanSpec): Promise<void> {
    const state: SessionState = {
      sessionId: `session_${Date.now().toString(36)}`,
      plan,
      currentSlice: null,
      currentTask: null,
      startedAt: new Date().toISOString(),
      totalSlices: plan.slices.length,
      activeFiles: [],
      decisions: [],
      recentErrors: [],
      testResults: null,
      totalCost: 0,
    };

    this.writeState(state);
    this.writeMarkdown(state);
  }

  // Load existing state
  async loadState(): Promise<SessionState | null> {
    if (!existsSync(this.stateFile)) {
      return null;
    }

    try {
      const raw = readFileSync(this.stateFile, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Update a slice's status
  async updateSlice(
    sliceId: string,
    status: "pending" | "in_progress" | "completed" | "failed" | "needs_human"
  ): Promise<void> {
    const state = await this.loadState();
    if (!state || !state.plan) return;

    const slice = state.plan.slices.find((s) => s.id === sliceId);
    if (slice) {
      slice.status = status;
      if (status === "in_progress") {
        state.currentSlice = slice;
      }
    }

    this.writeState(state);
    this.writeMarkdown(state);
  }

  // Update current task
  async updateTask(taskId: string, status: string): Promise<void> {
    const state = await this.loadState();
    if (!state || !state.plan) return;

    for (const slice of state.plan.slices) {
      const task = slice.tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = status;
        if (status === "in_progress") {
          state.currentTask = task;
        }
        break;
      }
    }

    this.writeState(state);
    this.writeMarkdown(state);
  }

  // Get current status summary
  getStatus(): string {
    const state = this.loadStateSync();
    if (!state) return "No active session.";

    const plan = state.plan;
    if (!plan) return "No active plan.";

    const completed = plan.slices.filter((s) => s.status === "completed").length;
    const total = plan.slices.length;

    let status = `Session: ${state.sessionId}\n`;
    status += `Progress: ${completed}/${total} slices\n`;
    status += `Cost: $${state.totalCost?.toFixed(2) || "0.00"}\n`;
    status += `Started: ${state.startedAt}\n\n`;

    for (const slice of plan.slices) {
      const icon =
        slice.status === "completed" ? "✅" :
        slice.status === "in_progress" ? "⚡" :
        slice.status === "failed" ? "❌" :
        slice.status === "needs_human" ? "🙋" : "⏳";
      status += `${icon} Slice ${slice.order}: ${slice.name}\n`;
    }

    return status;
  }

  // ─── Private ─────────────────────────────────────────────────────

  private writeState(state: SessionState): void {
    writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  private writeMarkdown(state: SessionState): void {
    const plan = state.plan;
    if (!plan) return;

    let md = `# Stupid State\n\n`;
    md += `**Session:** ${state.sessionId}\n`;
    md += `**Task:** ${plan.task}\n`;
    md += `**Started:** ${state.startedAt}\n\n`;
    md += `## Progress\n\n`;

    for (const slice of plan.slices) {
      const icon =
        slice.status === "completed" ? "✅" :
        slice.status === "in_progress" ? "🔄" :
        slice.status === "failed" ? "❌" : "⬜";
      md += `${icon} **Slice ${slice.order}: ${slice.name}**\n`;

      for (const task of slice.tasks) {
        const taskIcon =
          task.status === "completed" ? "  ✓" :
          task.status === "in_progress" ? "  ►" :
          task.status === "failed" ? "  ✗" : "  ○";
        md += `${taskIcon} ${task.name} (${task.role})\n`;
      }
      md += `\n`;
    }

    writeFileSync(this.markdownFile, md);
  }

  private loadStateSync(): SessionState | null {
    if (!existsSync(this.stateFile)) return null;
    try {
      return JSON.parse(readFileSync(this.stateFile, "utf-8"));
    } catch {
      return null;
    }
  }
}
```

### packages/core/src/workflow/slice-runner.ts

```typescript
// =============================================================================
// Slice Runner — Executes all tasks within a slice sequentially
// =============================================================================
//
// Task execution order within a slice:
// 1. Tester writes tests (red phase)
// 2. Implementer writes code to pass tests (green phase)
// 3. Tester verifies tests pass
// 4. Reviewer checks code quality
//    - If REJECTED: Orchestrator replaces agent (never same one)
// 5. Repeat for all tasks in slice
// 6. Finalizer: lint, format, commit

import type {
  StupidConfig,
  SliceSpec,
  TaskSpec,
  AgentResult,
} from "../types/index.js";
import { AgentFactory } from "../agents/agent-factory.js";
import { ProjectMemory } from "../memory/project-memory.js";
import { CostTracker } from "../governance/cost-tracker.js";
import { LoopDetector } from "../governance/loop-detector.js";
import { BudgetEnforcer } from "../governance/budget-enforcer.js";

interface SliceRunnerContext {
  plan: any;
  memory: ProjectMemory;
  costTracker: CostTracker;
  loopDetector: LoopDetector;
  budgetEnforcer: BudgetEnforcer;
}

export class SliceRunner {
  private config: StupidConfig;
  private agentFactory: AgentFactory;

  constructor(config: StupidConfig, agentFactory: AgentFactory) {
    this.config = config;
    this.agentFactory = agentFactory;
  }

  async run(
    slice: SliceSpec,
    ctx: SliceRunnerContext
  ): Promise<AgentResult> {
    const results: AgentResult[] = [];

    // Group tasks by their execution order: test → implement → review
    const testTasks = slice.tasks.filter((t) => t.role === "tester");
    const implTasks = slice.tasks.filter((t) => t.role === "implementer");
    const reviewTasks = slice.tasks.filter((t) => t.role === "reviewer");

    // Phase 1: Write tests (red)
    for (const task of testTasks) {
      const result = await this.executeTask(task, slice, ctx);
      results.push(result);

      if (!result.success) {
        return this.buildFailureResult(results, "test_writing_failed");
      }
    }

    // Phase 2: Implement (green)
    for (const task of implTasks) {
      // Reset loop detector for each implementation task
      ctx.loopDetector.reset();

      const result = await this.executeTask(task, slice, ctx);
      results.push(result);

      if (!result.success) {
        return this.buildFailureResult(results, "implementation_failed");
      }
    }

    // Phase 3: Verify tests pass
    for (const task of testTasks) {
      const verifyTask: TaskSpec = {
        ...task,
        id: `${task.id}_verify`,
        name: `Verify tests: ${task.name}`,
        input: { ...task.input, phase: "verify" },
      };

      const result = await this.executeTask(verifyTask, slice, ctx);
      results.push(result);

      if (!result.success || !result.data?.allPassing) {
        return this.buildFailureResult(results, "tests_failing");
      }
    }

    // Phase 4: Code review
    for (const task of reviewTasks) {
      const result = await this.executeTask(task, slice, ctx);
      results.push(result);

      if (!result.success || result.data?.decision === "reject") {
        return this.buildFailureResult(results, "review_rejected");
      }
    }

    // Phase 5: Finalize (lint, format, commit)
    const finalizerResult = await this.executeTask(
      {
        id: `${slice.id}_finalize`,
        name: `Finalize: ${slice.name}`,
        role: "finalizer",
        input: {
          sliceName: slice.name,
          filesChanged: results.flatMap((r) => r.data?.filesChanged || []),
          filesCreated: results.flatMap((r) => r.data?.filesCreated || []),
        },
        expectedOutput: "Lint + format + commit",
        requiredFiles: [],
        status: "pending",
      },
      slice,
      ctx
    );
    results.push(finalizerResult);

    // Calculate total tests passing
    const totalTests = results
      .filter((r) => r.data?.role === "tester")
      .reduce((sum, r) => sum + (r.data?.testCount || 0), 0);
    slice.testsPassing = totalTests;

    return {
      success: true,
      summary: `Slice "${slice.name}" completed: ${totalTests} tests passing`,
      tokensUsed: results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
      data: { individualResults: results, testsPassing: totalTests },
    };
  }

  private async executeTask(
    task: TaskSpec,
    slice: SliceSpec,
    ctx: SliceRunnerContext
  ): Promise<AgentResult> {
    // Check budget
    const budgetCheck = ctx.budgetEnforcer.check();
    if (budgetCheck === "hard_stop") {
      return {
        success: false,
        summary: "Budget exceeded",
        error: "hard_budget_stop",
        tokensUsed: 0,
        data: { role: task.role },
      };
    }

    // Get relevant memory
    const memoryRecords = await ctx.memory.getRelevantRecords(task.role, task.input);

    // Select model (use slice override if available)
    const model = slice.modelOverride || { provider: "anthropic", model: "claude-sonnet-4-6" };

    // Create and execute agent
    const agent = this.agentFactory.create(task.role, {
      model,
      input: task.input,
      memoryRecords,
    });

    const result = await agent.execute();

    // Track cost
    ctx.costTracker.track(task.role, result.tokensUsed || 0, model);

    // Check for loops
    if (result.tokensUsed && result.tokensUsed > 0) {
      const loopState = ctx.loopDetector.getState();
      if (loopState === "stuck" || loopState === "failing") {
        result.success = false;
        result.failureReason = "loop_detected";
      }
    }

    return result;
  }

  private buildFailureResult(
    results: AgentResult[],
    reason: string
  ): AgentResult {
    return {
      success: false,
      summary: `Slice failed: ${reason}`,
      error: reason,
      failureReason: reason,
      tokensUsed: results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
      data: { individualResults: results },
    };
  }
}
```

### packages/core/src/workflow/test-runner.ts

```typescript
// =============================================================================
// Test Runner — Executes tests and returns structured results
// =============================================================================

import { execSync } from "child_process";
import type { StupidConfig } from "../types/index.js";

export interface TestResult {
  passed: boolean;
  total: number;
  passing: number;
  failing: number;
  output: string;
  duration: number;
}

export class TestRunner {
  private config: StupidConfig;

  constructor(config: StupidConfig) {
    this.config = config;
  }

  async run(command?: string): Promise<TestResult> {
    const testCommand = command || this.config.testCommand || "npm test";
    const startTime = Date.now();

    try {
      const output = execSync(testCommand, {
        encoding: "utf-8",
        timeout: 120000, // 2 minute timeout
        stdio: "pipe",
      });

      const parsed = this.parseTestOutput(output);

      return {
        passed: parsed.failing === 0,
        total: parsed.total,
        passing: parsed.passing,
        failing: parsed.failing,
        output: output.slice(-2000), // Last 2000 chars
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      const output = error.stdout || error.stderr || error.message;
      const parsed = this.parseTestOutput(output);

      return {
        passed: false,
        total: parsed.total,
        passing: parsed.passing,
        failing: parsed.failing || 1,
        output: output.slice(-2000),
        duration: Date.now() - startTime,
      };
    }
  }

  private parseTestOutput(output: string): {
    total: number;
    passing: number;
    failing: number;
  } {
    // Try to parse various test framework outputs

    // Jest / Vitest format: "Tests: X passed, Y failed, Z total"
    const jestMatch = output.match(
      /Tests:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?(?:,\s*(\d+)\s*total)?/
    );
    if (jestMatch) {
      const passing = parseInt(jestMatch[1]) || 0;
      const failing = parseInt(jestMatch[2]) || 0;
      const total = parseInt(jestMatch[3]) || passing + failing;
      return { total, passing, failing };
    }

    // Mocha format: "X passing" / "Y failing"
    const passingMatch = output.match(/(\d+)\s*passing/);
    const failingMatch = output.match(/(\d+)\s*failing/);
    if (passingMatch || failingMatch) {
      const passing = parseInt(passingMatch?.[1] || "0");
      const failing = parseInt(failingMatch?.[1] || "0");
      return { total: passing + failing, passing, failing };
    }

    // Fallback: count check marks / x marks
    const checks = (output.match(/[✓✔✅]/g) || []).length;
    const crosses = (output.match(/[✗✘❌]/g) || []).length;
    if (checks > 0 || crosses > 0) {
      return { total: checks + crosses, passing: checks, failing: crosses };
    }

    return { total: 0, passing: 0, failing: 0 };
  }
}
```

### packages/core/src/workflow/pr-builder.ts

```typescript
// =============================================================================
// PR Builder — Creates git branch and pull request
// =============================================================================

import { execSync } from "child_process";
import type { PlanSpec } from "../types/index.js";

export class PRBuilder {
  async createBranchAndCommit(plan: PlanSpec, files: string[]): Promise<{
    branch: string;
    commitHash: string;
  }> {
    const branchName = this.generateBranchName(plan.task);

    // Create and switch to new branch
    execSync(`git checkout -b ${branchName}`, { stdio: "pipe" });

    // Stage files
    for (const file of files) {
      execSync(`git add "${file}"`, { stdio: "pipe" });
    }

    // Commit
    const commitMessage = this.generateCommitMessage(plan);
    execSync(`git commit -m "${commitMessage}"`, { stdio: "pipe" });

    const commitHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();

    return { branch: branchName, commitHash };
  }

  async createPR(plan: PlanSpec, branch: string): Promise<string | null> {
    try {
      const title = this.generatePRTitle(plan.task);
      const body = this.generatePRBody(plan);

      const output = execSync(
        `gh pr create --title "${title}" --body "${body}" --head ${branch}`,
        { encoding: "utf-8", stdio: "pipe" }
      );

      // Extract PR URL from output
      const urlMatch = output.match(/https:\/\/github\.com\/\S+/);
      return urlMatch ? urlMatch[0] : null;
    } catch {
      // gh CLI not available or not authenticated
      return null;
    }
  }

  private generateBranchName(task: string): string {
    const slug = task
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);
    return `stupid/${slug}`;
  }

  private generateCommitMessage(plan: PlanSpec): string {
    const completedSlices = plan.slices.filter((s) => s.status === "completed");
    return `feat: ${plan.task}\n\nCompleted ${completedSlices.length} slices via Stupid autonomous agent.\n\nCo-Authored-By: Stupid AI <stupid@ai>`;
  }

  private generatePRTitle(task: string): string {
    return task.length > 65 ? task.slice(0, 62) + "..." : task;
  }

  private generatePRBody(plan: PlanSpec): string {
    const slices = plan.slices
      .map((s) => `- [${s.status === "completed" ? "x" : " "}] ${s.name}`)
      .join("\n");

    return `## Summary\n${plan.task}\n\n## Slices\n${slices}\n\n---\n🤖 Generated autonomously by Stupid`;
  }
}
```

---

## 14. CLI Commands & UX

### packages/cli/src/commands/run.ts

```typescript
// =============================================================================
// Run Command — Main entry: stupid "task description"
// =============================================================================

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { Orchestrator, loadConfig } from "@stupid/core";

export async function runCommand(task: string, options: any): Promise<void> {
  const config = loadConfig(options.config);

  // Apply CLI options to config
  if (options.provider) config.provider = options.provider;
  if (options.model) config.modelRouting.defaultModel = options.model;
  if (options.budget) config.governance.budget.hardLimit = options.budget;
  if (options.noMemory) config.memory.enabled = false;

  console.log(chalk.cyan("\n🌙 Stupid\n"));
  console.log(chalk.dim(`Task: ${task}\n`));

  const orchestrator = new Orchestrator(config);

  // Override the orchestrator's prompt methods with CLI-specific implementations
  orchestrator.promptUser = async (question: string, choices?: string[]) => {
    if (choices && choices.length > 0) {
      const { answer } = await inquirer.prompt([{
        type: "list",
        name: "answer",
        message: question,
        choices,
      }]);
      return answer;
    }

    const { answer } = await inquirer.prompt([{
      type: "input",
      name: "answer",
      message: question,
    }]);
    return answer;
  };

  orchestrator.promptApproval = async () => {
    const { approved } = await inquirer.prompt([{
      type: "confirm",
      name: "approved",
      message: "Approve plan and start execution?",
      default: true,
    }]);
    return approved;
  };

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run mode — plan will be created but not executed.\n"));
  }

  const spinner = ora("Analyzing codebase...").start();

  try {
    await orchestrator.run(task);
    spinner.succeed("Done!");
  } catch (error: any) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}
```

### packages/cli/src/commands/auto.ts

```typescript
// =============================================================================
// Auto Command — stupid auto (enter to sleep)
// =============================================================================

import chalk from "chalk";
import ora from "ora";
import { Orchestrator, loadConfig } from "@stupid/core";

export async function autoCommand(options: any): Promise<void> {
  const config = loadConfig(options.config);

  console.log(chalk.cyan("\n🌙 Stupid — Auto Mode\n"));
  console.log(chalk.dim("Resuming autonomous execution. You can walk away.\n"));

  const orchestrator = new Orchestrator(config);
  const spinner = ora("Starting autonomous execution...").start();

  try {
    await orchestrator.auto();
    spinner.succeed("All slices completed!");
  } catch (error: any) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}
```

### packages/cli/src/commands/recall.ts

```typescript
// =============================================================================
// Recall Command — stupid recall "query"
// =============================================================================

import chalk from "chalk";
import { ProjectMemory, loadConfig } from "@stupid/core";

export async function recallCommand(query: string, options: any): Promise<void> {
  const config = loadConfig(options.config);
  const memory = new ProjectMemory(config);

  console.log(chalk.cyan(`\n🧠 Searching project memory: "${query}"\n`));

  const results = await memory.search(query);

  if (results.length === 0) {
    console.log(chalk.dim("No matching records found.\n"));
    return;
  }

  for (const record of results) {
    console.log(chalk.bold(`[${record.date}] ${record.sliceName}`));
    console.log(chalk.dim(`  ${record.summary}`));

    if (record.decisions.length > 0) {
      console.log(chalk.yellow("  Decisions:"));
      for (const d of record.decisions.slice(0, 3)) {
        console.log(`    • ${d}`);
      }
    }

    if (record.bugs.length > 0) {
      console.log(chalk.red("  Bugs found:"));
      for (const b of record.bugs.slice(0, 2)) {
        console.log(`    • ${typeof b === "string" ? b : b.description}`);
      }
    }

    console.log("");
  }

  memory.close();
}
```

### packages/cli/src/commands/steer.ts

```typescript
// =============================================================================
// Steer Command — stupid steer "change direction" (from another terminal)
// =============================================================================

import chalk from "chalk";
import { SteerManager, loadConfig } from "@stupid/core";

export async function steerCommand(directive: string, options: any): Promise<void> {
  const config = loadConfig(options.config);
  const steer = new SteerManager(config.stateDir);

  steer.write(directive);

  console.log(chalk.cyan("\n🔄 Steer directive sent.\n"));
  console.log(chalk.dim(`The orchestrator will pick it up at the next phase boundary.\n`));
  console.log(chalk.dim(`Directive: "${directive}"\n`));
}
```

### packages/cli/src/commands/quick.ts

```typescript
// =============================================================================
// Quick Command — stupid quick "small fix" (no full planning, atomic commit)
// =============================================================================

import chalk from "chalk";
import ora from "ora";
import { Orchestrator, loadConfig } from "@stupid/core";

export async function quickCommand(task: string, options: any): Promise<void> {
  const config = loadConfig(options.config);

  // Quick mode overrides: skip research, skip architect, skip spec
  config.tokenProfile = 'budget';

  console.log(chalk.cyan("\n⚡ Stupid — Quick Mode\n"));
  console.log(chalk.dim(`Task: ${task}\n`));
  console.log(chalk.dim("Skipping full planning. Atomic commit per task.\n"));

  const orchestrator = new Orchestrator(config);
  const spinner = ora("Running quick task...").start();

  try {
    await orchestrator.quick(task); // Single task, no milestone/slice decomposition
    spinner.succeed("Done! Atomic commit created.");
  } catch (error: any) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}
```

### packages/cli/src/commands/doctor.ts

```typescript
// =============================================================================
// Doctor Command — stupid doctor (health check + auto-fix)
// =============================================================================

import chalk from "chalk";
import { Doctor, loadConfig } from "@stupid/core";

export async function doctorCommand(options: any): Promise<void> {
  const config = loadConfig(options.config);
  const doctor = new Doctor(config.stateDir);

  console.log(chalk.cyan("\n🩺 Stupid — Doctor\n"));
  console.log(chalk.dim("Running health checks...\n"));

  const issues = await doctor.diagnose();

  if (issues.length === 0) {
    console.log(chalk.green("✅ All checks passed. Project state is healthy.\n"));
    return;
  }

  // Display issues
  for (const issue of issues) {
    const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
    const color = issue.severity === 'error' ? chalk.red : issue.severity === 'warning' ? chalk.yellow : chalk.dim;
    console.log(color(`  ${icon} [${issue.severity}] ${issue.message}${issue.autoFix ? ' (auto-fixable)' : ''}`));
  }

  console.log('');

  // Auto-fix
  const fixable = issues.filter(i => i.autoFix);
  if (fixable.length > 0 && !options.noFix) {
    console.log(chalk.yellow(`🔧 Auto-fixing ${fixable.length} issues...\n`));
    const fixed = await doctor.autoFix();
    console.log(chalk.green(`✅ Fixed ${fixed} issues.\n`));
  }

  const unfixable = issues.filter(i => !i.autoFix && i.severity === 'error');
  if (unfixable.length > 0) {
    console.log(chalk.red(`\n⚠️ ${unfixable.length} issues require manual intervention.\n`));
  }
}
```

### packages/cli/src/commands/capture.ts

```typescript
// =============================================================================
// Capture Command — stupid capture "thought" (fire-and-forget)
// =============================================================================

import chalk from "chalk";
import { CaptureManager, loadConfig } from "@stupid/core";

export async function captureCommand(text: string): Promise<void> {
  const config = loadConfig();
  const captures = new CaptureManager(config.stateDir);

  const capture = captures.add(text);
  console.log(chalk.cyan(`\n💭 Captured: "${text}"`));
  console.log(chalk.dim(`ID: ${capture.id} | Will be triaged between tasks.\n`));
}
```

### packages/cli/src/commands/headless.ts

```typescript
// =============================================================================
// Headless Command — stupid headless auto (non-interactive, CI/CD)
// =============================================================================

import { HeadlessRunner, loadConfig } from "@stupid/core";

export async function headlessCommand(subcommand: string, options: any): Promise<void> {
  const config = loadConfig(options.config);

  const runner = new HeadlessRunner(config, {
    timeout: options.timeout,
    json: options.json,
    maxRetries: options.maxRetries,
    context: options.context,
    autoMode: subcommand === 'auto',
  });

  if (subcommand === 'query') {
    const state = await runner.query();
    console.log(JSON.stringify(state, null, 2));
    return;
  }

  await runner.run();
}
```

### packages/cli/src/commands/export.ts

```typescript
// =============================================================================
// Export Command — stupid export --html (generate reports)
// =============================================================================

import chalk from "chalk";
import { ReportGenerator, loadConfig } from "@stupid/core";

export async function exportCommand(options: any): Promise<void> {
  const config = loadConfig(options.config);
  const generator = new ReportGenerator(config.stateDir);

  if (options.html) {
    const path = await generator.generateHTML({
      allMilestones: options.all,
      outputPath: options.output,
    });
    console.log(chalk.cyan(`\n📊 HTML report generated: ${path}\n`));
  }
}
```

### Updated CLI Entry (packages/cli/src/cli.ts)

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { runCommand } from "./commands/run.js";
import { autoCommand } from "./commands/auto.js";
import { recallCommand } from "./commands/recall.js";
import { steerCommand } from "./commands/steer.js";
import { quickCommand } from "./commands/quick.js";
import { doctorCommand } from "./commands/doctor.js";
import { captureCommand } from "./commands/capture.js";
import { headlessCommand } from "./commands/headless.js";
import { exportCommand } from "./commands/export.js";

const program = new Command();

program
  .name("stupid")
  .description("Autonomous multi-agent coding orchestrator")
  .version("1.0.0");

// Main command: stupid "add feature X"
program
  .argument("[task]", "Task description")
  .option("-p, --provider <provider>", "LLM provider")
  .option("-m, --model <model>", "Override default model")
  .option("-b, --budget <amount>", "Budget limit in USD", parseFloat)
  .option("--profile <profile>", "Token profile: budget|balanced|quality", "balanced")
  .option("--no-memory", "Disable project memory")
  .option("--dry-run", "Create plan without executing")
  .option("--config <path>", "Config file path")
  .action((task, options) => {
    if (task) runCommand(task, options);
  });

// Auto mode: stupid auto
program
  .command("auto")
  .description("Resume autonomous execution (enter to sleep)")
  .option("--config <path>", "Config file path")
  .option("--profile <profile>", "Token profile: budget|balanced|quality")
  .action(autoCommand);

// Quick mode: stupid quick "fix typo"
program
  .command("quick <task>")
  .description("Quick task without full planning (atomic commit)")
  .option("--config <path>", "Config file path")
  .action(quickCommand);

// Steer: stupid steer "change auth to OAuth"
program
  .command("steer <directive>")
  .description("Send steering directive (from another terminal)")
  .option("--config <path>", "Config file path")
  .action(steerCommand);

// Capture: stupid capture "maybe use Redis for caching"
program
  .command("capture <text>")
  .description("Capture a thought for later triage")
  .action(captureCommand);

// Recall: stupid recall "auth patterns"
program
  .command("recall <query>")
  .description("Search project memory")
  .option("--config <path>", "Config file path")
  .action(recallCommand);

// Doctor: stupid doctor
program
  .command("doctor")
  .description("Run health checks on .stupid/ state")
  .option("--no-fix", "Report issues without auto-fixing")
  .option("--config <path>", "Config file path")
  .action(doctorCommand);

// Headless: stupid headless auto
program
  .command("headless <subcommand>")
  .description("Non-interactive execution (CI/CD)")
  .option("--timeout <ms>", "Execution timeout", parseInt)
  .option("--json", "Stream output as JSONL")
  .option("--max-retries <n>", "Max restart attempts", parseInt, 3)
  .option("--context <file>", "Milestone context file")
  .option("--config <path>", "Config file path")
  .action(headlessCommand);

// Export: stupid export --html
program
  .command("export")
  .description("Generate execution reports")
  .option("--html", "Generate HTML report")
  .option("--all", "Include all milestones")
  .option("-o, --output <path>", "Output file path")
  .option("--config <path>", "Config file path")
  .action(exportCommand);

// Status: stupid status
program.command("status").description("Show current progress dashboard").action(() => {
  console.log("TODO: implement status command");
});

// Cost: stupid cost
program.command("cost").description("Show cost breakdown").action(() => {
  console.log("TODO: implement cost command");
});

// Prefs: stupid prefs
program.command("prefs").description("Configure model routing & preferences").action(() => {
  console.log("TODO: implement prefs command");
});

// Plan: stupid plan "task"
program.command("plan <task>").description("Create plan without executing").action(() => {
  console.log("TODO: implement plan command");
});

// Visualize: stupid visualize
program.command("visualize").description("Interactive progress visualization").action(() => {
  console.log("TODO: implement visualize command");
});

// Init: stupid init
program.command("init").description("Initialize .stupid/ in current project").action(() => {
  console.log("TODO: implement init command");
});

// Resume: stupid resume
program.command("resume").description("Resume from last checkpoint").action(() => {
  console.log("TODO: implement resume command");
});

// MCP Server: stupid mcp-server
program.command("mcp-server").description("Start MCP server for external clients").action(() => {
  console.log("TODO: implement mcp-server command");
});

program.parse();
```

---

## 15. Configuration System

### packages/core/src/config/config.ts

```typescript
// =============================================================================
// Configuration — Loads and validates stupid config
// =============================================================================
//
// Config file locations (in order of precedence):
// 1. CLI --config flag
// 2. .stupid/config.yml (project-level)
// 3. ~/.stupid/config.yml (global)
// 4. Built-in defaults

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { parse as parseYaml } from "yaml";
import type { StupidConfig } from "../types/index.js";

export const DEFAULT_CONFIG: StupidConfig = {
  stateDir: ".stupid",
  provider: "anthropic",
  tokenProfile: "balanced",   // budget | balanced | quality

  modelRouting: {
    defaultModel: "claude-sonnet-4-6",
    dynamicRouting: true,       // Enable complexity-based routing
    budgetPressure: true,       // Downgrade models when budget is running low
    adaptiveLearning: true,     // Track success rates and adjust
    tierModels: {
      light: "claude-haiku-4-5",
      standard: "claude-sonnet-4-6",
      heavy: "claude-opus-4-6",
    },
    overrides: {
      research: { provider: "anthropic", model: "claude-haiku-4-5" },
      spec: { provider: "anthropic", model: "claude-sonnet-4-6" },
      architect: { provider: "anthropic", model: "claude-opus-4-6" },
      tester: { provider: "anthropic", model: "claude-sonnet-4-6" },
      implementer: { provider: "anthropic", model: "claude-sonnet-4-6" },
      reviewer: { provider: "anthropic", model: "claude-opus-4-6" },
      finalizer: { provider: "anthropic", model: "claude-sonnet-4-6" },
    },
    escalateOnFailure: true,
  },

  memory: {
    enabled: true,
    maxRecordsPerQuery: 5,
    maxTokensPerInjection: 500,
  },

  context: {
    compressionEnabled: true,
    maxSnapshotSize: 2048,
  },

  governance: {
    budget: {
      softLimit: 20,   // $20 warning
      hardLimit: 50,    // $50 stop
      perTaskLimit: 5,  // $5 per task max
      enforcement: "pause",  // warn | pause | halt
    },
    loopDetection: {
      enabled: true,
      fileEditThreshold: 3,
      errorRepeatThreshold: 3,
    },
    qualityGate: {
      enabled: true,
      maxFileSize: 500,
      checkSecrets: true,
      checkAISlop: true,
    },
  },

  testCommand: "npm test",
  lintCommand: "npm run lint",

  git: {
    strategy: "worktree",    // worktree | branch | none
    autoCommit: true,
    atomicTaskCommits: true, // One commit per task (enables git bisect)
    autoPR: true,
    branchPrefix: "stupid/",
  },

  headless: {
    timeout: 3600000,        // 1 hour
    maxRetries: 3,
    backoffBase: 5000,
    backoffMax: 30000,
  },

  activityLogging: true,     // Enable JSONL activity logs
  agentsMdGeneration: true,  // Auto-update AGENTS.md after slices
};

export function loadConfig(configPath?: string): StupidConfig {
  let userConfig: Partial<StupidConfig> = {};

  // Try loading from specified path
  if (configPath && existsSync(configPath)) {
    userConfig = parseConfigFile(configPath);
  }
  // Try project-level config
  else if (existsSync(".stupid/config.yml")) {
    userConfig = parseConfigFile(".stupid/config.yml");
  }
  // Try global config
  else {
    const globalPath = join(homedir(), ".stupid", "config.yml");
    if (existsSync(globalPath)) {
      userConfig = parseConfigFile(globalPath);
    }
  }

  // Deep merge with defaults
  return deepMerge(DEFAULT_CONFIG, userConfig) as StupidConfig;
}

function parseConfigFile(path: string): Partial<StupidConfig> {
  try {
    const content = readFileSync(path, "utf-8");
    return parseYaml(content) || {};
  } catch {
    return {};
  }
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}
```

### Example config file: .stupid/config.yml

```yaml
# Stupid Configuration

provider: anthropic
tokenProfile: balanced            # budget | balanced | quality

modelRouting:
  dynamicRouting: true            # Complexity-based model selection
  budgetPressure: true            # Downgrade models when budget runs low
  adaptiveLearning: true          # Learn from success/failure rates
  tierModels:
    light: claude-haiku-4-5
    standard: claude-sonnet-4-6
    heavy: claude-opus-4-6
  overrides:
    research:
      provider: google
      model: gemini-2.5-flash
    architect:
      provider: anthropic
      model: claude-opus-4-6
    implementer:
      provider: anthropic
      model: claude-sonnet-4-6
    reviewer:
      provider: anthropic
      model: claude-opus-4-6
  escalateOnFailure: true

memory:
  enabled: true
  maxRecordsPerQuery: 5
  maxTokensPerInjection: 500

governance:
  budget:
    softLimit: 20
    hardLimit: 50
    perTaskLimit: 5
    enforcement: pause            # warn | pause | halt
  loopDetection:
    enabled: true
    fileEditThreshold: 3
    errorRepeatThreshold: 3
  qualityGate:
    enabled: true
    checkSecrets: true
    checkAISlop: true

testCommand: "npm test"
lintCommand: "npm run lint"

git:
  strategy: worktree              # worktree | branch | none
  autoCommit: true
  atomicTaskCommits: true         # One commit per task (git bisect support)
  autoPR: true
  branchPrefix: "stupid/"

headless:
  timeout: 3600000                # 1 hour
  maxRetries: 3
  backoffBase: 5000
  backoffMax: 30000

activityLogging: true             # JSONL activity logs in .stupid/activity/
agentsMdGeneration: true          # Auto-update AGENTS.md after each slice
```

---

## 16. Authentication & Providers

Stupid delegates all authentication to Pi SDK. No custom auth code needed.

### Supported Providers (via Pi SDK)

| Provider | Auth Method | Command |
|---|---|---|
| Anthropic (Claude) | OAuth (Claude Max) or API key | `--provider anthropic` |
| OpenAI (Codex) | OAuth (Codex sub) or API key | `--provider openai` |
| Google (Gemini) | API key (recommended) | `--provider google` |
| GitHub Copilot | OAuth | `--provider copilot` |
| OpenRouter | API key | `--provider openrouter` |
| Azure OpenAI | API key | `--provider azure` |
| Amazon Bedrock | AWS credentials | `--provider bedrock` |
| Ollama (local) | No auth needed | `--provider ollama` |

### First-run Auth Flow

```bash
$ stupid --provider anthropic "add feature X"

🔑 No Anthropic credentials found.
   Choose auth method:
   [1] Claude Max subscription (OAuth — opens browser)
   [2] API key (paste your key)

> 1

🌐 Opening browser for authentication...
✅ Authenticated as user@example.com
🔒 Token saved to ~/.stupid/auth.json
```

---

## 17. Model Routing & Token Profiles

### Token Profiles (GSD-2 Inspired)

Three profiles control model selection, context inline depth, and phase execution:

| Profile | Token Savings | Model Ceiling | Context Inline | Phase Behavior |
|---|---|---|---|---|
| **budget** | 40-60% | Haiku max | Minimal: task plan + truncated summaries | Skip research, skip reassessment |
| **balanced** | 10-20% | Sonnet max | Standard: task plan + summaries + slice plan + roadmap | Skip slice research |
| **quality** | 0% | Opus max | Full: all artifacts, decisions, templates, root files | All phases executed |

```typescript
// packages/core/src/infrastructure/token-profiles.ts

export type TokenProfile = 'budget' | 'balanced' | 'quality';

export interface ProfileConfig {
  modelCeiling: 'light' | 'standard' | 'heavy';
  inlineLevel: 'minimal' | 'standard' | 'full';
  skipResearch: boolean;
  skipReassessment: boolean;
  compressionMode: 'compress' | 'truncate';
}

export const TOKEN_PROFILES: Record<TokenProfile, ProfileConfig> = {
  budget: {
    modelCeiling: 'light',
    inlineLevel: 'minimal',
    skipResearch: true,
    skipReassessment: true,
    compressionMode: 'compress',  // Remove redundancy, abbreviate, deduplicate
  },
  balanced: {
    modelCeiling: 'standard',
    inlineLevel: 'standard',
    skipResearch: false,
    skipReassessment: false,
    compressionMode: 'truncate',  // Drop sections at boundaries
  },
  quality: {
    modelCeiling: 'heavy',
    inlineLevel: 'full',
    skipResearch: false,
    skipReassessment: false,
    compressionMode: 'truncate',
  },
};
```

### Complexity-Based Dynamic Routing

Each task is classified into Light/Standard/Heavy tiers based on signals:

```typescript
// packages/core/src/orchestrator/complexity-classifier.ts

export type ComplexityTier = 'light' | 'standard' | 'heavy';

interface ComplexitySignals {
  stepCount: number;       // ≤3 simple, 4-7 standard, ≥8 complex
  fileCount: number;       // Same thresholds
  descriptionLength: number; // <500 simple, 500-2000 standard, >2000 complex
  codeBlockCount: number;  // ≥5 suggests complexity
  signalWords: string[];   // "research", "refactor", "migrate", "security" bump up
}

export class ComplexityClassifier {
  classify(task: TaskSpec): ComplexityTier {
    const signals = this.extractSignals(task);
    let score = 0;

    // Step count
    if (signals.stepCount <= 3) score += 0;
    else if (signals.stepCount <= 7) score += 1;
    else score += 2;

    // File count
    if (signals.fileCount <= 3) score += 0;
    else if (signals.fileCount <= 7) score += 1;
    else score += 2;

    // Description length
    if (signals.descriptionLength < 500) score += 0;
    else if (signals.descriptionLength < 2000) score += 1;
    else score += 2;

    // Code blocks
    if (signals.codeBlockCount >= 5) score += 1;

    // Signal words
    const bumpWords = ['research', 'refactor', 'migrate', 'security', 'architecture', 'redesign'];
    if (signals.signalWords.some(w => bumpWords.includes(w))) score += 1;

    if (score <= 2) return 'light';
    if (score <= 5) return 'standard';
    return 'heavy';
  }

  private extractSignals(task: TaskSpec): ComplexitySignals {
    const desc = typeof task.input === 'string' ? task.input : JSON.stringify(task.input);
    return {
      stepCount: (desc.match(/\d+\./g) || []).length,
      fileCount: task.requiredFiles.length,
      descriptionLength: desc.length,
      codeBlockCount: (desc.match(/```/g) || []).length / 2,
      signalWords: desc.toLowerCase().split(/\s+/),
    };
  }
}
```

### Default Routing Table

| Phase | Budget Profile | Balanced Profile | Quality Profile |
|---|---|---|---|
| Research | claude-haiku-4-5 | claude-haiku-4-5 | claude-sonnet-4-6 |
| Spec | claude-haiku-4-5 | claude-sonnet-4-6 | claude-sonnet-4-6 |
| Architect | claude-sonnet-4-6 | claude-sonnet-4-6 | claude-opus-4-6 |
| Tester | claude-haiku-4-5 | claude-sonnet-4-6 | claude-sonnet-4-6 |
| Implementer | claude-sonnet-4-6 | claude-sonnet-4-6 | claude-opus-4-6 |
| Reviewer | claude-sonnet-4-6 | claude-opus-4-6 | claude-opus-4-6 |
| Finalizer | claude-haiku-4-5 | claude-haiku-4-5 | claude-sonnet-4-6 |

### Budget Pressure Adjustments

As budget is consumed, the router automatically downgrades models:

```typescript
// packages/core/src/orchestrator/task-router.ts (budget pressure section)

getBudgetAdjustedTier(tier: ComplexityTier, budgetUsedPercent: number): ComplexityTier {
  if (budgetUsedPercent > 90) {
    // Critical: everything drops to minimum
    if (tier === 'heavy') return 'standard';
    return 'light';
  }
  if (budgetUsedPercent > 75) {
    // High pressure: standard becomes light
    if (tier === 'standard') return 'light';
  }
  if (budgetUsedPercent > 50) {
    // Moderate: no change yet, but log warning
  }
  return tier;
}
```

### Adaptive Learning (Routing History)

Track success rates per model×taskType combination and adjust:

```typescript
// packages/core/src/orchestrator/routing-history.ts

interface RoutingRecord {
  taskType: string;
  tier: ComplexityTier;
  model: string;
  success: boolean;
  tokens: number;
  cost: number;
  timestamp: string;
}

export class RoutingHistory {
  private records: RoutingRecord[] = [];
  private historyFile: string;

  constructor(stateDir: string) {
    this.historyFile = join(stateDir, 'routing-history.json');
    this.load();
  }

  // If tier's failure rate >20%, bump up one tier on next attempt
  getAdjustedTier(taskType: string, tier: ComplexityTier): ComplexityTier {
    const relevant = this.records.filter(
      r => r.taskType === taskType && r.tier === tier
    );
    if (relevant.length < 3) return tier; // Not enough data

    const failRate = relevant.filter(r => !r.success).length / relevant.length;
    if (failRate > 0.2) {
      if (tier === 'light') return 'standard';
      if (tier === 'standard') return 'heavy';
    }
    return tier;
  }

  record(entry: RoutingRecord): void {
    this.records.push(entry);
    this.save();
  }

  // User feedback weighted 2× vs automatic outcomes
  recordUserFeedback(model: string, rating: 'over' | 'ok' | 'under'): void {
    // 'over' = model was overkill (could have used cheaper)
    // 'under' = model was insufficient (needed better)
    // 'ok' = correct selection
    // Applied with 2× weight in future routing decisions
  }

  private load(): void { /* load from historyFile */ }
  private save(): void { /* atomic write to historyFile */ }
}
```

### Escalation Chain

When an agent fails, the model is escalated:

```
claude-haiku-4-5 → claude-sonnet-4-6 → claude-opus-4-6 → o3
```

**Downgrade-Only Semantics:** The user's configured model acts as ceiling. The router can only select cheaper alternatives for simpler work — never a more expensive model than configured ceiling (unless escalating from failure).

---

## 18. Git Strategy & Worktree Isolation

### Three Git Isolation Modes

```yaml
# .stupid/config.yml
git:
  strategy: worktree   # worktree | branch | none
```

| Mode | Use Case | How It Works |
|---|---|---|
| **worktree** (default) | Most projects | Each milestone gets `.stupid/worktrees/<MID>/` with its own `milestone/<MID>` branch |
| **branch** | Submodule-heavy repos | Work in project root on milestone branches, no separate directory |
| **none** | Simple projects, hot-reload | Direct work on current branch, no isolation |

### Worktree Mode Implementation

```typescript
// packages/core/src/infrastructure/worktree-manager.ts

import { execSync } from 'child_process';
import { join, resolve } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

export class WorktreeManager {
  private stateDir: string;
  private worktreeBase: string;

  constructor(stateDir: string) {
    this.stateDir = stateDir;
    this.worktreeBase = join(stateDir, 'worktrees');
  }

  /**
   * Create an isolated worktree for a milestone.
   * All work happens in this directory, commits go to milestone/<MID> branch.
   */
  create(milestoneId: string): string {
    const worktreePath = join(this.worktreeBase, milestoneId);
    const branchName = `milestone/${milestoneId}`;

    if (existsSync(worktreePath)) {
      return worktreePath; // Already exists
    }

    mkdirSync(this.worktreeBase, { recursive: true });

    // Create branch from current HEAD if it doesn't exist
    try {
      execSync(`git branch ${branchName}`, { stdio: 'pipe' });
    } catch {
      // Branch already exists, that's fine
    }

    // Create worktree
    execSync(`git worktree add "${worktreePath}" ${branchName}`, {
      stdio: 'pipe',
    });

    return worktreePath;
  }

  /**
   * Get the working directory for a milestone.
   * Returns worktree path if worktree mode, project root otherwise.
   */
  getWorkDir(milestoneId: string, strategy: 'worktree' | 'branch' | 'none'): string {
    if (strategy === 'worktree') {
      return this.create(milestoneId);
    }
    return process.cwd(); // branch or none mode
  }

  /**
   * Squash-merge a milestone worktree back to main.
   */
  merge(milestoneId: string, targetBranch: string = 'main'): void {
    const branchName = `milestone/${milestoneId}`;

    execSync(`git checkout ${targetBranch}`, { stdio: 'pipe' });
    execSync(`git merge --squash ${branchName}`, { stdio: 'pipe' });
    execSync(
      `git commit -m "feat: complete milestone ${milestoneId}"`,
      { stdio: 'pipe' }
    );
  }

  /**
   * Clean up a worktree after milestone completion.
   */
  cleanup(milestoneId: string): void {
    const worktreePath = join(this.worktreeBase, milestoneId);
    const branchName = `milestone/${milestoneId}`;

    if (existsSync(worktreePath)) {
      execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'pipe' });
    }

    try {
      execSync(`git branch -D ${branchName}`, { stdio: 'pipe' });
    } catch {
      // Branch might not exist
    }
  }

  /**
   * List all active worktrees.
   */
  list(): Array<{ milestone: string; path: string; branch: string }> {
    const output = execSync('git worktree list --porcelain', { encoding: 'utf-8' });
    const worktrees: Array<{ milestone: string; path: string; branch: string }> = [];

    const blocks = output.split('\n\n').filter(Boolean);
    for (const block of blocks) {
      const lines = block.split('\n');
      const path = lines.find(l => l.startsWith('worktree '))?.slice(9) || '';
      const branch = lines.find(l => l.startsWith('branch '))?.slice(7) || '';

      if (path.includes(this.worktreeBase)) {
        const milestone = path.split('/').pop() || '';
        worktrees.push({ milestone, path, branch });
      }
    }

    return worktrees;
  }
}
```

### Atomic Commits Per Task

Each completed task produces exactly one commit:

```typescript
// In slice-runner.ts, after successful task completion:

async commitTask(task: TaskSpec, result: AgentResult, workDir: string): Promise<string> {
  const message = [
    `feat(${task.id}): ${result.summary.slice(0, 72)}`,
    '',
    `Slice: ${this.currentSlice.name}`,
    `Agent: ${task.role}`,
    `Model: ${result.data?.model || 'unknown'}`,
    `Tokens: ${result.tokensUsed || 0}`,
    `Cost: $${(result.data?.cost || 0).toFixed(4)}`,
  ].join('\n');

  execSync('git add -A', { cwd: workDir });
  execSync(`git commit -m "${message}"`, { cwd: workDir });

  return execSync('git rev-parse HEAD', { cwd: workDir, encoding: 'utf-8' }).trim();
}
```

---

## 19. Crash Recovery & Doctor System

### Lock File Mechanism

```typescript
// packages/core/src/infrastructure/crash-recovery.ts

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

interface LockInfo {
  pid: number;
  startedAt: string;
  currentUnit: string;    // e.g., "S01/T02"
  currentPhase: string;   // e.g., "implement"
  model: string;
  lastHeartbeat: string;
}

export class CrashRecovery {
  private lockFile: string;
  private stateDir: string;

  constructor(stateDir: string) {
    this.stateDir = stateDir;
    this.lockFile = join(stateDir, 'auto.lock');
  }

  /**
   * Check if a previous session crashed (lock file exists but process is dead).
   */
  detectCrash(): { crashed: boolean; lockInfo?: LockInfo } {
    if (!existsSync(this.lockFile)) {
      return { crashed: false };
    }

    try {
      const lockInfo: LockInfo = JSON.parse(readFileSync(this.lockFile, 'utf-8'));

      // Check if process is still alive
      try {
        process.kill(lockInfo.pid, 0); // Signal 0 = just check existence
        return { crashed: false }; // Process is alive, another instance running
      } catch {
        // Process is dead → crash detected
        return { crashed: true, lockInfo };
      }
    } catch {
      // Corrupted lock file → treat as crash
      return { crashed: true };
    }
  }

  /**
   * Acquire lock for current session.
   */
  acquireLock(unit: string, phase: string, model: string): void {
    const lockInfo: LockInfo = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      currentUnit: unit,
      currentPhase: phase,
      model,
      lastHeartbeat: new Date().toISOString(),
    };
    this.atomicWrite(this.lockFile, JSON.stringify(lockInfo, null, 2));
  }

  /**
   * Update heartbeat to indicate the process is alive.
   */
  heartbeat(unit: string, phase: string): void {
    if (!existsSync(this.lockFile)) return;

    try {
      const lockInfo: LockInfo = JSON.parse(readFileSync(this.lockFile, 'utf-8'));
      lockInfo.lastHeartbeat = new Date().toISOString();
      lockInfo.currentUnit = unit;
      lockInfo.currentPhase = phase;
      this.atomicWrite(this.lockFile, JSON.stringify(lockInfo, null, 2));
    } catch {
      // Ignore heartbeat failures
    }
  }

  /**
   * Release lock on clean shutdown.
   */
  releaseLock(): void {
    if (existsSync(this.lockFile)) {
      unlinkSync(this.lockFile);
    }
  }

  /**
   * Resume from crash: read last known state and determine resume point.
   */
  getResumePoint(): { sliceId: string; taskId: string; phase: string } | null {
    const { crashed, lockInfo } = this.detectCrash();
    if (!crashed || !lockInfo) return null;

    const [sliceId, taskId] = lockInfo.currentUnit.split('/');
    return {
      sliceId: sliceId || '',
      taskId: taskId || '',
      phase: lockInfo.currentPhase,
    };
  }

  /**
   * Atomic write: temp file + rename to prevent corruption.
   */
  private atomicWrite(path: string, content: string): void {
    const tmpPath = `${path}.tmp.${process.pid}`;
    writeFileSync(tmpPath, content, 'utf-8');
    const { renameSync } = require('fs');
    renameSync(tmpPath, path);
  }
}
```

### Doctor System

```typescript
// packages/core/src/infrastructure/doctor.ts

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface DoctorIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  autoFix?: () => void;
}

export class Doctor {
  private stateDir: string;
  private issues: DoctorIssue[] = [];

  constructor(stateDir: string) {
    this.stateDir = stateDir;
  }

  /**
   * Run all health checks and return issues.
   */
  async diagnose(): Promise<DoctorIssue[]> {
    this.issues = [];

    this.checkStateDirectory();
    this.checkStateFileIntegrity();
    this.checkRoadmapConsistency();
    this.checkStaleLockFiles();
    this.checkWorktreeHealth();
    this.checkMemoryDatabase();
    this.checkMetricsFile();
    this.checkRoutingHistory();
    this.checkActivityLogs();
    this.checkCompletedUnits();
    this.checkGitStatus();
    this.checkDiskSpace();
    this.checkOrphanedFiles();

    return this.issues;
  }

  /**
   * Auto-fix all fixable issues.
   */
  async autoFix(): Promise<number> {
    const fixable = this.issues.filter(i => i.autoFix);
    for (const issue of fixable) {
      try {
        issue.autoFix!();
      } catch (err) {
        this.issues.push({
          severity: 'error',
          message: `Auto-fix failed: ${(err as Error).message}`,
        });
      }
    }
    return fixable.length;
  }

  private checkStateDirectory(): void {
    if (!existsSync(this.stateDir)) {
      this.issues.push({
        severity: 'error',
        message: '.stupid/ directory does not exist',
        autoFix: () => {
          const { mkdirSync } = require('fs');
          mkdirSync(this.stateDir, { recursive: true });
        },
      });
    }
  }

  private checkStateFileIntegrity(): void {
    const stateFile = join(this.stateDir, 'state.json');
    if (existsSync(stateFile)) {
      try {
        JSON.parse(readFileSync(stateFile, 'utf-8'));
      } catch {
        this.issues.push({
          severity: 'error',
          message: 'state.json is corrupted (invalid JSON)',
          autoFix: () => {
            const { unlinkSync } = require('fs');
            unlinkSync(stateFile);
          },
        });
      }
    }
  }

  private checkRoadmapConsistency(): void {
    const stateFile = join(this.stateDir, 'state.json');
    if (!existsSync(stateFile)) return;

    try {
      const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
      if (state.plan?.slices) {
        for (const slice of state.plan.slices) {
          // Check dependency references exist
          for (const dep of slice.dependencies || []) {
            if (!state.plan.slices.find((s: any) => s.id === dep)) {
              this.issues.push({
                severity: 'warning',
                message: `Slice ${slice.id} depends on non-existent slice ${dep}`,
              });
            }
          }
          // Check completed slice has all tasks completed
          if (slice.status === 'completed') {
            const incompleteTasks = (slice.tasks || []).filter(
              (t: any) => t.status !== 'completed'
            );
            if (incompleteTasks.length > 0) {
              this.issues.push({
                severity: 'error',
                message: `Slice ${slice.id} marked complete but has ${incompleteTasks.length} incomplete tasks`,
              });
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  private checkStaleLockFiles(): void {
    const lockFile = join(this.stateDir, 'auto.lock');
    if (existsSync(lockFile)) {
      try {
        const lockInfo = JSON.parse(readFileSync(lockFile, 'utf-8'));
        try {
          process.kill(lockInfo.pid, 0);
          // Process alive - not stale
        } catch {
          this.issues.push({
            severity: 'warning',
            message: `Stale lock file found (PID ${lockInfo.pid} is dead, was on ${lockInfo.currentUnit})`,
            autoFix: () => {
              const { unlinkSync } = require('fs');
              unlinkSync(lockFile);
            },
          });
        }
      } catch {
        this.issues.push({
          severity: 'warning',
          message: 'Corrupted lock file found',
          autoFix: () => {
            const { unlinkSync } = require('fs');
            unlinkSync(lockFile);
          },
        });
      }
    }
  }

  private checkWorktreeHealth(): void {
    try {
      const { execSync } = require('child_process');
      const output = execSync('git worktree list', { encoding: 'utf-8' });
      // Check for prunable worktrees
      const pruneOutput = execSync('git worktree list --porcelain', { encoding: 'utf-8' });
      if (pruneOutput.includes('prunable')) {
        this.issues.push({
          severity: 'info',
          message: 'Prunable git worktrees detected',
          autoFix: () => execSync('git worktree prune'),
        });
      }
    } catch { /* git not available or not a repo */ }
  }

  private checkMemoryDatabase(): void {
    const dbFile = join(this.stateDir, 'MEMORY.db');
    if (existsSync(dbFile)) {
      try {
        const Database = require('better-sqlite3');
        const db = new Database(dbFile, { readonly: true });
        db.pragma('integrity_check');
        db.close();
      } catch {
        this.issues.push({
          severity: 'error',
          message: 'Memory database is corrupted',
        });
      }
    }
  }

  private checkMetricsFile(): void { /* verify metrics.json integrity */ }
  private checkRoutingHistory(): void { /* verify routing-history.json */ }
  private checkActivityLogs(): void { /* check .stupid/activity/ for issues */ }
  private checkCompletedUnits(): void { /* verify completed-units.json */ }
  private checkGitStatus(): void { /* check for uncommitted changes in worktrees */ }
  private checkDiskSpace(): void { /* warn if <100MB free */ }
  private checkOrphanedFiles(): void { /* detect orphaned worktrees or temp files */ }
}
```

---

## 20. Headless Mode

Non-interactive execution for CI/CD pipelines, cron jobs, or unattended operation.

```typescript
// packages/core/src/infrastructure/headless.ts

import { Orchestrator } from '../orchestrator/orchestrator.js';
import { CrashRecovery } from './crash-recovery.js';
import type { StupidConfig } from '../types/index.js';

interface HeadlessOptions {
  timeout?: number;       // Max execution time (ms), default: 3600000 (1h)
  json?: boolean;         // Stream output as JSONL
  maxRetries?: number;    // Auto-restart attempts on crash, default: 3
  context?: string;       // Path to milestone context file
  autoMode?: boolean;     // Chain into auto mode after setup
}

export class HeadlessRunner {
  private config: StupidConfig;
  private options: HeadlessOptions;
  private retryCount: number = 0;

  // Exponential backoff: 5s → 10s → 30s cap
  private readonly BACKOFF_BASE = 5000;
  private readonly BACKOFF_MAX = 30000;

  constructor(config: StupidConfig, options: HeadlessOptions = {}) {
    this.config = config;
    this.options = {
      timeout: 3600000,
      json: false,
      maxRetries: 3,
      autoMode: true,
      ...options,
    };
  }

  async run(): Promise<void> {
    const startTime = Date.now();

    while (this.retryCount <= (this.options.maxRetries || 3)) {
      try {
        // Check for timeout
        if (Date.now() - startTime > (this.options.timeout || 3600000)) {
          this.emit({ type: 'timeout', message: 'Execution timeout reached' });
          return;
        }

        const orchestrator = new Orchestrator(this.config);

        // Disable all interactive prompts
        orchestrator.promptUser = async () => '';
        orchestrator.promptApproval = async () => true;

        // Attach JSONL event emitter if requested
        if (this.options.json) {
          orchestrator.on('event', (event: any) => {
            process.stdout.write(JSON.stringify(event) + '\n');
          });
        }

        if (this.options.autoMode) {
          await orchestrator.auto();
        }

        this.emit({ type: 'complete', message: 'Execution completed successfully' });
        return; // Success, exit loop

      } catch (error: any) {
        this.retryCount++;

        if (this.retryCount > (this.options.maxRetries || 3)) {
          this.emit({
            type: 'fatal',
            message: `Max retries (${this.options.maxRetries}) exceeded`,
            error: error.message,
          });
          process.exit(1);
        }

        // Exponential backoff
        const backoff = Math.min(
          this.BACKOFF_BASE * Math.pow(2, this.retryCount - 1),
          this.BACKOFF_MAX,
        );

        this.emit({
          type: 'retry',
          message: `Attempt ${this.retryCount} failed, retrying in ${backoff / 1000}s`,
          error: error.message,
        });

        await this.sleep(backoff);
      }
    }
  }

  /**
   * Quick query: return project state snapshot (~50ms response).
   */
  async query(): Promise<any> {
    const crashRecovery = new CrashRecovery(this.config.stateDir);
    const stateFile = require('path').join(this.config.stateDir, 'state.json');
    const metricsFile = require('path').join(this.config.stateDir, 'metrics.json');

    return {
      state: require('fs').existsSync(stateFile)
        ? JSON.parse(require('fs').readFileSync(stateFile, 'utf-8'))
        : null,
      metrics: require('fs').existsSync(metricsFile)
        ? JSON.parse(require('fs').readFileSync(metricsFile, 'utf-8'))
        : null,
      isLocked: crashRecovery.detectCrash(),
      timestamp: new Date().toISOString(),
    };
  }

  private emit(event: any): void {
    if (this.options.json) {
      process.stdout.write(JSON.stringify({ ...event, timestamp: new Date().toISOString() }) + '\n');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### CLI Command

```bash
# Full headless execution
stupid headless auto --timeout 3600000 --json --max-retries 3

# Quick state query (~50ms)
stupid headless query

# With context file
stupid headless auto --context .stupid/milestone-context.md

# Pipe JSONL to file for monitoring
stupid headless auto --json > execution.log 2>&1 &
```

---

## 21. Activity Logging & JSONL

All events are logged to `.stupid/activity/` as JSONL files for post-mortem analysis.

```typescript
// packages/core/src/infrastructure/activity-logger.ts

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export type ActivityEventType =
  | 'session_start'
  | 'session_end'
  | 'plan_created'
  | 'plan_approved'
  | 'slice_start'
  | 'slice_complete'
  | 'slice_failed'
  | 'task_start'
  | 'task_complete'
  | 'task_failed'
  | 'agent_spawn'
  | 'agent_result'
  | 'model_escalation'
  | 'budget_warning'
  | 'budget_exceeded'
  | 'loop_detected'
  | 'crash_detected'
  | 'crash_recovered'
  | 'steer_received'
  | 'capture_added'
  | 'commit_created'
  | 'pr_created'
  | 'error'
  | 'provider_error'
  | 'provider_retry';

interface ActivityEvent {
  type: ActivityEventType;
  timestamp: string;
  sessionId: string;
  data: Record<string, any>;
}

export class ActivityLogger {
  private logDir: string;
  private currentFile: string;
  private sessionId: string;

  constructor(stateDir: string, sessionId: string) {
    this.logDir = join(stateDir, 'activity');
    this.sessionId = sessionId;

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    // One file per day
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    this.currentFile = join(this.logDir, `${date}.jsonl`);
  }

  log(type: ActivityEventType, data: Record<string, any> = {}): void {
    const event: ActivityEvent = {
      type,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data,
    };

    appendFileSync(this.currentFile, JSON.stringify(event) + '\n', 'utf-8');
  }

  /**
   * Read activity logs for forensic analysis.
   */
  static readLogs(stateDir: string, options?: {
    since?: Date;
    type?: ActivityEventType;
    sessionId?: string;
  }): ActivityEvent[] {
    const logDir = join(stateDir, 'activity');
    if (!existsSync(logDir)) return [];

    const { readdirSync, readFileSync } = require('fs');
    const files = readdirSync(logDir).filter((f: string) => f.endsWith('.jsonl')).sort();

    const events: ActivityEvent[] = [];
    for (const file of files) {
      const lines = readFileSync(join(logDir, file), 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const event: ActivityEvent = JSON.parse(line);
          if (options?.since && new Date(event.timestamp) < options.since) continue;
          if (options?.type && event.type !== options.type) continue;
          if (options?.sessionId && event.sessionId !== options.sessionId) continue;
          events.push(event);
        } catch { /* skip corrupt lines */ }
      }
    }

    return events;
  }
}
```

---

## 22. Captures & Thought Triage

Fire-and-forget thought recording with automatic classification between tasks.

```typescript
// packages/core/src/infrastructure/captures.ts

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';

export type CaptureClassification =
  | 'quick-task'   // Small enough to do right now
  | 'inject'       // Inject into current slice context
  | 'defer'        // Add to roadmap as future work
  | 'replan'       // Triggers replanning of current milestone
  | 'note';        // Just a note, no action needed

interface Capture {
  id: string;
  text: string;
  timestamp: string;
  classification?: CaptureClassification;
  processed: boolean;
}

export class CaptureManager {
  private capturesFile: string;

  constructor(stateDir: string) {
    this.capturesFile = join(stateDir, 'CAPTURES.md');
  }

  /**
   * Add a new capture (fire-and-forget, no LLM needed).
   */
  add(text: string): Capture {
    const capture: Capture = {
      id: `cap_${Date.now().toString(36)}`,
      text,
      timestamp: new Date().toISOString(),
      processed: false,
    };

    // Append to markdown file
    const line = `- [ ] **${capture.id}** (${capture.timestamp}): ${text}\n`;
    appendFileSync(this.capturesFile, line, 'utf-8');

    return capture;
  }

  /**
   * Get all unprocessed captures.
   */
  getUnprocessed(): Capture[] {
    if (!existsSync(this.capturesFile)) return [];

    const content = readFileSync(this.capturesFile, 'utf-8');
    const captures: Capture[] = [];

    for (const line of content.split('\n')) {
      const match = line.match(/- \[ \] \*\*(\w+)\*\* \((.+?)\): (.+)/);
      if (match) {
        captures.push({
          id: match[1],
          timestamp: match[2],
          text: match[3],
          processed: false,
        });
      }
    }

    return captures;
  }

  /**
   * Classify a capture (called by orchestrator between tasks).
   * The LLM classifies the capture text into one of the categories.
   */
  markProcessed(captureId: string, classification: CaptureClassification): void {
    if (!existsSync(this.capturesFile)) return;

    let content = readFileSync(this.capturesFile, 'utf-8');
    content = content.replace(
      `- [ ] **${captureId}**`,
      `- [x] **${captureId}** [${classification}]`
    );
    writeFileSync(this.capturesFile, content, 'utf-8');
  }
}
```

### Steer Command

```typescript
// packages/core/src/infrastructure/steer.ts

import { writeFileSync, existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

export class SteerManager {
  private steerFile: string;

  constructor(stateDir: string) {
    this.steerFile = join(stateDir, 'STEER.md');
  }

  /**
   * Write a steer directive (from another terminal).
   */
  write(directive: string): void {
    const content = [
      `# Steer Directive`,
      ``,
      `**Received:** ${new Date().toISOString()}`,
      ``,
      directive,
    ].join('\n');

    writeFileSync(this.steerFile, content, 'utf-8');
  }

  /**
   * Check if there's a pending steer directive.
   * Called by orchestrator at phase boundaries.
   */
  check(): string | null {
    if (!existsSync(this.steerFile)) return null;

    const content = readFileSync(this.steerFile, 'utf-8');
    return content;
  }

  /**
   * Consume the steer directive (mark as processed).
   */
  consume(): void {
    if (existsSync(this.steerFile)) {
      unlinkSync(this.steerFile);
    }
  }
}
```

---

## 23. Provider Error Handling & Retry

Intelligent error classification with provider-specific retry strategies.

```typescript
// packages/core/src/infrastructure/provider-retry.ts

export type ErrorCategory =
  | 'rate_limit'      // 429 - auto-retry with backoff
  | 'server_error'    // 500, 502, 503 - auto-retry after delay
  | 'auth_error'      // 401, 403 - manual intervention needed
  | 'context_limit'   // Token limit exceeded - reduce context and retry
  | 'timeout'         // Request timeout - retry with shorter context
  | 'network'         // Network error - retry with backoff
  | 'unknown';        // Unknown error - log and escalate

interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;       // ms
  maxDelay: number;        // ms
  backoffMultiplier: number;
  action: 'retry' | 'reduce_context' | 'switch_model' | 'halt';
}

const RETRY_STRATEGIES: Record<ErrorCategory, RetryStrategy> = {
  rate_limit: {
    maxRetries: 5,
    baseDelay: 60000,      // Use retry-after header if available, else 60s
    maxDelay: 300000,
    backoffMultiplier: 1,  // Linear for rate limits
    action: 'retry',
  },
  server_error: {
    maxRetries: 3,
    baseDelay: 30000,
    maxDelay: 120000,
    backoffMultiplier: 2,
    action: 'retry',
  },
  auth_error: {
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 0,
    action: 'halt',
  },
  context_limit: {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1,
    action: 'reduce_context',  // Reduce inline context and retry
  },
  timeout: {
    maxRetries: 2,
    baseDelay: 5000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    action: 'retry',
  },
  network: {
    maxRetries: 5,
    baseDelay: 5000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    action: 'retry',
  },
  unknown: {
    maxRetries: 1,
    baseDelay: 10000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    action: 'retry',
  },
};

export class ProviderRetry {
  private activityLogger: any;

  constructor(activityLogger?: any) {
    this.activityLogger = activityLogger;
  }

  /**
   * Classify an error from an LLM provider.
   */
  classify(error: any): ErrorCategory {
    const status = error?.status || error?.statusCode || error?.response?.status;
    const message = (error?.message || '').toLowerCase();

    if (status === 429 || message.includes('rate limit')) return 'rate_limit';
    if (status === 401 || status === 403 || message.includes('auth')) return 'auth_error';
    if ([500, 502, 503].includes(status)) return 'server_error';
    if (message.includes('context') && message.includes('limit')) return 'context_limit';
    if (message.includes('timeout') || error?.code === 'ETIMEDOUT') return 'timeout';
    if (message.includes('network') || error?.code === 'ECONNREFUSED') return 'network';

    return 'unknown';
  }

  /**
   * Execute a function with automatic retry based on error classification.
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options?: { onRetry?: (attempt: number, error: any) => void }
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const category = this.classify(error);
        const strategy = RETRY_STRATEGIES[category];

        this.activityLogger?.log('provider_error', {
          category,
          attempt,
          message: error.message,
          status: error?.status,
        });

        if (strategy.action === 'halt' || attempt >= strategy.maxRetries) {
          throw error;
        }

        const delay = Math.min(
          strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt),
          strategy.maxDelay,
        );

        // Check for retry-after header
        const retryAfter = error?.response?.headers?.['retry-after'];
        const actualDelay = retryAfter ? parseInt(retryAfter) * 1000 : delay;

        this.activityLogger?.log('provider_retry', {
          category,
          attempt: attempt + 1,
          delay: actualDelay,
          action: strategy.action,
        });

        options?.onRetry?.(attempt + 1, error);
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      }
    }
  }

  /**
   * Get fallback model chain for unattended execution.
   */
  getFallbackChain(primaryModel: string): string[] {
    // If primary fails, try alternatives
    const chains: Record<string, string[]> = {
      'claude-opus-4-6': ['claude-sonnet-4-6', 'claude-haiku-4-5'],
      'claude-sonnet-4-6': ['claude-haiku-4-5', 'gpt-4o'],
      'claude-haiku-4-5': ['gpt-4o-mini', 'gemini-2.5-flash'],
      'gpt-4o': ['claude-sonnet-4-6', 'gemini-2.5-pro'],
    };
    return chains[primaryModel] || [];
  }
}
```

---

## 24. Wave-Based Parallel Execution

Group independent tasks within a slice into waves and execute them in parallel.

```typescript
// packages/core/src/workflow/wave-scheduler.ts

import type { TaskSpec } from '../types/index.js';

interface Wave {
  id: number;
  tasks: TaskSpec[];
}

export class WaveScheduler {
  /**
   * Analyze tasks within a slice and group independent ones into waves.
   * Tasks with no file overlap can run in parallel.
   */
  schedule(tasks: TaskSpec[]): Wave[] {
    const waves: Wave[] = [];
    const completed = new Set<string>();

    let remaining = [...tasks];
    let waveId = 0;

    while (remaining.length > 0) {
      const wave: TaskSpec[] = [];
      const waveFiles = new Set<string>();

      for (const task of remaining) {
        // Check if task depends on any uncompleted task
        const hasDependency = task.requiredFiles.some(f =>
          // A task depends on another if they share files and the other isn't complete
          remaining.some(other =>
            other.id !== task.id &&
            !completed.has(other.id) &&
            other.requiredFiles.some(of => of === f) &&
            !wave.includes(other)
          )
        );

        // Check for file overlap with current wave
        const hasOverlap = task.requiredFiles.some(f => waveFiles.has(f));

        if (!hasDependency && !hasOverlap) {
          wave.push(task);
          task.requiredFiles.forEach(f => waveFiles.add(f));
        }
      }

      // If no tasks could be scheduled (circular dep), force first remaining
      if (wave.length === 0 && remaining.length > 0) {
        wave.push(remaining[0]);
      }

      waves.push({ id: waveId++, tasks: wave });

      // Mark wave tasks as completed and remove from remaining
      for (const task of wave) {
        completed.add(task.id);
      }
      remaining = remaining.filter(t => !completed.has(t.id));
    }

    return waves;
  }

  /**
   * Execute a wave: all tasks in the wave run as parallel sub-agents.
   * Each gets its own fresh context window.
   */
  async executeWave(
    wave: Wave,
    executor: (task: TaskSpec) => Promise<any>
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    const promises = wave.tasks.map(async (task) => {
      const result = await executor(task);
      results.set(task.id, result);
    });

    await Promise.allSettled(promises);
    return results;
  }
}
```

---

## 25. HTML Reports & Visualization

Self-contained HTML reports for progress tracking and post-mortem analysis.

```typescript
// packages/core/src/infrastructure/report-generator.ts

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ActivityLogger } from './activity-logger.js';

export class ReportGenerator {
  private stateDir: string;

  constructor(stateDir: string) {
    this.stateDir = stateDir;
  }

  /**
   * Generate self-contained HTML report.
   */
  async generateHTML(options: {
    allMilestones?: boolean;
    outputPath?: string;
  } = {}): Promise<string> {
    const state = this.loadState();
    const metrics = this.loadMetrics();
    const activities = ActivityLogger.readLogs(this.stateDir);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Stupid — Execution Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #58a6ff; margin-bottom: 24px; }
    h2 { color: #8b949e; margin: 20px 0 12px; border-bottom: 1px solid #21262d; padding-bottom: 8px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin: 12px 0; }
    .metric { display: inline-block; margin: 8px 16px 8px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #58a6ff; }
    .metric-label { font-size: 12px; color: #8b949e; }
    .tree { font-family: monospace; font-size: 13px; line-height: 1.8; }
    .complete { color: #3fb950; }
    .failed { color: #f85149; }
    .in-progress { color: #d29922; }
    .pending { color: #8b949e; }
    .timeline { position: relative; padding-left: 20px; }
    .timeline-item { padding: 8px 0; border-left: 2px solid #30363d; padding-left: 16px; margin-left: 8px; }
    .cost-bar { height: 20px; border-radius: 3px; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #21262d; }
    th { color: #8b949e; font-weight: 600; }
  </style>
</head>
<body>
<div class="container">
  <h1>🤖 Stupid — Execution Report</h1>
  <p style="color:#8b949e;">Generated: ${new Date().toISOString()}</p>

  <h2>Overview</h2>
  <div class="card">
    <div class="metric">
      <div class="metric-value">${state?.plan?.slices?.length || 0}</div>
      <div class="metric-label">Total Slices</div>
    </div>
    <div class="metric">
      <div class="metric-value">${state?.plan?.slices?.filter((s: any) => s.status === 'completed').length || 0}</div>
      <div class="metric-label">Completed</div>
    </div>
    <div class="metric">
      <div class="metric-value">$${(metrics?.totalCost || 0).toFixed(2)}</div>
      <div class="metric-label">Total Cost</div>
    </div>
    <div class="metric">
      <div class="metric-value">${(metrics?.totalTokens || 0).toLocaleString()}</div>
      <div class="metric-label">Total Tokens</div>
    </div>
    <div class="metric">
      <div class="metric-value">${metrics?.totalDuration || '—'}</div>
      <div class="metric-label">Duration</div>
    </div>
  </div>

  <h2>Progress Tree</h2>
  <div class="card tree">
    ${this.renderProgressTree(state)}
  </div>

  <h2>Cost Breakdown by Phase</h2>
  <div class="card">
    ${this.renderCostTable(metrics)}
  </div>

  <h2>Model Usage</h2>
  <div class="card">
    ${this.renderModelUsage(metrics)}
  </div>

  <h2>Timeline</h2>
  <div class="card timeline">
    ${this.renderTimeline(activities)}
  </div>

  <h2>Decisions Made</h2>
  <div class="card">
    ${this.renderDecisions(state)}
  </div>
</div>
</body>
</html>`;

    const outputPath = options.outputPath ||
      join(this.stateDir, `report-${new Date().toISOString().slice(0, 10)}.html`);

    writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
  }

  private loadState(): any {
    const stateFile = join(this.stateDir, 'state.json');
    return existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf-8')) : null;
  }

  private loadMetrics(): any {
    const metricsFile = join(this.stateDir, 'metrics.json');
    return existsSync(metricsFile) ? JSON.parse(readFileSync(metricsFile, 'utf-8')) : null;
  }

  private renderProgressTree(state: any): string { return '<!-- TODO: render tree -->'; }
  private renderCostTable(metrics: any): string { return '<!-- TODO: render costs -->'; }
  private renderModelUsage(metrics: any): string { return '<!-- TODO: render model usage -->'; }
  private renderTimeline(activities: any[]): string { return '<!-- TODO: render timeline -->'; }
  private renderDecisions(state: any): string { return '<!-- TODO: render decisions -->'; }
}
```

### Terminal Visualization

```bash
$ stupid visualize

┌─────────────────────────────────────────────────┐
│  Stupid — Progress Visualization                 │
│                                                   │
│  M001: Add user authentication                    │
│  ├── ✅ S01: Setup auth module        ($2.14)    │
│  │   ├── ✅ T01: Research existing patterns       │
│  │   ├── ✅ T02: Write auth tests                 │
│  │   └── ✅ T03: Implement auth service           │
│  ├── 🔄 S02: JWT token management     ($1.82)    │
│  │   ├── ✅ T01: Write JWT tests                  │
│  │   ├── 🔄 T02: Implement JWT service            │
│  │   └── ⏳ T03: Add refresh token flow           │
│  └── ⏳ S03: Login/register endpoints             │
│                                                   │
│  Budget: $4.96 / $50.00  [████░░░░░░] 9.9%      │
│  Tokens: 142,385 | Cache: 67.2%                   │
│  Profile: balanced | Models: 3 active             │
│                                                   │
│  Press q to quit | r to refresh                   │
└─────────────────────────────────────────────────┘
```

---

## 26. MCP Server Exposure

Expose Stupid's tools via MCP (Model Context Protocol) so external clients (Claude Desktop, VS Code Copilot) can use them.

```typescript
// packages/core/src/infrastructure/mcp-server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class StupidMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: 'stupid', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.registerTools();
  }

  private registerTools(): void {
    this.server.setRequestHandler('tools/list' as any, async () => ({
      tools: [
        {
          name: 'stupid_run',
          description: 'Run a coding task autonomously with spec-driven development',
          inputSchema: {
            type: 'object',
            properties: {
              task: { type: 'string', description: 'Task description' },
              profile: { type: 'string', enum: ['budget', 'balanced', 'quality'] },
            },
            required: ['task'],
          },
        },
        {
          name: 'stupid_status',
          description: 'Get current execution status and progress',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'stupid_recall',
          description: 'Search project memory for past decisions',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
          },
        },
        {
          name: 'stupid_steer',
          description: 'Send a steering directive to change execution direction',
          inputSchema: {
            type: 'object',
            properties: {
              directive: { type: 'string', description: 'New direction or change' },
            },
            required: ['directive'],
          },
        },
        {
          name: 'stupid_capture',
          description: 'Capture a thought for later triage',
          inputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Thought to capture' },
            },
            required: ['text'],
          },
        },
      ],
    }));

    this.server.setRequestHandler('tools/call' as any, async (request: any) => {
      const { name, arguments: args } = request.params;
      // Route to appropriate handler
      switch (name) {
        case 'stupid_run':
          return this.handleRun(args);
        case 'stupid_status':
          return this.handleStatus();
        case 'stupid_recall':
          return this.handleRecall(args);
        case 'stupid_steer':
          return this.handleSteer(args);
        case 'stupid_capture':
          return this.handleCapture(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  private async handleRun(args: any): Promise<any> { /* ... */ }
  private async handleStatus(): Promise<any> { /* ... */ }
  private async handleRecall(args: any): Promise<any> { /* ... */ }
  private async handleSteer(args: any): Promise<any> { /* ... */ }
  private async handleCapture(args: any): Promise<any> { /* ... */ }
}
```

---

## 27. AGENTS.md Auto-Generation

Auto-generate and maintain an AGENTS.md file that helps future AI sessions understand the project better.

```typescript
// packages/core/src/infrastructure/agents-md-generator.ts

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export class AgentsMdGenerator {
  /**
   * Generate AGENTS.md from project memory + codebase analysis.
   * This file gets committed to the repo and helps future AI sessions.
   */
  async generate(projectRoot: string, stateDir: string): Promise<string> {
    const memory = this.loadMemoryRecords(stateDir);
    const patterns = this.extractPatterns(memory);
    const conventions = this.extractConventions(memory);
    const knownBugs = this.extractKnownIssues(memory);

    const content = [
      '# AGENTS.md',
      '',
      '> Auto-generated by Stupid. This file helps AI coding agents understand project conventions.',
      '> Last updated: ' + new Date().toISOString(),
      '',
      '## Build & Test',
      '',
      this.detectBuildCommands(projectRoot),
      '',
      '## Architecture Conventions',
      '',
      ...conventions.map(c => `- ${c}`),
      '',
      '## Code Patterns',
      '',
      ...patterns.map(p => `### ${p.name}\n\n${p.description}\n\nExample: \`${p.fileExample}\``),
      '',
      '## Known Pitfalls',
      '',
      ...knownBugs.map(b => `- **${b.area}**: ${b.description}`),
      '',
      '## File Organization',
      '',
      this.describeFileStructure(projectRoot),
      '',
      '## Naming Conventions',
      '',
      ...this.detectNamingConventions(projectRoot).map(n => `- ${n}`),
    ].join('\n');

    const outputPath = join(projectRoot, 'AGENTS.md');
    writeFileSync(outputPath, content, 'utf-8');
    return outputPath;
  }

  /**
   * Update AGENTS.md incrementally after a slice completes.
   */
  async update(projectRoot: string, newDecisions: string[], newPatterns: any[]): Promise<void> {
    const agentsMd = join(projectRoot, 'AGENTS.md');
    if (!existsSync(agentsMd)) {
      return; // Will be generated on next full run
    }

    let content = readFileSync(agentsMd, 'utf-8');

    // Append new conventions
    if (newDecisions.length > 0) {
      const conventionsSection = content.indexOf('## Architecture Conventions');
      if (conventionsSection >= 0) {
        const insertPoint = content.indexOf('\n\n', conventionsSection + 1);
        const additions = newDecisions.map(d => `- ${d}`).join('\n');
        content = content.slice(0, insertPoint) + '\n' + additions + content.slice(insertPoint);
      }
    }

    content = content.replace(
      /> Last updated: .+/,
      `> Last updated: ${new Date().toISOString()}`
    );

    writeFileSync(agentsMd, content, 'utf-8');
  }

  private loadMemoryRecords(stateDir: string): any[] { return []; }
  private extractPatterns(memory: any[]): any[] { return []; }
  private extractConventions(memory: any[]): string[] { return []; }
  private extractKnownIssues(memory: any[]): any[] { return []; }
  private detectBuildCommands(root: string): string { return ''; }
  private describeFileStructure(root: string): string { return ''; }
  private detectNamingConventions(root: string): string[] { return []; }
}
```

---

## 28. Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/orchestrator/task-planner.test.ts
import { describe, it, expect } from "vitest";
import { TaskPlanner } from "@stupid/core";

describe("TaskPlanner", () => {
  it("should decompose a task into slices with test-first ordering", () => {
    const planner = new TaskPlanner(DEFAULT_CONFIG);
    const plan = await planner.createPlan({
      task: "Add user authentication",
      spec: mockSpecResult,
      architecture: mockArchResult,
      research: mockResearchResult,
    });

    expect(plan.slices.length).toBeGreaterThan(0);

    // Verify test-first ordering in each slice
    for (const slice of plan.slices) {
      const roles = slice.tasks.map((t) => t.role);
      const testerIndex = roles.indexOf("tester");
      const implIndex = roles.indexOf("implementer");

      if (testerIndex >= 0 && implIndex >= 0) {
        expect(testerIndex).toBeLessThan(implIndex);
      }
    }
  });
});
```

```typescript
// tests/unit/governance/loop-detector.test.ts
import { describe, it, expect } from "vitest";
import { LoopDetector } from "@stupid/core";

describe("LoopDetector", () => {
  it("should detect stagnation when same file edited 3+ times", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);

    // Simulate 3 edits to the same file
    detector.check({ tool: "edit", args: { file_path: "src/app.ts" } });
    detector.check({ tool: "edit", args: { file_path: "src/app.ts" } });
    detector.check({ tool: "edit", args: { file_path: "src/app.ts" } });

    expect(detector.getState()).toBe("stuck");
  });

  it("should detect repeating tool call sequence", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);

    // Simulate repeating sequence: read → edit → bash → read → edit → bash
    const sequence = ["read", "edit", "bash", "read", "edit", "bash",
                      "read", "edit", "bash", "read", "edit", "bash"];

    for (const tool of sequence) {
      detector.check({ tool, args: {} });
    }

    const report = detector.getReport();
    expect(report.isSequenceRepeating).toBe(true);
  });
});
```

```typescript
// tests/unit/memory/project-memory.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ProjectMemory } from "@stupid/core";

describe("ProjectMemory", () => {
  let memory: ProjectMemory;

  beforeEach(() => {
    memory = new ProjectMemory({ stateDir: "/tmp/stupid-test" });
  });

  afterEach(() => {
    memory.close();
  });

  it("should save and retrieve decision records via FTS5 search", async () => {
    await memory.saveDecisionRecord(mockSlice, mockResult);

    const results = await memory.search("authentication OAuth");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sliceName).toBe(mockSlice.name);
  });

  it("should return empty results for unrelated queries", async () => {
    await memory.saveDecisionRecord(mockSlice, mockResult);

    const results = await memory.search("quantum computing blockchain");
    expect(results.length).toBe(0);
  });
});
```

```typescript
// tests/unit/context/compressor.test.ts
import { describe, it, expect } from "vitest";
import { ContextCompressor } from "@stupid/core";

describe("ContextCompressor", () => {
  it("should compress large file reads by ~80%+", () => {
    const compressor = new ContextCompressor({});
    const largeOutput = "import { foo } from 'bar';\n".repeat(200);

    const result = compressor.compress({
      tool: "read",
      output: largeOutput,
    });

    expect(result._compressionRatio).toBeGreaterThan(50);
    expect(result.output.length).toBeLessThan(largeOutput.length * 0.5);
  });

  it("should not compress small outputs", () => {
    const compressor = new ContextCompressor({});
    const smallOutput = "const x = 1;";

    const result = compressor.compress({
      tool: "read",
      output: smallOutput,
    });

    expect(result.output).toBe(smallOutput);
  });
});
```

### Integration Tests

```typescript
// tests/integration/full-workflow.test.ts
import { describe, it, expect } from "vitest";
import { Orchestrator, loadConfig } from "@stupid/core";

describe("Full Workflow Integration", () => {
  it("should complete a simple task end-to-end", async () => {
    const config = loadConfig();
    config.governance.budget.hardLimit = 5; // $5 max for test

    const orchestrator = new Orchestrator(config);

    // Mock the approval to auto-approve
    orchestrator.promptApproval = async () => true;
    orchestrator.promptUser = async () => "yes";

    await orchestrator.run("Add a hello world function to src/utils.ts");

    // Verify state
    const { StateMachine } = await import("@stupid/core");
    const sm = new StateMachine(config);
    const state = await sm.loadState();

    expect(state).not.toBeNull();
    expect(state?.plan?.slices.some((s) => s.status === "completed")).toBe(true);
  });
});
```

---

## 29. Distribution & Publishing

### npm (Primary)

```bash
# Global install
npm install -g stupid

# Use without installing
npx stupid "add feature X"
```

### Pi Package

```bash
# Install as Pi extension
pi install @stupid/pi-extension
```

### Claude Code Plugin

Submit to Anthropic marketplace. Users install via:
```bash
claude plugins install stupid
```

### GitHub Actions

```yaml
# .github/workflows/stupid.yml
name: Stupid Autonomous Task
on:
  issues:
    types: [labeled]

jobs:
  stupid:
    if: contains(github.event.label.name, 'stupid')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install -g stupid
      - run: stupid auto --provider anthropic
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## 30. Roadmap & Milestones

### Week 1-2: Foundation

- [ ] Monorepo setup (turborepo + tsup + vitest)
- [ ] @stupid/core package scaffolding
- [ ] Types definition (all interfaces including new infrastructure types)
- [ ] Configuration system (load, validate, merge + token profiles)
- [ ] Pi SDK integration (createAgentSession)
- [ ] Base agent class + prompt loader
- [ ] Research agent (fork mode, codebase analysis)
- [ ] Implementer agent (spawn mode, fresh context)
- [ ] Activity logger (JSONL to `.stupid/activity/`)
- [ ] Crash recovery (lock file + heartbeat + resume)
- [ ] Orchestrator: single task → single agent → commit
- [ ] CLI: `stupid "hello world"` works end-to-end
- [ ] Unit tests for core modules

### Week 3-4: Agent Team

- [ ] Tester agent (test-first enforcement)
- [ ] Reviewer agent (approve/reject protocol)
- [ ] "Different agent fixes" rule (no self-retry)
- [ ] Architect agent (file structure, API contracts)
- [ ] Spec agent (requirements → technical spec)
- [ ] Finalizer agent (lint, format, commit, PR)
- [ ] Slice runner (test → implement → verify → review → finalize)
- [ ] Multi-slice sequential execution
- [ ] Complexity classifier (task → light/standard/heavy tier)
- [ ] Dynamic model routing + escalation chain
- [ ] CLI: `stupid auto` works (enter to sleep)
- [ ] Unit tests for all agents

### Week 5-6: Memory Engine + Context

- [ ] Session memory (tool output compression)
- [ ] Project memory (SQLite + FTS5)
- [ ] Decision extractor (auto-extract from completed slices)
- [ ] Memory injector (select + format for sub-agents)
- [ ] Context compressor (315KB → 5.4KB)
- [ ] Snapshot builder (priority-tiered ≤2KB XML)
- [ ] File selector (only relevant files per task)
- [ ] Token profiles (budget/balanced/quality inline control)
- [ ] Provider error classification + retry strategies
- [ ] CLI: `stupid recall "query"` works
- [ ] Unit + integration tests for memory

### Week 7-8: Governance + Infrastructure

- [ ] Loop detector (5-state classification)
- [ ] Cost tracker (real-time token × price + cache hit rate)
- [ ] Budget enforcer (soft warning + hard stop + pause modes)
- [ ] Budget pressure routing (downgrade models as budget consumed)
- [ ] Routing history + adaptive learning
- [ ] Quality gate (secrets, file size, AI slop)
- [ ] Git worktree manager (3 isolation modes)
- [ ] Atomic commits per task (git bisect support)
- [ ] Doctor system (13+ health checks + auto-fix)
- [ ] Capture manager + steer command
- [ ] CLI: `stupid status`, `stupid cost`, `stupid prefs`, `stupid doctor`
- [ ] Unit + integration tests for governance

### Week 9-10: Advanced Features

- [ ] Wave scheduler (parallel task execution)
- [ ] Headless mode (CI/CD non-interactive, exponential backoff)
- [ ] HTML report generator (self-contained reports)
- [ ] Terminal visualization (`stupid visualize`)
- [ ] Quick mode (`stupid quick "small fix"`)
- [ ] AGENTS.md auto-generation
- [ ] MCP server exposure
- [ ] CLI: `stupid headless auto`, `stupid export --html`, `stupid capture`
- [ ] Integration tests for advanced features

### Week 11-12: Launch

- [ ] Pi extension package
- [ ] npm publish (stupid + @stupid/core + @stupid/pi-extension)
- [ ] Claude Code plugin packaging
- [ ] README with demo GIF
- [ ] Documentation site (docs/)
- [ ] Dogfooding on real project (run Stupid on itself)
- [ ] Blog post: "I Gave My Agent a Task at 11pm. By 7am, 47 Tests Were Passing."
- [ ] Show HN + Reddit + DEV Community + X launch
- [ ] Marketplace submissions (Anthropic, Pi)

---

## 31. File-by-File Implementation Guide

### Complete File Tree with Description

```
stupid/
│
├── package.json                          # Workspace root
├── turbo.json                            # Build orchestration
├── tsconfig.base.json                    # Shared TypeScript config
├── LICENSE                               # MIT license
├── README.md                             # Project README with demo GIF
├── .gitignore                            # Node + .stupid/ + dist/
├── .github/
│   └── workflows/
│       ├── ci.yml                        # PR checks: lint + test + build
│       └── release.yml                   # Auto-publish on version tag
│
├── packages/
│   ├── core/
│   │   ├── package.json                  # @stupid/core deps
│   │   ├── tsconfig.json                 # Extends base, outDir: dist
│   │   └── src/
│   │       ├── index.ts                  # ★ Public API exports
│   │       │
│   │       ├── types/
│   │       │   └── index.ts              # ★ All TypeScript interfaces
│   │       │
│   │       ├── orchestrator/
│   │       │   ├── orchestrator.ts       # ★ Lead agent (never writes code)
│   │       │   ├── task-planner.ts       # ★ Decompose: milestone→slice→task
│   │       │   ├── task-router.ts        # ★ Model selection per phase
│   │       │   └── result-aggregator.ts  # ★ Merge sub-agent results
│   │       │
│   │       ├── agents/
│   │       │   ├── base-agent.ts         # ★ Abstract base class
│   │       │   ├── agent-factory.ts      # ★ Create sub-agents by role
│   │       │   ├── prompt-loader.ts      # ★ Load markdown prompt templates
│   │       │   ├── research.ts           # ★ Codebase analysis (fork mode)
│   │       │   ├── spec.ts               # ★ Requirements → spec
│   │       │   ├── architect.ts          # ★ Solution design
│   │       │   ├── tester.ts             # ★ Test-first writer
│   │       │   ├── implementer.ts        # ★ Code writer (spawn mode)
│   │       │   ├── reviewer.ts           # ★ Code review (approve/reject)
│   │       │   └── finalizer.ts          # ★ Lint + format + commit + PR
│   │       │
│   │       ├── memory/
│   │       │   ├── project-memory.ts     # ★ Cross-session SQLite+FTS5
│   │       │   ├── session-memory.ts     # ★ In-session compression
│   │       │   ├── decision-extractor.ts # ★ Auto-extract from results
│   │       │   └── memory-injector.ts    # ★ Format memory for injection
│   │       │
│   │       ├── context/
│   │       │   ├── compressor.ts         # ★ Tool output compression (98%)
│   │       │   ├── file-selector.ts      # ★ Relevant files only
│   │       │   └── snapshot-builder.ts   # ★ Priority-tiered XML ≤2KB
│   │       │
│   │       ├── governance/
│   │       │   ├── loop-detector.ts      # ★ 5-state loop classification
│   │       │   ├── cost-tracker.ts       # ★ Real-time token×price with cache tracking
│   │       │   ├── budget-enforcer.ts    # ★ Soft/hard budget limits (warn|pause|halt)
│   │       │   ├── quality-gate.ts       # ★ Pre-commit quality checks
│   │       │   └── provider-retry.ts     # ★ Provider error classification & retry
│   │       │
│   │       ├── infrastructure/
│   │       │   ├── crash-recovery.ts     # ★ Lock file + crash detection + resume
│   │       │   ├── doctor.ts             # ★ Health checks + auto-fix
│   │       │   ├── headless.ts           # ★ Non-interactive CI/CD execution
│   │       │   ├── worktree-manager.ts   # ★ Git worktree isolation (3 modes)
│   │       │   ├── activity-logger.ts    # ★ JSONL activity logging
│   │       │   ├── captures.ts           # ★ Thought capture + triage
│   │       │   ├── steer.ts              # ★ Mid-execution steering
│   │       │   ├── token-profiles.ts     # ★ Budget/balanced/quality profiles
│   │       │   ├── report-generator.ts   # ★ HTML report generation
│   │       │   ├── mcp-server.ts         # ★ MCP server exposure
│   │       │   ├── agents-md-generator.ts # ★ AGENTS.md auto-generation
│   │       │   └── wave-scheduler.ts     # ★ Parallel task wave scheduling
│   │       │
│   │       ├── workflow/
│   │       │   ├── state-machine.ts      # ★ File-based state (.stupid/)
│   │       │   ├── slice-runner.ts       # ★ Execute tasks in slice (wave-aware)
│   │       │   ├── test-runner.ts        # ★ Run and parse test output
│   │       │   └── pr-builder.ts         # ★ Git branch + commit + PR
│   │       │
│   │       ├── orchestrator/
│   │       │   ├── ...                   # (existing orchestrator files)
│   │       │   ├── complexity-classifier.ts # ★ Task complexity → tier mapping
│   │       │   └── routing-history.ts    # ★ Adaptive routing with learning
│   │       │
│   │       └── config/
│   │           └── config.ts             # ★ Load + validate + merge config
│   │
│   ├── cli/
│   │   ├── package.json                  # stupid binary
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── cli.ts                    # ★ Entry point (commander)
│   │       ├── commands/
│   │       │   ├── run.ts                # ★ stupid "task"
│   │       │   ├── auto.ts               # ★ stupid auto
│   │       │   ├── quick.ts              # ★ stupid quick "small fix"
│   │       │   ├── plan.ts               # ★ stupid plan "task"
│   │       │   ├── recall.ts             # ★ stupid recall "query"
│   │       │   ├── steer.ts              # ★ stupid steer "new direction"
│   │       │   ├── capture.ts            # ★ stupid capture "thought"
│   │       │   ├── doctor.ts             # ★ stupid doctor
│   │       │   ├── headless.ts           # ★ stupid headless auto|query
│   │       │   ├── export.ts             # ★ stupid export --html
│   │       │   ├── visualize.ts          # ★ stupid visualize
│   │       │   ├── status.ts             # ★ stupid status
│   │       │   ├── cost.ts               # ★ stupid cost
│   │       │   ├── prefs.ts              # ★ stupid prefs
│   │       │   ├── init.ts               # ★ stupid init
│   │       │   ├── resume.ts             # ★ stupid resume
│   │       │   └── mcp-server.ts         # ★ stupid mcp-server
│   │       ├── ui/
│   │       │   ├── plan-display.ts       # Plan approval UI
│   │       │   ├── progress-display.ts   # Real-time progress
│   │       │   └── cost-display.ts       # Cost report formatting
│   │       └── updater.ts                # Auto-update check
│   │
│   └── pi-extension/
│       ├── package.json                  # @stupid/pi-extension
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # ★ Pi extension entry
│           ├── commands.ts               # ★ Slash commands
│           └── hooks.ts                  # ★ Lifecycle event handlers
│
├── prompts/                              # Agent prompt templates
│   ├── orchestrator.md                   # ★ Lead agent system prompt
│   ├── research.md                       # ★ Research agent prompt
│   ├── spec.md                           # ★ Spec agent prompt
│   ├── architect.md                      # ★ Architect agent prompt
│   ├── tester.md                         # ★ Tester agent prompt
│   ├── implementer.md                    # ★ Implementer agent prompt
│   ├── reviewer.md                       # ★ Reviewer agent prompt
│   └── finalizer.md                      # ★ Finalizer agent prompt
│
├── skills/                               # Pi skills
│   ├── stupid-run/
│   │   └── SKILL.md
│   ├── stupid-auto/
│   │   └── SKILL.md
│   └── stupid-recall/
│       └── SKILL.md
│
├── tests/
│   ├── unit/
│   │   ├── orchestrator/
│   │   │   ├── task-planner.test.ts
│   │   │   ├── task-router.test.ts
│   │   │   └── result-aggregator.test.ts
│   │   ├── agents/
│   │   │   ├── agent-factory.test.ts
│   │   │   └── research.test.ts
│   │   ├── memory/
│   │   │   ├── project-memory.test.ts
│   │   │   ├── session-memory.test.ts
│   │   │   └── decision-extractor.test.ts
│   │   ├── context/
│   │   │   ├── compressor.test.ts
│   │   │   └── file-selector.test.ts
│   │   ├── governance/
│   │   │   ├── loop-detector.test.ts
│   │   │   ├── cost-tracker.test.ts
│   │   │   ├── budget-enforcer.test.ts
│   │   │   └── quality-gate.test.ts
│   │   └── workflow/
│   │       ├── state-machine.test.ts
│   │       └── test-runner.test.ts
│   ├── integration/
│   │   └── full-workflow.test.ts
│   └── fixtures/
│       ├── mock-config.ts
│       ├── mock-agent-results.ts
│       └── mock-research-data.ts
│
└── docs/
    ├── getting-started.md
    ├── architecture.md
    ├── configuration.md
    ├── agents.md
    ├── memory.md
    ├── governance.md
    └── contributing.md
```

### .gitignore

```
node_modules/
dist/
.stupid/state.json
.stupid/auto.lock
.stupid/activity/
.stupid/worktrees/
.stupid/metrics.json
.stupid/routing-history.json
.stupid/completed-units.json
.stupid/CAPTURES.md
.stupid/STEER.md
*.db
*.db-journal
.env
.env.local
coverage/
.turbo/

# Keep these in git:
# .stupid/config.yml (project config)
# .stupid/STATE.md (human-readable state - optional)
# AGENTS.md (auto-generated agent instructions)
```

---

## Appendix A: TypeScript Types

### packages/core/src/types/index.ts

```typescript
// =============================================================================
// Stupid Types — All shared TypeScript interfaces
// =============================================================================

// ─── Configuration ─────────────────────────────────────────────────

export type TokenProfile = 'budget' | 'balanced' | 'quality';

export interface StupidConfig {
  stateDir: string;
  provider: string;
  tokenProfile: TokenProfile;
  modelRouting: ModelRoutingConfig;
  memory: MemoryConfig;
  context: ContextConfig;
  governance: GovernanceConfig;
  testCommand: string;
  lintCommand: string;
  git: GitConfig;
  headless: HeadlessConfig;
  activityLogging: boolean;
  agentsMdGeneration: boolean;
}

export interface ModelRoutingConfig {
  defaultModel: string;
  dynamicRouting: boolean;
  budgetPressure: boolean;
  adaptiveLearning: boolean;
  escalateOnFailure: boolean;
  tierModels: Record<ComplexityTier, string>;
  overrides: Record<string, { provider: string; model: string }>;
}

export type ComplexityTier = 'light' | 'standard' | 'heavy';

export interface MemoryConfig {
  enabled: boolean;
  maxRecordsPerQuery: number;
  maxTokensPerInjection: number;
}

export interface ContextConfig {
  compressionEnabled: boolean;
  maxSnapshotSize: number;
}

export interface GovernanceConfig {
  budget: BudgetConfig;
  loopDetection: LoopDetectionConfig;
  qualityGate: QualityGateConfig;
}

export interface BudgetConfig {
  softLimit: number;
  hardLimit: number;
  perTaskLimit: number;
  enforcement: 'warn' | 'pause' | 'halt';
}

export interface LoopDetectionConfig {
  enabled: boolean;
  fileEditThreshold: number;
  errorRepeatThreshold: number;
}

export interface QualityGateConfig {
  enabled: boolean;
  maxFileSize: number;
  checkSecrets: boolean;
  checkAISlop: boolean;
}

export interface GitConfig {
  strategy: 'worktree' | 'branch' | 'none';
  autoCommit: boolean;
  atomicTaskCommits: boolean;
  autoPR: boolean;
  branchPrefix: string;
}

export interface HeadlessConfig {
  timeout: number;
  maxRetries: number;
  backoffBase: number;
  backoffMax: number;
}

// ─── Infrastructure Types ─────────────────────────────────────────

export type ActivityEventType =
  | 'session_start' | 'session_end'
  | 'plan_created' | 'plan_approved'
  | 'slice_start' | 'slice_complete' | 'slice_failed'
  | 'task_start' | 'task_complete' | 'task_failed'
  | 'agent_spawn' | 'agent_result'
  | 'model_escalation'
  | 'budget_warning' | 'budget_exceeded'
  | 'loop_detected'
  | 'crash_detected' | 'crash_recovered'
  | 'steer_received' | 'capture_added'
  | 'commit_created' | 'pr_created'
  | 'error' | 'provider_error' | 'provider_retry'
  | 'wave_start' | 'wave_complete'
  | 'worktree_created' | 'worktree_merged';

export interface ActivityEvent {
  type: ActivityEventType;
  timestamp: string;
  sessionId: string;
  data: Record<string, any>;
}

export type CaptureClassification =
  | 'quick-task' | 'inject' | 'defer' | 'replan' | 'note';

export interface Capture {
  id: string;
  text: string;
  timestamp: string;
  classification?: CaptureClassification;
  processed: boolean;
}

export type ErrorCategory =
  | 'rate_limit' | 'server_error' | 'auth_error'
  | 'context_limit' | 'timeout' | 'network' | 'unknown';

export interface RoutingRecord {
  taskType: string;
  tier: ComplexityTier;
  model: string;
  success: boolean;
  tokens: number;
  cost: number;
  timestamp: string;
}

// ─── Agent Types ───────────────────────────────────────────────────

export type AgentRole =
  | "research"
  | "spec"
  | "architect"
  | "tester"
  | "implementer"
  | "reviewer"
  | "finalizer";

export interface AgentResult {
  success: boolean;
  summary: string;
  tokensUsed?: number;
  duration?: number;
  error?: string;
  failureReason?: string;
  data?: Record<string, any>;
}

export interface SubAgentSpawnOptions {
  model: { provider: string; model: string };
  input: any;
  memoryRecords?: ProjectMemoryRecord[];
}

// ─── Plan Types ────────────────────────────────────────────────────

export interface PlanSpec {
  id: string;
  task: string;
  milestone: {
    description: string;
    successCriteria: string[];
  };
  slices: SliceSpec[];
  architecture: AgentResult;
  estimatedTasks: number;
  estimatedCost: number;
  estimatedMinutes: number;
  estimatedTests: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: string;
  prUrl?: string;
}

export interface SliceSpec {
  id: string;
  name: string;
  order: number;
  tasks: TaskSpec[];
  dependencies: string[];
  status: "pending" | "in_progress" | "completed" | "failed" | "needs_human";
  retryCount: number;
  model?: string;
  modelOverride?: { provider: string; model: string };
  architecture?: AgentResult;
  sessionId?: string;
  testsPassing?: number;
}

export interface TaskSpec {
  id: string;
  name: string;
  role: AgentRole;
  input: any;
  expectedOutput: string;
  requiredFiles: string[];
  status: string;
}

// ─── Memory Types ──────────────────────────────────────────────────

export interface ProjectMemoryRecord {
  id: string;
  sessionId: string;
  sliceName: string;
  date: string;
  summary: string;
  decisions: string[];
  patterns: any[];
  bugs: any[];
  filesChanged: string[];
  testsAdded: number;
  cost: number;
  model: string;
}

export interface DecisionRecord extends ProjectMemoryRecord {}

// ─── Session Types ─────────────────────────────────────────────────

export interface SessionState {
  sessionId: string;
  plan: PlanSpec | null;
  currentSlice: SliceSpec | null;
  currentTask: TaskSpec | null;
  startedAt: string;
  totalSlices: number;
  activeFiles: string[];
  decisions: string[];
  recentErrors: string[];
  testResults: { passing: number; failing: number } | null;
  totalCost?: number;
  elapsedMinutes?: number;
}

// ─── Governance Types ──────────────────────────────────────────────

export type LoopState =
  | "productive"
  | "stagnating"
  | "stuck"
  | "failing"
  | "recovering";

export interface CostEntry {
  phase: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  cost: number;
  cacheHitRate: number;   // Percentage of input tokens from cache
  duration: number;        // Wall-clock ms
  toolInvocations: number;
  timestamp: string;
  sliceId?: string;
  taskId?: string;
}

export interface GovernanceReport {
  loopState: LoopState;
  totalCost: number;
  budgetRemaining: number;
  qualityGatePassed: boolean;
  issues: string[];
}
```

---

## Appendix B: Prompt Templates

### prompts/research.md

```markdown
# Research Agent — Stupid

You are the Research Agent in a Stupid autonomous coding session. Your job is to analyze the codebase and prepare context for other agents.

## Your Task

{{TASK}}

## Instructions

1. **Scan the project structure**: Run `ls`, read `package.json`, `tsconfig.json`, and key config files
2. **Identify existing patterns**: How is the codebase organized? What naming conventions? What testing patterns?
3. **Find relevant files**: Which files will be affected by this task? Which files should the Implementer read?
4. **Identify constraints**: Dependencies, environment variables, migrations, breaking changes
5. **Generate clarification questions**: What does the user need to answer that you can't find in the code?

## Past Decisions (from project memory)

{{MEMORY}}

## Output Format

Return a JSON block with this structure:

```json
{
  "summary": "Brief summary of findings",
  "fileTree": ["list", "of", "key", "directories"],
  "patterns": [
    { "type": "architecture", "description": "Description of pattern", "fileExample": "path/to/example" }
  ],
  "relevantFiles": ["path/to/file1.ts", "path/to/file2.ts"],
  "constraints": ["constraint 1", "constraint 2"],
  "clarificationQuestions": [
    { "key": "unique_key", "question": "What should X be?", "options": ["option1", "option2"] }
  ],
  "existingTests": ["path/to/test1.test.ts"],
  "dependencies": ["package1", "package2"]
}
```

## Rules

- Be thorough but efficient — don't read files unnecessarily
- Focus on files relevant to the task
- Note any potential conflicts or breaking changes
- If you find existing similar implementations, note them as patterns
```

### prompts/implementer.md

```markdown
# Implementer Agent — Stupid

You are the Implementer Agent in a Stupid autonomous coding session. Your job is to write code that passes the tests written by the Tester Agent.

## Your Task

{{TASK}}

## Files to Read

{{FILES}}

## Past Decisions (from project memory)

{{MEMORY}}

## Instructions

1. **Read the test files first** — understand what behavior is expected
2. **Read the required source files** — understand existing patterns
3. **Write implementation code** that passes all tests
4. **Follow existing patterns** — match naming conventions, architecture, style
5. **Run the tests** to verify they pass
6. **Run the linter** to verify code quality

## Output Format

Return a JSON block with:

```json
{
  "summary": "What was implemented",
  "filesChanged": ["path/to/changed/file.ts"],
  "filesCreated": ["path/to/new/file.ts"],
  "testsPassing": true,
  "testOutput": "Test output summary",
  "lintPassing": true
}
```

## Rules

- NEVER modify test files — they define expected behavior
- Follow existing code patterns exactly
- No `console.log` debugging statements in final code
- No `any` types in TypeScript — use proper types
- If tests fail after 3 attempts, return success: false with explanation
```

### prompts/reviewer.md

```markdown
# Reviewer Agent — Stupid

You are the Reviewer Agent in a Stupid autonomous coding session. Your job is to review code quality, security, and pattern consistency.

## Your Task

Review the following changes:

{{TASK}}

## Files to Review

{{FILES}}

## Past Decisions (from project memory)

{{MEMORY}}

## Review Checklist

1. **Security**: No hardcoded secrets, no SQL injection, no XSS, proper input validation
2. **Pattern Consistency**: Does this code follow established project patterns?
3. **Error Handling**: Are errors properly caught and handled?
4. **Type Safety**: No `any` types, proper null checks
5. **Test Coverage**: Are the tests meaningful? Do they cover edge cases?
6. **Code Quality**: No dead code, no unnecessary complexity, clear naming

## Output Format

Return a JSON block with:

```json
{
  "decision": "approve" | "reject",
  "reason": "Why approved or rejected",
  "issues": [
    { "severity": "error|warning|info", "file": "path", "line": 42, "message": "Description" }
  ],
  "securityConcerns": ["concern 1"],
  "patternViolations": ["violation 1"],
  "suggestions": ["suggestion 1"]
}
```

## Rules

- Be strict on security — reject if any security concern
- Be reasonable on style — suggest but don't reject for minor style differences
- Check that implementation matches the test expectations
- Verify no test files were modified by the implementer
```

---

*This document contains the complete blueprint for Stupid. Every file, every interface, every function, every workflow is specified — including crash recovery, headless mode, token profiles, git worktree isolation, wave-based parallelism, activity logging, thought captures, provider retry strategies, HTML reports, MCP server exposure, AGENTS.md generation, and adaptive model routing. An LLM with access to this document and the Pi SDK documentation can implement the full project.*