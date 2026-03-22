# M008: Launch & Distribution

## Goal

Final polish for public launch: Pi extension packaging, documentation, CI/CD automation, README with demo, and marketplace submissions.

## Constraints

- Pi extension must register as `pi-package` keyword in package.json
- CI must run tests on every PR, auto-publish on version tag
- Documentation must be accurate against actual implemented features
- Demo GIF must show real execution, not staged

## Key Components

1. **Pi Extension** — register stupid's orchestrator as slash commands inside Pi TUI (`/stupid "task"`, `/stupid-status`, `/stupid-recall`). Package with `keywords: ["pi-package"]`.
2. **GitHub Actions CI/CD** — `ci.yml` (lint + test + build + typecheck on PR), `release.yml` (auto-publish all 3 packages to npm on version tag push).
3. **README** — project overview, installation, usage examples, demo GIF, configuration reference, contributing guide.
4. **Documentation site** — docs/ directory with detailed guides: getting started, configuration, authentication, token profiles, commands reference, architecture overview.
5. **Dogfooding** — run stupid on a real project (itself or a test repo) and record results.

## Success Criteria

1. `npm install -g stupid-cli` → `stupid` works end-to-end on a fresh machine
2. Pi extension installable and working inside Pi TUI
3. GitHub Actions CI passes on PR, auto-publishes on tag
4. README has accurate usage examples and working demo
5. docs/ covers all major features

## plan.md References

- §7: Package: @stupid/pi-extension
- §29: Distribution & Publishing
- §30: Roadmap & Milestones
