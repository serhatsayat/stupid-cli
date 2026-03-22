/**
 * Composition root for interactive TUI mode.
 *
 * Wires Pi SDK's `createAgentSession()` + `InteractiveMode` with stupid-specific
 * paths and S01's auth exports. This is the bridge between the stupid CLI's auth
 * layer and Pi SDK's full interactive coding agent.
 *
 * Observability:
 * - Session files persist at `~/.stupid/agent/sessions/<encoded-cwd>/`
 * - `createAgentSession()` errors surface via stderr with chalk.red styling
 * - Verbose mode (--verbose flag or VERBOSE/DEBUG env) prints full stack traces
 * - TTY guard in cli.ts prevents entry when stdin is not a terminal
 *
 * @module
 */

import {
  createAgentSession,
  InteractiveMode,
  SessionManager,
  codingTools,
} from "@mariozechner/pi-coding-agent";
import { getAuthStorage, getModelRegistry, getSettingsManager } from "./auth.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import chalk from "chalk";

/**
 * Stupid agent directory — distinct from Pi's default `~/.gsd/agent`.
 * All session data, skills, settings live under this tree.
 */
export const AGENT_DIR = join(homedir(), ".stupid", "agent");

/**
 * Compute the session directory for a given cwd under the stupid agent dir.
 *
 * Replicates Pi SDK's `getDefaultSessionDir()` path-encoding logic
 * (which is not exported from the package's public API) so sessions are
 * stored at `~/.stupid/agent/sessions/<encoded-cwd>/` instead of the
 * default `~/.gsd/agent/sessions/...`.
 *
 * @param cwd - Working directory to encode
 * @returns Absolute path to the session directory (created if missing)
 */
export function getSessionDir(cwd: string): string {
  const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
  const sessionDir = join(AGENT_DIR, "sessions", safePath);
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }
  return sessionDir;
}

/**
 * Launch the interactive TUI coding assistant.
 *
 * Creates an `AgentSession` wired to stupid-specific auth, model registry,
 * and settings, then hands control to Pi SDK's `InteractiveMode` which
 * manages the full TUI lifecycle (rendering, compaction, model cycling).
 *
 * @param options.continue - When true, resumes the most recent session
 *   via `SessionManager.continueRecent()` instead of creating a new one.
 * @param options.verbose - When true, print full stack traces on error.
 */
export async function launchInteractiveMode(
  options: { continue?: boolean; verbose?: boolean } = {},
): Promise<void> {
  const cwd = process.cwd();
  const sessionDir = getSessionDir(cwd);

  const sessionManager = options.continue
    ? SessionManager.continueRecent(cwd, sessionDir)
    : SessionManager.create(cwd, sessionDir);

  try {
    const { session, modelFallbackMessage } = await createAgentSession({
      cwd,
      agentDir: AGENT_DIR,
      authStorage: getAuthStorage(),
      modelRegistry: getModelRegistry(),
      settingsManager: getSettingsManager(),
      sessionManager,
      tools: codingTools,
    });

    // Welcome banner — printed before InteractiveMode takes over the terminal
    console.log(
      chalk.bold("stupid") + chalk.dim(" — interactive mode"),
    );
    if (options.continue) {
      console.log(chalk.dim("Resuming session..."));
    } else {
      console.log(chalk.dim("New session started"));
    }
    console.log(); // blank line before TUI takeover

    const mode = new InteractiveMode(session, { modelFallbackMessage });
    await mode.run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Failed to launch interactive mode: ${message}`));
    if (options.verbose || process.env.VERBOSE || process.env.DEBUG) {
      console.error(error);
    }
    process.exitCode = 1;
  }
}
