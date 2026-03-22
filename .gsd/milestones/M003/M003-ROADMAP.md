# M003 Roadmap: Authentication & Interactive TUI

## Slices

- [x] **S01: Auth storage and onboarding wizard** `risk:medium` `depends:[]`
  Bootstrap `AuthStorage` + `ModelRegistry` + `SettingsManager` in CLI. Create first-run onboarding wizard using `@clack/prompts`: provider selection → OAuth browser login or API key paste → credential persistence to `~/.stupid/auth.json`. Wire `shouldRunOnboarding()` check into CLI entry point. Ensure `stupid "task"` still works with env-var auth (backward compat).

- [x] **S02: Interactive TUI mode** `risk:high` `depends:[S01]`
  Wire Pi SDK `InteractiveMode` into `stupid` CLI. When no task argument is given and auth is available, create an `AgentSession` with full tool set (codingTools), `SessionManager` for persistence, and launch `InteractiveMode.run()`. Add `--continue`/`-c` flag for session resume, `stupid sessions` for listing past sessions, and welcome screen. Ensure the orchestrator's existing tools/prompts are available inside the interactive session.

- [x] **S03: Auth integration tests and e2e gate fix** `risk:low` `depends:[S01]`
  Update e2e integration test skip gate to accept `ANTHROPIC_OAUTH_TOKEN || ANTHROPIC_API_KEY`. Add unit tests for auth storage initialization, onboarding skip logic, and model registry availability. Verify `stupid --help` still shows all commands correctly.
