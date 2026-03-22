# M007 Roadmap: Reports, MCP Server & AGENTS.md

## Slices

- [ ] **S01: HTML report generator** `risk:medium` `depends:[]`
  Build `HTMLReportGenerator` class that takes a completed session's data (plan, cost entries, agent results, timeline) and produces a self-contained HTML file. Inline CSS/JS. Sections: executive summary, cost breakdown table, execution timeline (CSS grid), agent outputs (collapsible details), quality gate results, memory records used. CLI command: `stupid export --html [--output report.html]`. Unit tests with fixture data.

- [ ] **S02: Terminal visualization dashboard** `risk:medium` `depends:[]`
  Build `TerminalDashboard` using Pi TUI primitives or ink. Shows: current phase indicator, slice progress bars (done/total tasks), running cost ticker, active agent names, estimated time remaining. CLI command: `stupid visualize` (reads from `.stupid/state.json` in a watch loop). Works alongside running `stupid auto` in another terminal.

- [ ] **S03: MCP server exposure** `risk:high` `depends:[]`
  Implement MCP server transport over stdin/stdout following the Model Context Protocol spec. Expose tools: `stupid_plan` (generate plan from task), `stupid_recall` (search project memory), `stupid_cost` (get cost report), `stupid_doctor` (run health checks), `stupid_status` (get session status). CLI flag: `stupid --mode mcp`. Integration tests with MCP client.

- [ ] **S04: AGENTS.md auto-generation** `risk:low` `depends:[]`
  Build `AgentsGenerator` that queries `ProjectMemory` for decisions, patterns, and lessons learned, then renders a structured AGENTS.md. Sections: project overview, architecture decisions, coding conventions, file structure patterns, known gotchas. CLI command: `stupid agents [--output AGENTS.md]`. Regenerated on demand, not auto-updated. Unit tests with fixture memory data.
