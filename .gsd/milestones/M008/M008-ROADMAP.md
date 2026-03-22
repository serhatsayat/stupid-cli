# M008 Roadmap: Launch & Distribution

## Slices

- [ ] **S01: Pi extension with slash commands** `risk:medium` `depends:[]`
  Wire `@serhatsayat/stupid-pi-extension` to register slash commands inside Pi TUI: `/stupid "task"` (run orchestrator), `/stupid-status` (show session status), `/stupid-recall "query"` (search memory), `/stupid-cost` (show cost report). Extension implements Pi's `ExtensionFactory` interface, loads `@serhatsayat/stupid-core` modules. Ensure `keywords: ["pi-package"]` in package.json. Integration test: extension loads without errors.

- [ ] **S02: GitHub Actions CI/CD** `risk:low` `depends:[]`
  Create `.github/workflows/ci.yml`: trigger on PR, run `npm install`, `npm run build`, `npm run typecheck`, `npm run test` across Node 20+22. Create `.github/workflows/release.yml`: trigger on version tag push (`v*`), build all packages, `npm publish --access public` for each. Use npm automation token from GitHub secrets. Test with a dry-run tag.

- [ ] **S03: README, documentation, and demo** `risk:low` `depends:[S01,S02]`
  Write comprehensive README.md: project overview, installation (`npm i -g stupid-cli`), quick start, configuration reference, authentication guide, command reference, architecture diagram (ASCII), contributing guide. Create docs/ directory with detailed guides. Record demo GIF showing `stupid "add hello world"` end-to-end (or use asciinema). Add LICENSE file (MIT).

- [ ] **S04: Dogfooding and final verification** `risk:low` `depends:[S01,S02,S03]`
  Run `stupid` on a fresh test repository with a real task. Verify full pipeline: auth → plan → approve → execute → commit. Document any issues found. Fix blocking issues. Verify `npm install -g stupid-cli` works on a clean machine (or clean npm prefix). Final smoke test of all CLI commands.
