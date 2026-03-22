import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentRole } from "../types/index.js";

// ─── Template Cache ──────────────────────────────────────────

const templateCache = new Map<string, string>();

// ─── Repo Root Resolution ────────────────────────────────────

let cachedRepoRoot: string | null = null;

/**
 * Walks up from the current file to find the repo root by looking
 * for a `package.json` with `"name": "stupid-monorepo"`.
 */
function findRepoRoot(): string {
  if (cachedRepoRoot) return cachedRepoRoot;

  const startDir = dirname(fileURLToPath(import.meta.url));
  let dir = startDir;

  for (let i = 0; i < 20; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const content = readFileSync(pkgPath, "utf-8");
        const pkg = JSON.parse(content) as { name?: string };
        if (pkg.name === "stupid-monorepo") {
          cachedRepoRoot = dir;
          return dir;
        }
      } catch {
        // malformed package.json, keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  throw new Error(
    `Could not find repo root (package.json with name "stupid-monorepo") starting from ${startDir}`,
  );
}

// ─── Prompt Loading ──────────────────────────────────────────

/**
 * All valid template names — the 7 agent roles plus "orchestrator".
 */
const VALID_TEMPLATES = new Set<string>([
  ...Object.values(AgentRole),
  "orchestrator",
]);

/**
 * Loads a prompt template file for the given role from `prompts/{role}.md`.
 * Results are cached in memory until `clearCache()` is called.
 *
 * @param role - AgentRole enum value or "orchestrator"
 * @returns The raw template string with `{{PLACEHOLDER}}` markers
 * @throws If the template file does not exist on disk
 */
export function loadPromptTemplate(role: AgentRole | "orchestrator"): string {
  const cached = templateCache.get(role);
  if (cached !== undefined) return cached;

  const repoRoot = findRepoRoot();
  const templatePath = resolve(repoRoot, "prompts", `${role}.md`);

  if (!existsSync(templatePath)) {
    throw new Error(
      `Prompt template not found for role "${role}" at ${templatePath}`,
    );
  }

  const content = readFileSync(templatePath, "utf-8");
  templateCache.set(role, content);
  return content;
}

// ─── Prompt Compilation ──────────────────────────────────────

export interface PromptVars {
  task: string;
  memory?: string;
  files?: string;
}

/**
 * Loads a template for the given role and replaces placeholders:
 * - `{{TASK}}` → `vars.task`
 * - `{{MEMORY}}` → `vars.memory` (defaults to empty string)
 * - `{{FILES}}` → `vars.files` (defaults to empty string)
 *
 * @param role - AgentRole enum value or "orchestrator"
 * @param vars - Replacement values for template placeholders
 * @returns The compiled prompt string ready for use
 */
export function compilePrompt(
  role: AgentRole | "orchestrator",
  vars: PromptVars,
): string {
  let template = loadPromptTemplate(role);

  template = template.replaceAll("{{TASK}}", vars.task);
  template = template.replaceAll("{{MEMORY}}", vars.memory ?? "");
  template = template.replaceAll("{{FILES}}", vars.files ?? "");

  return template;
}

// ─── Cache Management ────────────────────────────────────────

/**
 * Clears the in-memory template cache. Useful for testing or
 * when prompt files are modified at runtime.
 */
export function clearCache(): void {
  templateCache.set = templateCache.set; // keep reference identity
  templateCache.clear();
  cachedRepoRoot = null;
}
