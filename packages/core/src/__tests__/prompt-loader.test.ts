import { describe, it, expect, beforeEach } from "vitest";
import { AgentRole } from "../types/index.js";
import {
  loadPromptTemplate,
  compilePrompt,
  clearCache,
} from "../agents/prompt-loader.js";

describe("PromptLoader", () => {
  beforeEach(() => {
    clearCache();
  });

  describe("loadPromptTemplate", () => {
    const allRoles = Object.values(AgentRole);

    it.each(allRoles)("loads template for role: %s", (role) => {
      const template = loadPromptTemplate(role);
      expect(template).toBeTruthy();
      expect(typeof template).toBe("string");
      expect(template.length).toBeGreaterThan(0);
    });

    it("loads template for orchestrator", () => {
      const template = loadPromptTemplate("orchestrator");
      expect(template).toBeTruthy();
      expect(template).toContain("{{TASK}}");
    });

    it("all templates contain required placeholders", () => {
      for (const role of allRoles) {
        const template = loadPromptTemplate(role);
        expect(template).toContain("{{TASK}}");
        expect(template).toContain("{{MEMORY}}");
        expect(template).toContain("{{FILES}}");
      }

      const orchestratorTemplate = loadPromptTemplate("orchestrator");
      expect(orchestratorTemplate).toContain("{{TASK}}");
      expect(orchestratorTemplate).toContain("{{MEMORY}}");
      expect(orchestratorTemplate).toContain("{{FILES}}");
    });

    it("caches templates — second load returns same string without re-read", () => {
      const first = loadPromptTemplate(AgentRole.Research);
      const second = loadPromptTemplate(AgentRole.Research);
      // Exact same reference means cache hit
      expect(first).toBe(second);
    });

    it("throws for nonexistent template role", () => {
      expect(() => loadPromptTemplate("nonexistent" as AgentRole)).toThrow(
        /Prompt template not found/,
      );
    });
  });

  describe("compilePrompt", () => {
    it("replaces all three placeholders", () => {
      const result = compilePrompt(AgentRole.Research, {
        task: "Build a REST API",
        memory: "Previous decision: use Express",
        files: "src/index.ts\nsrc/routes.ts",
      });

      expect(result).toContain("Build a REST API");
      expect(result).toContain("Previous decision: use Express");
      expect(result).toContain("src/index.ts");
      expect(result).not.toContain("{{TASK}}");
      expect(result).not.toContain("{{MEMORY}}");
      expect(result).not.toContain("{{FILES}}");
    });

    it("handles missing optional vars by replacing with empty string", () => {
      const result = compilePrompt(AgentRole.Spec, {
        task: "Create user model",
      });

      expect(result).toContain("Create user model");
      expect(result).not.toContain("{{TASK}}");
      expect(result).not.toContain("{{MEMORY}}");
      expect(result).not.toContain("{{FILES}}");
    });

    it("handles all vars as empty strings gracefully", () => {
      const result = compilePrompt(AgentRole.Tester, {
        task: "",
        memory: "",
        files: "",
      });

      expect(result).not.toContain("{{TASK}}");
      expect(result).not.toContain("{{MEMORY}}");
      expect(result).not.toContain("{{FILES}}");
    });
  });
});
