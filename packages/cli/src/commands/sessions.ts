/**
 * `stupid sessions` — list past interactive sessions for the current directory.
 *
 * Reads session files from `~/.stupid/agent/sessions/<encoded-cwd>/` using
 * Pi SDK's `SessionManager.list()` and prints a formatted summary table.
 *
 * Observability:
 * - Uses `getSessionDir()` from interactive.ts (same path-encoding as session creation)
 * - Empty session directory prints a friendly "No sessions found" message and returns
 * - Sessions sorted by modified date descending (most recent first)
 * - Each session line shows: ID (dim), first message preview (cyan, truncated), timestamp (dim), message count (dim)
 *
 * @module
 */

import { SessionManager, type SessionInfo } from "@mariozechner/pi-coding-agent";
import { getSessionDir } from "../interactive.js";
import chalk from "chalk";

/**
 * Truncate a string to a maximum length, appending "…" if truncated.
 * Strips newlines for single-line display.
 */
function truncate(text: string, maxLen: number): string {
  const clean = text.replace(/\n/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1) + "…";
}

/**
 * Format a Date as a human-readable relative or absolute timestamp.
 * Recent sessions show relative time ("2 hours ago"), older ones show date.
 */
function formatTimestamp(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

/**
 * List past interactive sessions for the current working directory.
 *
 * Reads from `~/.stupid/agent/sessions/<encoded-cwd>/` and prints a
 * sorted list to stdout. Handles empty directories gracefully.
 */
export async function sessionsCommand(): Promise<void> {
  const cwd = process.cwd();
  const sessionDir = getSessionDir(cwd);

  let sessions: SessionInfo[];
  try {
    sessions = await SessionManager.list(cwd, sessionDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Failed to list sessions: ${message}`));
    process.exitCode = 1;
    return;
  }

  if (sessions.length === 0) {
    console.log(chalk.dim("No sessions found for this directory."));
    console.log(chalk.dim(`Start one with: ${chalk.bold("stupid")}`));
    return;
  }

  // Sort by modified date descending (most recent first)
  sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());

  console.log(chalk.bold(`Sessions (${sessions.length}):\n`));

  for (const session of sessions) {
    const id = chalk.dim(session.id.slice(0, 8));
    const preview = session.firstMessage
      ? chalk.cyan(truncate(session.firstMessage, 60))
      : chalk.dim("(empty session)");
    const time = chalk.dim(formatTimestamp(session.modified));
    const count = chalk.dim(`${session.messageCount} msg${session.messageCount !== 1 ? "s" : ""}`);

    console.log(`  ${id}  ${preview}  ${time}  ${count}`);
  }
}
