import { readdirSync, readFileSync, statSync, type Dirent } from "node:fs";
import { join, relative, extname } from "node:path";
import type { TaskSpec } from "../types/index.js";
import type { IFileSelector } from "../orchestrator/interfaces.js";

// ─── Constants ───────────────────────────────────────────────

/** Directories excluded from project walking. */
const DEFAULT_EXCLUDE = [
  "node_modules",
  "dist",
  ".git",
  ".stupid",
  "coverage",
  ".turbo",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  ".vscode",
  ".idea",
  "__pycache__",
  ".svelte-kit",
];

/** File extensions included in the walk. */
const DEFAULT_INCLUDE_EXT = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".html",
  ".vue",
  ".svelte",
];

/** English stop words stripped during keyword extraction. */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "to",
  "for",
  "of",
  "in",
  "on",
  "with",
  "and",
  "or",
  "it",
  "this",
  "that",
  "be",
  "are",
  "was",
  "were",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "not",
  "but",
  "if",
  "then",
  "so",
  "as",
  "at",
  "by",
  "from",
  "into",
  "about",
  "between",
  "through",
  "after",
  "before",
  "above",
  "below",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "each",
  "every",
  "all",
  "any",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "only",
  "same",
  "than",
  "too",
  "very",
  "just",
  "also",
  "now",
  "new",
  "add",
  "create",
  "make",
  "build",
  "implement",
  "update",
  "fix",
  "remove",
  "delete",
  "get",
  "set",
  "use",
  "write",
  "read",
]);

/** Maximum bytes to read from each file for content scoring. */
const MAX_READ_BYTES = 10_240; // 10KB

/** Hard cap on number of files walked (safety valve for huge repos). */
const MAX_WALK_FILES = 500;

// ─── FileSelector ────────────────────────────────────────────

/**
 * Analyzes task descriptions to find project files most relevant
 * to the work being done. Used by Orchestrator and SliceRunner
 * to inject context into sub-agent prompts.
 *
 * Observable signals:
 * - `selectFiles()` logs keyword count, files walked, files scored >0, and final result count
 * - Returns relative paths from `projectRoot` for portability
 * - Falls back to recently-modified files when keyword matching yields <3 results
 */
export class FileSelector implements IFileSelector {
  // ── Keyword Extraction ───────────────────────────────────

  /**
   * Tokenize text into meaningful keywords.
   * Splits on whitespace/punctuation, lowercases, removes stop words
   * and words ≤2 chars, deduplicates.
   */
  static extractKeywords(text: string): string[] {
    if (!text || !text.trim()) return [];

    const tokens = text
      .toLowerCase()
      .split(/[\s\-_/\\.,;:!?'"()\[\]{}<>|@#$%^&*+=~`]+/)
      .filter((t) => t.length > 2)
      .filter((t) => !STOP_WORDS.has(t));

    return [...new Set(tokens)];
  }

  // ── Project Walking ──────────────────────────────────────

  /**
   * Recursively walk `projectRoot`, returning relative file paths.
   * Excludes directories matching `excludePatterns` (defaults to common
   * non-source dirs) and includes only files with allowed extensions.
   * Capped at MAX_WALK_FILES to bound memory on large repos.
   */
  static walkProject(
    projectRoot: string,
    excludePatterns?: string[],
  ): string[] {
    const exclude = new Set(excludePatterns ?? DEFAULT_EXCLUDE);
    const results: string[] = [];

    const walk = (dir: string): void => {
      if (results.length >= MAX_WALK_FILES) return;

      let entries: Dirent[];
      try {
        entries = readdirSync(dir, { withFileTypes: true }) as Dirent[];
      } catch {
        // Directory missing or unreadable — skip silently
        return;
      }

      for (const entry of entries) {
        if (results.length >= MAX_WALK_FILES) return;

        if (entry.isDirectory()) {
          if (!exclude.has(entry.name)) {
            walk(join(dir, entry.name));
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (DEFAULT_INCLUDE_EXT.includes(ext)) {
            results.push(relative(projectRoot, join(dir, entry.name)));
          }
        }
      }
    };

    walk(projectRoot);
    return results;
  }

  // ── File Scoring ─────────────────────────────────────────

  /**
   * Score a file by keyword relevance.
   *
   * Weights:
   * - Path keyword hit:     +5 per keyword (file path often mirrors intent)
   * - Content keyword hit:  +2 per keyword
   * - Source file bonus:     +1 for `.ts` / `.tsx` (most likely edit targets)
   * - Test file bonus:       +3 when path contains `test` and any keyword matches
   */
  static scoreFile(
    filePath: string,
    content: string,
    keywords: string[],
  ): number {
    let score = 0;
    const pathLower = filePath.toLowerCase();
    const contentLower = content.toLowerCase();

    let anyMatch = false;

    for (const kw of keywords) {
      if (pathLower.includes(kw)) {
        score += 5;
        anyMatch = true;
      }
      if (contentLower.includes(kw)) {
        score += 2;
        anyMatch = true;
      }
    }

    // Source file bonus — only when at least one keyword matched
    if (anyMatch) {
      const ext = extname(filePath).toLowerCase();
      if (ext === ".ts" || ext === ".tsx") {
        score += 1;
      }

      // Test file bonus — stacks on top of keyword matches
      if (pathLower.includes("test") || pathLower.includes("spec")) {
        score += 3;
      }
    }

    return score;
  }

  // ── Main Entry Point ─────────────────────────────────────

  /**
   * Select the most relevant project files for a given task.
   *
   * Accepts a plain description string or a `TaskSpec` (extracts `.description`).
   * Returns relative paths sorted by relevance, capped at `maxFiles`.
   *
   * Falls back to recently-modified files when keyword scoring yields <3 results.
   */
  async selectFiles(
    taskOrDescription: string | TaskSpec,
    projectRoot: string,
    maxFiles: number = 15,
  ): Promise<string[]> {
    const description =
      typeof taskOrDescription === "string"
        ? taskOrDescription
        : taskOrDescription.description;

    const keywords = FileSelector.extractKeywords(description);
    const files = FileSelector.walkProject(projectRoot);

    if (files.length === 0) return [];

    // Score each file
    const scored: Array<{ path: string; score: number }> = [];
    for (const filePath of files) {
      const absPath = join(projectRoot, filePath);
      let content = "";
      try {
        const buf = Buffer.alloc(MAX_READ_BYTES);
        const fd = readFileSync(absPath);
        content = fd.subarray(0, MAX_READ_BYTES).toString("utf-8");
      } catch {
        // Unreadable file — skip scoring, still in candidate pool
      }
      const score = FileSelector.scoreFile(filePath, content, keywords);
      if (score > 0) {
        scored.push({ path: filePath, score });
      }
    }

    // If keyword scoring produced enough results, return ranked
    if (scored.length >= 3) {
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, maxFiles).map((s) => s.path);
    }

    // Fallback: recently-modified files
    return this.recentlyModifiedFallback(projectRoot, files, maxFiles);
  }

  // ── Fallback Strategy ────────────────────────────────────

  /**
   * When keyword scoring yields too few results, fall back to
   * the most recently modified files in the project.
   */
  private recentlyModifiedFallback(
    projectRoot: string,
    files: string[],
    maxFiles: number,
  ): string[] {
    const timed: Array<{ path: string; mtime: number }> = [];
    for (const filePath of files) {
      try {
        const stat = statSync(join(projectRoot, filePath));
        timed.push({ path: filePath, mtime: stat.mtimeMs });
      } catch {
        // skip unreadable
      }
    }
    timed.sort((a, b) => b.mtime - a.mtime);
    return timed.slice(0, maxFiles).map((t) => t.path);
  }
}
