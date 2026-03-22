# M003: Authentication & Interactive TUI

## Goal

Transform `stupid` from a single-shot CLI into an interactive coding assistant with proper authentication. Running `stupid` with no arguments should trigger first-run onboarding (provider selection → OAuth/API key auth) then launch an interactive TUI session — identical UX to GSD/Pi.

## Constraints

- All auth delegated to Pi SDK (`AuthStorage`, `ModelRegistry`, `SettingsManager`) — no custom auth code
- Credentials stored in `~/.stupid/auth.json` (same format as Pi)
- `ANTHROPIC_OAUTH_TOKEN` takes precedence over `ANTHROPIC_API_KEY` (Pi SDK behavior)
- Existing `stupid "task"` single-shot flow must continue working unchanged
- No telemetry, no cloud sync — privacy-first (P6)

## Key Dependencies

- `@mariozechner/pi-coding-agent`: `AuthStorage`, `ModelRegistry`, `InteractiveMode`, `SessionManager`, `SettingsManager`, `createAgentSession`
- `@mariozechner/pi-ai`: `getModel`, `getEnvApiKey`
- `@clack/prompts`: onboarding wizard UI (peer dep of pi-coding-agent)

## Success Criteria

1. `stupid` (no args) → onboarding wizard if no auth → interactive TUI
2. `stupid "task"` → works as before (single-shot orchestrator)
3. OAuth login (Anthropic, GitHub Copilot, OpenAI Codex) works via browser
4. API key paste works for all providers
5. `stupid sessions` lists past sessions
6. `stupid -c` continues most recent session
7. e2e test skip gate accepts both `ANTHROPIC_API_KEY` and `ANTHROPIC_OAUTH_TOKEN`

## plan.md References

- §14: CLI Commands & UX
- §16: Authentication & Providers
