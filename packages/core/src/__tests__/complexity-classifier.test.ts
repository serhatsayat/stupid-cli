import { describe, it, expect } from "vitest";
import { AgentRole } from "../types/index.js";
import type { TaskSpec } from "../types/index.js";
import { ComplexityClassifier } from "../orchestrator/complexity-classifier.js";

// Helper: build a minimal TaskSpec with given description and file count
function makeTaskSpec(
  description: string,
  fileCount: number,
): TaskSpec {
  return {
    id: "test-task",
    title: "Test",
    description,
    assignedRole: AgentRole.Implementer,
    dependencies: [],
    files: Array.from({ length: fileCount }, (_, i) => `file-${i}.ts`),
  };
}

// Helper: generate a long description of specified word count
function wordsOf(count: number): string {
  return Array.from({ length: count }, (_, i) => `word${i}`).join(" ");
}

describe("ComplexityClassifier", () => {
  const classifier = new ComplexityClassifier();

  // ── Light tasks ──────────────────────────────────────────

  describe("light tasks", () => {
    it('classifies "rename variable x to y" as light', () => {
      expect(classifier.classify("rename variable x to y")).toBe("light");
    });

    it('classifies "fix typo in README" as light', () => {
      expect(classifier.classify("fix typo in README")).toBe("light");
    });

    it('classifies "update comment" as light', () => {
      expect(classifier.classify("update comment")).toBe("light");
    });

    it('classifies "add import for lodash" as light', () => {
      expect(classifier.classify("add import for lodash")).toBe("light");
    });

    it('classifies "remove unused variable" as light', () => {
      expect(classifier.classify("remove unused variable")).toBe("light");
    });

    it('classifies "fix spelling in error message" as light', () => {
      expect(classifier.classify("fix spelling in error message")).toBe("light");
    });
  });

  // ── Heavy tasks ──────────────────────────────────────────

  describe("heavy tasks", () => {
    it('classifies "refactor the entire authentication system across all modules" as heavy', () => {
      expect(
        classifier.classify(
          "refactor the entire authentication system across all modules",
        ),
      ).toBe("heavy");
    });

    it('classifies "redesign database schema and migrate all queries" as heavy', () => {
      expect(
        classifier.classify(
          "redesign database schema and migrate all queries",
        ),
      ).toBe("heavy");
    });

    it('classifies "create new module for payment processing with API design" as heavy', () => {
      expect(
        classifier.classify(
          "create new module for payment processing with API design",
        ),
      ).toBe("heavy");
    });

    it("classifies a very long description (200+ words) as trending heavy", () => {
      const longDesc = wordsOf(210);
      const tier = classifier.classify(longDesc);
      expect(tier).toBe("heavy");
    });
  });

  // ── Standard tasks ───────────────────────────────────────

  describe("standard tasks", () => {
    it('classifies "add a utility function" as standard', () => {
      expect(classifier.classify("add a utility function")).toBe("standard");
    });

    it('classifies "implement user login" as standard', () => {
      expect(classifier.classify("implement user login")).toBe("standard");
    });

    it('classifies "create a new endpoint" as standard', () => {
      expect(classifier.classify("create a new endpoint")).toBe("standard");
    });
  });

  // ── Edge cases ───────────────────────────────────────────

  describe("edge cases", () => {
    it("classifies empty string as standard", () => {
      expect(classifier.classify("")).toBe("standard");
    });

    it("classifies whitespace-only string as standard", () => {
      expect(classifier.classify("   ")).toBe("standard");
    });

    it("single light keyword in short description triggers light", () => {
      // "rename" alone → keyword (-1) = -1 → light
      expect(classifier.classify("rename")).toBe("light");
    });

    it("single heavy keyword in a short description stays standard (no desc-length bonus)", () => {
      // "refactor" → multi-file keyword (+1) = +1 → standard
      expect(classifier.classify("refactor")).toBe("standard");
    });

    it("multi-step language adds to heavy score", () => {
      const desc =
        "First, create the migration scripts. Then, update all service calls to use the new schema throughout the system.";
      const tier = classifier.classify(desc);
      // "first...then" (+1), "throughout" (+1), "migrate" via "migration" — let's check
      expect(tier).toBe("heavy");
    });

    it("numbered list adds multi-step signal", () => {
      const desc = `Implement the following changes:
1. Add new database tables
2. Create the new module for handling payments
3. Update all existing endpoints`;
      const tier = classifier.classify(desc);
      // "new module" (+1), "step" patterns (+1), short-ish but some keywords
      expect(["standard", "heavy"]).toContain(tier);
    });
  });

  // ── TaskSpec input ───────────────────────────────────────

  describe("TaskSpec input", () => {
    it("classifies TaskSpec with >10 files and moderate description as heavy", () => {
      const spec = makeTaskSpec(
        "update the configuration across the codebase",
        15,
      );
      expect(classifier.classify(spec)).toBe("heavy");
    });

    it("classifies TaskSpec with 1 file and simple description as light", () => {
      const spec = makeTaskSpec("fix typo in docs", 1);
      expect(classifier.classify(spec)).toBe("light");
    });

    it("classifies TaskSpec with 3 files and moderate description as standard", () => {
      const spec = makeTaskSpec("add validation to the form handler", 3);
      expect(classifier.classify(spec)).toBe("standard");
    });

    it("TaskSpec file count stacks with description signals", () => {
      // Heavy keywords + many files should reinforce heavy
      const spec = makeTaskSpec(
        "refactor the authentication module throughout the codebase",
        12,
      );
      expect(classifier.classify(spec)).toBe("heavy");
    });
  });
});
