import { describe, it, expect } from "vitest";
import { AgentRole, LoopState, VERSION } from "../index.js";

describe("AgentRole enum", () => {
  it("has all 7 expected values", () => {
    const expectedValues = [
      "research",
      "spec",
      "architect",
      "tester",
      "implementer",
      "reviewer",
      "finalizer",
    ];
    const actualValues = Object.values(AgentRole);
    expect(actualValues).toHaveLength(7);
    for (const val of expectedValues) {
      expect(actualValues).toContain(val);
    }
  });

  it("has PascalCase keys mapping to lowercase values", () => {
    expect(AgentRole.Research).toBe("research");
    expect(AgentRole.Spec).toBe("spec");
    expect(AgentRole.Architect).toBe("architect");
    expect(AgentRole.Tester).toBe("tester");
    expect(AgentRole.Implementer).toBe("implementer");
    expect(AgentRole.Reviewer).toBe("reviewer");
    expect(AgentRole.Finalizer).toBe("finalizer");
  });
});

describe("LoopState enum", () => {
  it("has all 5 expected values", () => {
    const expectedValues = [
      "productive",
      "stagnating",
      "stuck",
      "failing",
      "recovering",
    ];
    const actualValues = Object.values(LoopState);
    expect(actualValues).toHaveLength(5);
    for (const val of expectedValues) {
      expect(actualValues).toContain(val);
    }
  });

  it("has PascalCase keys mapping to lowercase values", () => {
    expect(LoopState.Productive).toBe("productive");
    expect(LoopState.Stagnating).toBe("stagnating");
    expect(LoopState.Stuck).toBe("stuck");
    expect(LoopState.Failing).toBe("failing");
    expect(LoopState.Recovering).toBe("recovering");
  });
});

describe("VERSION", () => {
  it("is exported and equals '0.1.0'", () => {
    expect(VERSION).toBe("0.1.0");
  });
});
