import { describe, it, expect } from "vitest";
import { DecisionExtractor } from "../memory/decision-extractor.js";
import { AgentRole } from "../types/index.js";
import type { SliceSpec, AgentResult } from "../types/index.js";

function makeSlice(overrides: Partial<SliceSpec> = {}): SliceSpec {
  return {
    id: "S01",
    title: "Test Slice",
    status: "done",
    tasks: [
      {
        id: "T01",
        title: "Implement feature",
        description: "Build the feature",
        assignedRole: AgentRole.Implementer,
        dependencies: [],
        files: ["src/feature.ts", "src/utils.ts"],
      },
      {
        id: "T02",
        title: "Write tests",
        description: "Test the feature",
        assignedRole: AgentRole.Tester,
        dependencies: ["T01"],
        files: ["src/__tests__/feature.test.ts"],
      },
    ],
    ...overrides,
  };
}

function makeResult(overrides: Partial<AgentResult> = {}): AgentResult {
  return {
    role: AgentRole.Implementer,
    model: "claude-sonnet-4-6",
    success: true,
    output: "Completed implementation successfully.",
    tokensUsed: 1000,
    costUsd: 0.05,
    durationMs: 5000,
    ...overrides,
  };
}

describe("DecisionExtractor", () => {
  it("extracts a valid ProjectMemoryRecord from SliceSpec + AgentResult[]", () => {
    const slice = makeSlice();
    const results = [makeResult()];

    const record = DecisionExtractor.extract(slice, results);

    expect(record.id).toBeTruthy();
    expect(record.category).toBe("decision");
    expect(record.source).toBe("S01");
    expect(record.sliceName).toBe("Test Slice");
    expect(record.content).toContain("Test Slice");
    expect(record.timestamp).toBeTruthy();
    expect(record.tags).toContain("auto-extracted");
  });

  it("extracts decision, pattern, and bug lines from agent output", () => {
    const slice = makeSlice();
    const results = [
      makeResult({
        output: [
          "Completed the task.",
          "- Decision: Use SQLite for persistence",
          "- Pattern: Repository pattern for data access",
          "- Bug: Race condition in concurrent writes",
          "- Fix: Added mutex lock around DB operations",
          "- Decision: FTS5 for full-text search",
        ].join("\n"),
      }),
    ];

    const record = DecisionExtractor.extract(slice, results);

    expect(record.decisions).toEqual([
      "Use SQLite for persistence",
      "FTS5 for full-text search",
    ]);
    expect(record.patterns).toEqual([
      "Repository pattern for data access",
    ]);
    expect(record.bugs).toEqual([
      "Race condition in concurrent writes",
      "Added mutex lock around DB operations",
    ]);
  });

  it("sums costs correctly across multiple results", () => {
    const slice = makeSlice();
    const results = [
      makeResult({ costUsd: 0.10 }),
      makeResult({ costUsd: 0.25 }),
      makeResult({ costUsd: 0.05 }),
    ];

    const record = DecisionExtractor.extract(slice, results);

    expect(record.cost).toBeCloseTo(0.40, 5);
  });

  it("sets correct category, source, and timestamp", () => {
    const slice = makeSlice({ id: "S42", title: "Memory Engine" });
    const results = [makeResult()];

    const beforeTime = new Date().toISOString();
    const record = DecisionExtractor.extract(slice, results);
    const afterTime = new Date().toISOString();

    expect(record.category).toBe("decision");
    expect(record.source).toBe("S42");
    expect(record.timestamp).toBeTruthy();
    // Timestamp should be between before and after
    expect(record.timestamp! >= beforeTime).toBe(true);
    expect(record.timestamp! <= afterTime).toBe(true);
  });

  it("handles empty results gracefully", () => {
    const slice = makeSlice();
    const results: AgentResult[] = [];

    const record = DecisionExtractor.extract(slice, results);

    expect(record.id).toBeTruthy();
    expect(record.decisions).toEqual([]);
    expect(record.patterns).toEqual([]);
    expect(record.bugs).toEqual([]);
    expect(record.cost).toBe(0);
    expect(record.model).toBeUndefined();
    expect(record.filesChanged!.length).toBeGreaterThan(0); // Still collects from tasks
  });

  it("collects unique files from all slice tasks", () => {
    const slice = makeSlice({
      tasks: [
        {
          id: "T01",
          title: "Task 1",
          description: "",
          assignedRole: AgentRole.Implementer,
          dependencies: [],
          files: ["a.ts", "b.ts"],
        },
        {
          id: "T02",
          title: "Task 2",
          description: "",
          assignedRole: AgentRole.Implementer,
          dependencies: [],
          files: ["b.ts", "c.ts"], // b.ts is duplicate
        },
      ],
    });
    const results = [makeResult()];

    const record = DecisionExtractor.extract(slice, results);

    expect(record.filesChanged).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  it("counts tester-role tasks correctly", () => {
    const slice = makeSlice({
      tasks: [
        {
          id: "T01",
          title: "Implement",
          description: "",
          assignedRole: AgentRole.Implementer,
          dependencies: [],
          files: [],
        },
        {
          id: "T02",
          title: "Test 1",
          description: "",
          assignedRole: AgentRole.Tester,
          dependencies: [],
          files: [],
        },
        {
          id: "T03",
          title: "Test 2",
          description: "",
          assignedRole: AgentRole.Tester,
          dependencies: [],
          files: [],
        },
      ],
    });

    const record = DecisionExtractor.extract(slice, [makeResult()]);
    expect(record.testsAdded).toBe(2);
  });

  it("uses the last result's model", () => {
    const results = [
      makeResult({ model: "gpt-4" }),
      makeResult({ model: "claude-sonnet-4-6" }),
    ];

    const record = DecisionExtractor.extract(makeSlice(), results);
    expect(record.model).toBe("claude-sonnet-4-6");
  });
});
