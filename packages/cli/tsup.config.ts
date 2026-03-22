import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Don't bundle dependencies — resolve from node_modules at runtime.
  // Required because some deps (inquirer, chalk, ora) have CJS internals
  // that break when bundled as ESM.
  external: [
    "commander",
    "chalk",
    "ora",
    "inquirer",
    "@inquirer/prompts",
    "boxen",
    "update-notifier",
    "yaml",
    "better-sqlite3",
    "zod",
    "@serhatsayat/stupid-core",
    "@mariozechner/pi-coding-agent",
    "@mariozechner/pi-ai",
    "@mariozechner/pi-tui",
    "@mariozechner/pi-agent-core",
    "@clack/prompts",
  ],
});
