import type { ProjectMemoryRecord, AgentRole } from "../types/index.js";

/**
 * Formats ProjectMemoryRecord[] into context blocks for sub-agent prompts,
 * filtered by AgentRole relevance and constrained to a token budget.
 *
 * Token estimation: ~4 characters per token (conservative heuristic).
 *
 * Usage: MemoryInjector.format(records, role, maxTokens?) → string
 */
export class MemoryInjector {
  /** Characters per token estimate */
  private static readonly CHARS_PER_TOKEN = 4;

  /**
   * Format memory records into a context string for a given agent role.
   *
   * Records are prioritized by role relevance, then formatted as markdown
   * sections. Output is truncated at the token budget boundary.
   *
   * @param records — memory records to format
   * @param role — agent role for relevance filtering
   * @param maxTokens — token budget (default 500, ~2000 chars)
   * @returns formatted context string, or empty string for empty input
   */
  static format(
    records: ProjectMemoryRecord[],
    role: AgentRole,
    maxTokens = 500,
  ): string {
    if (!records || records.length === 0) return "";

    const sorted = this.prioritize(records, role);
    const maxChars = maxTokens * this.CHARS_PER_TOKEN;

    let output = "";
    for (const record of sorted) {
      const block = this.formatRecord(record);
      if (output.length + block.length > maxChars) {
        // Append partial if we have room for at least a meaningful chunk
        const remaining = maxChars - output.length;
        if (remaining > 40) {
          output += block.slice(0, remaining);
        }
        break;
      }
      output += block;
    }

    return output;
  }

  // ─── Role-Based Prioritization ───────────────────────────

  /**
   * Sort records by role-specific relevance.
   *
   * Each role has preferred categories that get boosted to the top.
   * Within priority tiers, records are sorted by relevance score descending.
   */
  private static prioritize(
    records: ProjectMemoryRecord[],
    role: AgentRole,
  ): ProjectMemoryRecord[] {
    const priorityCategories = this.getPriorityCategories(role);

    return [...records].sort((a, b) => {
      const aPriority = this.getRecordPriority(a, priorityCategories, role);
      const bPriority = this.getRecordPriority(b, priorityCategories, role);

      // Higher priority first
      if (bPriority !== aPriority) return bPriority - aPriority;

      // Within same priority, sort by relevance descending
      return (b.relevance ?? 0) - (a.relevance ?? 0);
    });
  }

  /**
   * Map an agent role to its preferred record categories.
   */
  private static getPriorityCategories(
    role: AgentRole,
  ): ProjectMemoryRecord["category"][] {
    switch (role) {
      case "research" as AgentRole:
        return ["context", "pattern"];
      case "tester" as AgentRole:
        return ["lesson"];
      case "implementer" as AgentRole:
        return ["decision", "pattern"];
      case "reviewer" as AgentRole:
        return ["decision", "pattern", "lesson", "context"];
      default:
        // spec, architect, finalizer — no category preference
        return [];
    }
  }

  /**
   * Compute a numeric priority score for a record given the role's preferences.
   */
  private static getRecordPriority(
    record: ProjectMemoryRecord,
    priorityCategories: ProjectMemoryRecord["category"][],
    role: AgentRole,
  ): number {
    let score = 0;

    // Boost for matching priority category
    if (priorityCategories.includes(record.category)) {
      score += 10;
    }

    // Tester bonus: records with bugs are always relevant
    if (role === ("tester" as AgentRole) && record.bugs && record.bugs.length > 0) {
      score += 5;
    }

    // Reviewer bonus: high-relevance records
    if (role === ("reviewer" as AgentRole) && (record.relevance ?? 0) >= 0.7) {
      score += 3;
    }

    return score;
  }

  // ─── Record Formatting ───────────────────────────────────

  /**
   * Format a single record as a markdown block.
   *
   * Rich records (with sliceName, decisions, patterns) get a detailed format.
   * Simple records get a compact format.
   */
  private static formatRecord(record: ProjectMemoryRecord): string {
    // Rich format for records with slice-level detail
    if (record.sliceName || (record.decisions && record.decisions.length > 0)) {
      return this.formatRichRecord(record);
    }

    // Compact format
    return `## [${record.category}] (${record.source})\n${record.content}\n\n`;
  }

  /**
   * Format a record with full slice-level detail.
   */
  private static formatRichRecord(record: ProjectMemoryRecord): string {
    const header = record.sliceName
      ? `## [${record.sliceName}] (${record.date ?? record.timestamp})`
      : `## [${record.category}] (${record.source})`;

    const lines = [header];

    if (record.summary) {
      lines.push(record.summary);
    }

    if (record.decisions && record.decisions.length > 0) {
      lines.push(`Decisions: ${record.decisions.join(", ")}`);
    }

    if (record.patterns && record.patterns.length > 0) {
      lines.push(`Patterns: ${record.patterns.join(", ")}`);
    }

    if (record.bugs && record.bugs.length > 0) {
      lines.push(`Bugs: ${record.bugs.join(", ")}`);
    }

    return lines.join("\n") + "\n\n";
  }
}
