import { describe, it, expect } from "vitest";
import { MemoryInjector } from "../memory/memory-injector.js";
import { AgentRole } from "../types/index.js";
import type { ProjectMemoryRecord } from "../types/index.js";

function makeRecord(
  overrides: Partial<ProjectMemoryRecord> = {},
): ProjectMemoryRecord {
  return {
    id: `rec-${Math.random().toString(36).slice(2, 7)}`,
    category: "decision",
    content: "Default test content",
    source: "test",
    timestamp: new Date().toISOString(),
    relevance: 0.5,
    tags: ["test"],
    ...overrides,
  };
}

describe("MemoryInjector", () => {
  it("format() returns a non-empty string for non-empty records", () => {
    const records = [
      makeRecord({ content: "Use SQLite for persistence" }),
      makeRecord({ category: "pattern", content: "Repository pattern" }),
    ];

    const output = MemoryInjector.format(records, AgentRole.Implementer);
    expect(output.length).toBeGreaterThan(0);
    expect(output).toContain("SQLite");
    expect(output).toContain("Repository");
  });

  it("output stays within token budget (≤500 tokens ≈ ≤2000 chars)", () => {
    // Generate many records to exceed the budget
    const records = Array.from({ length: 50 }, (_, i) =>
      makeRecord({
        category: "decision",
        content: `Decision ${i}: This is a moderately long content block that discusses architectural choices, implementation details, and tradeoffs made during the development process.`,
        sliceName: `Slice-${i}`,
        decisions: [`Use approach ${i}`, `Avoid approach ${i + 100}`],
        patterns: [`Pattern-${i}`],
      }),
    );

    const output = MemoryInjector.format(records, AgentRole.Implementer, 500);

    // 500 tokens × 4 chars/token = 2000 chars max
    expect(output.length).toBeLessThanOrEqual(2000);
  });

  it("returns empty string for empty records array", () => {
    expect(MemoryInjector.format([], AgentRole.Research)).toBe("");
  });

  it("returns empty string for null/undefined records", () => {
    expect(
      MemoryInjector.format(
        null as unknown as ProjectMemoryRecord[],
        AgentRole.Research,
      ),
    ).toBe("");
    expect(
      MemoryInjector.format(
        undefined as unknown as ProjectMemoryRecord[],
        AgentRole.Research,
      ),
    ).toBe("");
  });

  it("research role prioritizes context and pattern categories", () => {
    const records = [
      makeRecord({ category: "decision", content: "A decision record", relevance: 0.9 }),
      makeRecord({ category: "context", content: "A context record", relevance: 0.3 }),
      makeRecord({ category: "pattern", content: "A pattern record", relevance: 0.3 }),
      makeRecord({ category: "lesson", content: "A lesson record", relevance: 0.9 }),
    ];

    const output = MemoryInjector.format(records, AgentRole.Research);

    // Context and pattern should appear before decision and lesson
    const contextIdx = output.indexOf("context record");
    const patternIdx = output.indexOf("pattern record");
    const decisionIdx = output.indexOf("decision record");
    const lessonIdx = output.indexOf("lesson record");

    // Both prioritized categories should appear before non-prioritized
    expect(contextIdx).toBeLessThan(decisionIdx);
    expect(patternIdx).toBeLessThan(lessonIdx);
  });

  it("tester role prioritizes lesson and bug records", () => {
    const records = [
      makeRecord({ category: "decision", content: "A decision", relevance: 0.9 }),
      makeRecord({
        category: "lesson",
        content: "A lesson about testing",
        relevance: 0.3,
      }),
      makeRecord({
        category: "context",
        content: "A context with bugs",
        relevance: 0.3,
        bugs: ["Memory leak in parser"],
      }),
    ];

    const output = MemoryInjector.format(records, AgentRole.Tester);

    // Lesson and bug records should appear before plain decision
    const lessonIdx = output.indexOf("lesson about testing");
    const bugIdx = output.indexOf("bugs");
    const decisionIdx = output.indexOf("A decision");

    expect(lessonIdx).toBeLessThan(decisionIdx);
    // The bug record should also be boosted (context with bugs)
    expect(bugIdx).toBeLessThan(decisionIdx);
  });

  it("implementer role prioritizes decision and pattern categories", () => {
    const records = [
      makeRecord({ category: "lesson", content: "A lesson", relevance: 0.9 }),
      makeRecord({ category: "decision", content: "A decision", relevance: 0.3 }),
      makeRecord({ category: "pattern", content: "A pattern", relevance: 0.3 }),
    ];

    const output = MemoryInjector.format(records, AgentRole.Implementer);

    const decisionIdx = output.indexOf("A decision");
    const patternIdx = output.indexOf("A pattern");
    const lessonIdx = output.indexOf("A lesson");

    expect(decisionIdx).toBeLessThan(lessonIdx);
    expect(patternIdx).toBeLessThan(lessonIdx);
  });

  it("rich records with sliceName, decisions, patterns format correctly", () => {
    const records = [
      makeRecord({
        sliceName: "Memory Engine",
        date: "2025-06-15",
        summary: "Built the memory subsystem",
        decisions: ["Use SQLite", "FTS5 for search"],
        patterns: ["Repository pattern"],
        bugs: ["Race condition fix"],
      }),
    ];

    const output = MemoryInjector.format(records, AgentRole.Implementer);

    expect(output).toContain("Memory Engine");
    expect(output).toContain("2025-06-15");
    expect(output).toContain("Built the memory subsystem");
    expect(output).toContain("Decisions: Use SQLite, FTS5 for search");
    expect(output).toContain("Patterns: Repository pattern");
    expect(output).toContain("Bugs: Race condition fix");
  });

  it("custom maxTokens parameter controls output length", () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      makeRecord({
        content: `Record ${i} with substantial content to fill up the budget.`,
      }),
    );

    const short = MemoryInjector.format(records, AgentRole.Implementer, 100);
    const long = MemoryInjector.format(records, AgentRole.Implementer, 1000);

    // 100 tokens × 4 = 400 chars max, 1000 tokens × 4 = 4000 chars max
    expect(short.length).toBeLessThanOrEqual(400);
    expect(long.length).toBeLessThanOrEqual(4000);
    expect(long.length).toBeGreaterThan(short.length);
  });
});
