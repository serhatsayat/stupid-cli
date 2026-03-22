# M007: Reports, MCP Server & AGENTS.md

## Goal

Add visibility and integration features: HTML reports for completed sessions, MCP server for external tool consumption, and automatic AGENTS.md generation from project memory.

## Constraints

- HTML reports must be self-contained single files (no external deps)
- MCP server follows Model Context Protocol spec
- AGENTS.md reflects actual project patterns, not boilerplate

## Key Components

1. **HTMLReportGenerator** — produces self-contained HTML report with: cost breakdown (per phase, per slice, per agent), execution timeline (Gantt-style), agent outputs (collapsible), memory records used, quality gate results. CSS/JS inline. `stupid export --html`
2. **TerminalVisualization** — `stupid visualize` shows live progress dashboard: current phase, slice progress bars, cost ticker, active agents.
3. **MCP Server** — `stupid --mode mcp` exposes stupid's capabilities as MCP tools: plan generation, memory search, cost reporting, doctor checks. Runs over stdin/stdout per MCP spec.
4. **AGENTS.md Generator** — scans project memory (decisions, patterns, lessons) and generates an AGENTS.md that describes the project's coding conventions, architecture patterns, and established decisions for other AI tools to consume.

## Success Criteria

1. `stupid export --html` produces a readable, self-contained HTML report
2. `stupid visualize` shows real-time progress in terminal
3. `stupid --mode mcp` starts an MCP server that responds to tool calls
4. `stupid agents` generates AGENTS.md from project memory
5. All existing tests pass

## plan.md References

- §25: HTML Reports & Visualization
- §26: MCP Server Exposure
- §27: AGENTS.md Auto-Generation
