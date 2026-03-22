import { AgentRole } from "../types/index.js";
import type {
  AgentResult,
  PlanSpec,
  SliceSpec,
  TaskSpec,
} from "../types/index.js";

// ─── Role Assignment Heuristics ──────────────────────────────

/**
 * Maps keywords in a task title/description to the most appropriate agent role.
 * Falls back to Implementer for unrecognized tasks.
 */
function assignRole(title: string, description: string): AgentRole {
  const text = `${title} ${description}`.toLowerCase();

  if (/\b(test|spec|assert|coverage|fixture)\b/.test(text)) {
    return AgentRole.Tester;
  }
  if (/\b(review|audit|check|verify|inspect)\b/.test(text)) {
    return AgentRole.Reviewer;
  }
  if (/\b(final|deploy|release|publish|clean[- ]?up|polish)\b/.test(text)) {
    return AgentRole.Finalizer;
  }

  // Default: implementation work
  return AgentRole.Implementer;
}

// ─── Structured Data Extraction ──────────────────────────────

interface ExtractedPlan {
  title?: string;
  description?: string;
  slices?: Array<{
    title?: string;
    tasks?: Array<{
      title?: string;
      description?: string;
      files?: string[];
    }>;
  }>;
}

/**
 * Extracts plan-like structured data from an AgentResult.
 * Tries structuredData first, then parses fenced JSON from output.
 */
function extractPlanData(result: AgentResult): ExtractedPlan {
  if (result.structuredData && typeof result.structuredData === "object") {
    return result.structuredData as ExtractedPlan;
  }

  // Try parsing fenced JSON from output
  const match = result.output.match(/```json\n([\s\S]*?)\n```/);
  if (match?.[1]) {
    try {
      return JSON.parse(match[1]) as ExtractedPlan;
    } catch {
      // Fall through to text-based extraction
    }
  }

  return {};
}

// ─── TaskPlanner ─────────────────────────────────────────────

/**
 * Transforms agent results (research, spec, architect) into a structured PlanSpec.
 *
 * The plan decomposition follows this logic:
 * - Extracts structured data from each agent's output
 * - Uses the spec result for milestone title/description
 * - Uses the architect result for slice/task decomposition
 * - Assigns roles to tasks using keyword heuristics
 * - Aggregates token/cost estimates from all results
 *
 * When no architect result is provided (budget profile), creates a
 * simplified single-slice plan derived from the spec output.
 */
export class TaskPlanner {
  /**
   * Create a PlanSpec from agent phase results.
   *
   * @param researchResult - Research phase output (context gathering)
   * @param specResult - Spec phase output (requirements/goals)
   * @param architectResult - Optional architect phase output (decomposition)
   * @returns A fully populated PlanSpec with milestone, slices, and estimates
   */
  static createPlan(
    researchResult: AgentResult,
    specResult: AgentResult,
    architectResult?: AgentResult,
  ): PlanSpec {
    const specData = extractPlanData(specResult);

    // Milestone from spec result
    const milestone = {
      id: "M001",
      title: specData.title ?? "Project Plan",
      description: specData.description ?? specResult.output.slice(0, 200),
    };

    // Build slices from architect result or simplified plan
    const slices = architectResult
      ? TaskPlanner.buildSlicesFromArchitect(architectResult)
      : TaskPlanner.buildSimplifiedPlan(specResult);

    // Aggregate estimates from all input results
    const allResults = [researchResult, specResult];
    if (architectResult) allResults.push(architectResult);

    const totalEstimate = {
      tokens: allResults.reduce((sum, r) => sum + r.tokensUsed, 0),
      costUsd: allResults.reduce((sum, r) => sum + r.costUsd, 0),
      durationMs: allResults.reduce((sum, r) => sum + r.durationMs, 0),
    };

    return { milestone, slices, totalEstimate };
  }

  /**
   * Build slices from the architect's structured output.
   * Falls back to a single-slice plan if the architect output lacks structure.
   */
  private static buildSlicesFromArchitect(
    architectResult: AgentResult,
  ): SliceSpec[] {
    const archData = extractPlanData(architectResult);

    if (!archData.slices?.length) {
      // Architect didn't produce structured slices — create one from output
      return [
        TaskPlanner.createSlice(
          "S01",
          "Implementation",
          [
            TaskPlanner.createTask(
              "T01",
              "Implement changes",
              architectResult.output.slice(0, 500),
              [],
            ),
          ],
        ),
      ];
    }

    return archData.slices.map((sliceData, sIdx) => {
      const sliceId = `S${String(sIdx + 1).padStart(2, "0")}`;
      const tasks = (sliceData.tasks ?? []).map((taskData, tIdx) => {
        const taskId = `T${String(tIdx + 1).padStart(2, "0")}`;
        return TaskPlanner.createTask(
          taskId,
          taskData.title ?? `Task ${tIdx + 1}`,
          taskData.description ?? "",
          taskData.files ?? [],
        );
      });

      return TaskPlanner.createSlice(
        sliceId,
        sliceData.title ?? `Slice ${sIdx + 1}`,
        tasks,
      );
    });
  }

  /**
   * Build a simplified single-slice plan when architect phase was skipped
   * (budget profile). Derives one slice with one implementation task.
   */
  private static buildSimplifiedPlan(specResult: AgentResult): SliceSpec[] {
    const specData = extractPlanData(specResult);

    return [
      TaskPlanner.createSlice(
        "S01",
        specData.title ?? "Implementation",
        [
          TaskPlanner.createTask(
            "T01",
            "Implement all changes",
            specResult.output.slice(0, 500),
            [],
          ),
        ],
      ),
    ];
  }

  /**
   * Creates a SliceSpec with the given tasks and initial status.
   */
  private static createSlice(
    id: string,
    title: string,
    tasks: TaskSpec[],
  ): SliceSpec {
    return { id, title, tasks, status: "pending" };
  }

  /**
   * Creates a TaskSpec with role assigned by keyword heuristics.
   */
  private static createTask(
    id: string,
    title: string,
    description: string,
    files: string[],
  ): TaskSpec {
    return {
      id,
      title,
      description,
      assignedRole: assignRole(title, description),
      dependencies: [],
      files,
    };
  }
}
