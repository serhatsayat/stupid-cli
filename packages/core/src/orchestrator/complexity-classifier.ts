import type { TaskSpec, ComplexityTier } from "../types/index.js";
import type { IComplexityClassifier } from "./interfaces.js";

// ─── Signal Keyword Sets ─────────────────────────────────────

const LIGHT_KEYWORDS: readonly string[] = [
  "rename",
  "fix typo",
  "update comment",
  "change value",
  "add import",
  "remove unused",
  "update version",
  "fix spelling",
] as const;

const HEAVY_MULTI_FILE_KEYWORDS: readonly string[] = [
  "refactor",
  "migrate",
  "redesign",
  "across all",
  "every file",
  "throughout",
] as const;

const HEAVY_ARCHITECTURE_KEYWORDS: readonly string[] = [
  "system design",
  "new module",
  "database schema",
  "api design",
  "new architecture",
] as const;

const MULTI_STEP_PATTERNS: readonly RegExp[] = [
  /\bfirst\b.+\bthen\b/i,  // "First do X. Then do Y"
  /step\s*1/i,
  /step\s*2/i,
  /\d+\.\s+\S/,            // numbered list: "1. something"
] as const;

// ─── Thresholds ──────────────────────────────────────────────

const LIGHT_THRESHOLD = -1;
const HEAVY_THRESHOLD = 2;
const LONG_WORD_LIMIT = 150;
const HIGH_FILE_COUNT = 10;
const MAX_LIGHT_KEYWORD_SCORE = -3;
const MAX_HEAVY_MULTI_FILE_SCORE = 3;
const MAX_HEAVY_ARCHITECTURE_SCORE = 2;

// ─── ComplexityClassifier ────────────────────────────────────

/**
 * Signal-based heuristic classifier that scores a task description
 * across light/heavy signal dimensions and buckets into a
 * ComplexityTier.
 *
 * Scoring rules:
 * - Light keywords (each match): -1 (max -3)
 * - Long description (>150 words): +2
 * - Multi-file keywords (each match): +1 (max +3)
 * - Architecture keywords (each match): +1 (max +2)
 * - Multi-step language: +1
 * - High file count in TaskSpec (>10): +2
 *
 * Thresholds: score ≤ -1 → light, score ≥ 2 → heavy, else → standard
 */
export class ComplexityClassifier implements IComplexityClassifier {
  /**
   * Classify a task into a complexity tier.
   *
   * @param task - A plain string description or a TaskSpec object
   * @returns The complexity tier: "light", "standard", or "heavy"
   */
  classify(task: string | TaskSpec): ComplexityTier {
    const description =
      typeof task === "string" ? task : task.description;
    const fileCount =
      typeof task === "object" && task.files ? task.files.length : 0;

    const score = this.computeScore(description, fileCount);

    if (score <= LIGHT_THRESHOLD) return "light";
    if (score >= HEAVY_THRESHOLD) return "heavy";
    return "standard";
  }

  /**
   * Computes the raw complexity score for a description.
   * Exposed for testing/diagnostics.
   */
  private computeScore(description: string, fileCount: number): number {
    let score = 0;
    const lower = description.toLowerCase();
    const wordCount = this.countWords(description);

    // ── Light signals ──────────────────────────────────────
    let lightKeywordHits = 0;
    for (const kw of LIGHT_KEYWORDS) {
      if (lower.includes(kw) && lightKeywordHits < Math.abs(MAX_LIGHT_KEYWORD_SCORE)) {
        lightKeywordHits++;
        score -= 1;
      }
    }

    // ── Heavy signals ──────────────────────────────────────
    if (wordCount > LONG_WORD_LIMIT) {
      score += 2;
    }

    let multiFileHits = 0;
    for (const kw of HEAVY_MULTI_FILE_KEYWORDS) {
      if (lower.includes(kw) && multiFileHits < MAX_HEAVY_MULTI_FILE_SCORE) {
        multiFileHits++;
        score += 1;
      }
    }

    let archHits = 0;
    for (const kw of HEAVY_ARCHITECTURE_KEYWORDS) {
      if (lower.includes(kw) && archHits < MAX_HEAVY_ARCHITECTURE_SCORE) {
        archHits++;
        score += 1;
      }
    }

    // Multi-step language: only +1 total regardless of how many patterns match
    for (const pattern of MULTI_STEP_PATTERNS) {
      if (pattern.test(description)) {
        score += 1;
        break;
      }
    }

    // High file count from TaskSpec
    if (fileCount > HIGH_FILE_COUNT) {
      score += 2;
    }

    return score;
  }

  /**
   * Counts words in a string, splitting on whitespace.
   * Empty/whitespace-only strings return 0.
   */
  private countWords(text: string): number {
    const trimmed = text.trim();
    if (trimmed.length === 0) return 0;
    return trimmed.split(/\s+/).length;
  }
}
