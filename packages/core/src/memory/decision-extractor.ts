import type { SliceSpec, AgentResult, ProjectMemoryRecord } from "../types/index.js";

/**
 * Extracts structured knowledge (decisions, patterns, bugs) from completed
 * slice results into a ProjectMemoryRecord for persistent storage.
 *
 * Usage: DecisionExtractor.extract(slice, results) → ProjectMemoryRecord
 */
export class DecisionExtractor {
  /**
   * Extract a ProjectMemoryRecord from a completed slice and its agent results.
   *
   * Scans agent output for structured markers:
   *   - "- Decision:" lines → decisions[]
   *   - "- Pattern:" lines → patterns[]
   *   - "- Bug:" / "- Fix:" lines → bugs[]
   *
   * Also aggregates: files changed, test count, cost, model info.
   */
  static extract(slice: SliceSpec, results: AgentResult[]): ProjectMemoryRecord {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const decisions: string[] = [];
    const patterns: string[] = [];
    const bugs: string[] = [];

    // Scan all agent outputs for structured markers
    for (const result of results) {
      if (!result.output) continue;
      const lines = result.output.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^-\s*Decision:/i.test(trimmed)) {
          decisions.push(trimmed.replace(/^-\s*Decision:\s*/i, "").trim());
        } else if (/^-\s*Pattern:/i.test(trimmed)) {
          patterns.push(trimmed.replace(/^-\s*Pattern:\s*/i, "").trim());
        } else if (/^-\s*(Bug|Fix):/i.test(trimmed)) {
          bugs.push(trimmed.replace(/^-\s*(Bug|Fix):\s*/i, "").trim());
        }
      }
    }

    // Collect files changed from all tasks in the slice
    const filesChanged: string[] = [];
    for (const task of slice.tasks) {
      for (const file of task.files) {
        if (!filesChanged.includes(file)) {
          filesChanged.push(file);
        }
      }
    }

    // Count test-role tasks
    const testsAdded = slice.tasks.filter((t) => t.assignedRole === "tester").length;

    // Sum costs across all results
    const totalCost = results.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);

    // Use the last result's model (most recent)
    const model = results.length > 0 ? results[results.length - 1].model : undefined;

    // Build summary from slice title + results summary
    const summary = `Slice "${slice.title}": ${results.length} agent(s) completed, ${decisions.length} decision(s), ${patterns.length} pattern(s), ${bugs.length} bug(s) found.`;

    return {
      id,
      category: "decision",
      content: summary,
      source: slice.id,
      timestamp: now,
      relevance: 0.5,
      tags: ["auto-extracted"],
      sessionId: undefined,
      sliceName: slice.title,
      date: now,
      summary,
      decisions,
      patterns,
      bugs,
      filesChanged,
      testsAdded,
      cost: totalCost,
      model,
    };
  }
}
