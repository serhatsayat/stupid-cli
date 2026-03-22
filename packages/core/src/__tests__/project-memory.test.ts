import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProjectMemory } from "../memory/project-memory.js";
import type { StupidConfig, ProjectMemoryRecord, TaskSpec } from "../types/index.js";
import { AgentRole } from "../types/index.js";

function makeConfig(projectRoot: string): StupidConfig {
  return {
    projectRoot,
    models: {
      research: "m",
      implementation: "m",
      architecture: "m",
      review: "m",
      testing: "m",
    },
    governance: {
      loopDetection: false,
      costTracking: false,
      maxRetries: 3,
      stagnationThreshold: 3,
    },
    budget: {
      softLimitUsd: 10,
      hardLimitUsd: 20,
      warningThresholdPercent: 80,
    },
    git: {
      commitPerTask: false,
      branchPerSlice: false,
      autoCommitMessage: false,
    },
    profile: "balanced",
    verbose: false,
  };
}

function makeRecord(overrides: Partial<ProjectMemoryRecord> = {}): ProjectMemoryRecord {
  return {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    category: "decision",
    content: "Test record content",
    source: "test",
    timestamp: new Date().toISOString(),
    relevance: 0.5,
    tags: ["test"],
    summary: "Test summary for search",
    decisions: [],
    patterns: [],
    bugs: [],
    filesChanged: [],
    testsAdded: 0,
    cost: 0,
    ...overrides,
  };
}

describe("ProjectMemory", () => {
  let tmpDir: string;
  let memory: ProjectMemory;

  function setup() {
    tmpDir = mkdtempSync(join(tmpdir(), "stupid-mem-"));
    memory = new ProjectMemory(makeConfig(tmpDir));
  }

  afterEach(() => {
    try {
      memory?.close();
    } catch {
      // Already closed in some tests
    }
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  });

  it("inserts a record and search() returns it", async () => {
    setup();
    const rec = makeRecord({
      id: "r1",
      summary: "Authentication flow using JWT tokens",
      decisions: JSON.stringify(["Use JWT"]) as unknown as string[],
    });
    // Fix: decisions must be actual string[]
    rec.decisions = ["Use JWT for authentication"];

    memory.saveDecisionRecord(rec);
    const results = await memory.search("authentication");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe("r1");
  });

  it("returns BM25-ranked results across multiple records", async () => {
    setup();
    // Record with one mention of "database"
    memory.saveDecisionRecord(
      makeRecord({
        id: "db1",
        summary: "Database migration strategy for PostgreSQL",
        decisions: ["Use database migrations"],
      }),
    );
    // Record with multiple mentions of "database" — should rank higher
    memory.saveDecisionRecord(
      makeRecord({
        id: "db2",
        summary: "Database optimization with database indexes and database caching",
        decisions: ["Database indexing strategy"],
        patterns: ["Database connection pooling pattern"],
      }),
    );

    // FTS5 default is AND between terms; search single term to get both
    const results = await memory.search("database");
    expect(results.length).toBe(2);
    // BM25 should rank db2 higher (more term occurrences across FTS columns)
    expect(results[0].id).toBe("db2");
  });

  it("returns empty array for empty query", async () => {
    setup();
    memory.saveDecisionRecord(makeRecord({ id: "r1", summary: "Something" }));

    expect(await memory.search("")).toEqual([]);
    expect(await memory.search("   ")).toEqual([]);
    expect(await memory.search(undefined as unknown as string)).toEqual([]);
  });

  it("getRelevantRecords() returns matching records from TaskSpec", async () => {
    setup();
    memory.saveDecisionRecord(
      makeRecord({
        id: "auth1",
        summary: "Authentication middleware implementation",
        decisions: ["Use passport.js for authentication"],
      }),
    );
    memory.saveDecisionRecord(
      makeRecord({
        id: "unrelated",
        summary: "CSS styling guide for buttons",
        decisions: ["Use Tailwind CSS"],
      }),
    );

    const taskSpec: TaskSpec = {
      id: "T01",
      title: "Implement authentication middleware",
      description: "Build auth middleware",
      assignedRole: AgentRole.Implementer,
      dependencies: [],
      files: [],
    };

    const results = await memory.getRelevantRecords(taskSpec);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.id === "auth1")).toBe(true);
  });

  it("getStats() returns correct record count and DB size", () => {
    setup();
    const statsBefore = memory.getStats();
    expect(statsBefore.recordCount).toBe(0);
    expect(statsBefore.dbSizeBytes).toBeGreaterThan(0); // DB file exists after init

    memory.saveDecisionRecord(makeRecord({ id: "s1" }));
    memory.saveDecisionRecord(makeRecord({ id: "s2" }));

    const statsAfter = memory.getStats();
    expect(statsAfter.recordCount).toBe(2);
    expect(statsAfter.dbSizeBytes).toBeGreaterThanOrEqual(statsBefore.dbSizeBytes);
  });

  it("getPatterns() returns only records with non-empty patterns", () => {
    setup();
    memory.saveDecisionRecord(
      makeRecord({ id: "p1", patterns: ["Observer pattern"] }),
    );
    memory.saveDecisionRecord(
      makeRecord({ id: "p2", patterns: [] }),
    );
    memory.saveDecisionRecord(
      makeRecord({ id: "p3", patterns: ["Singleton pattern", "Factory pattern"] }),
    );

    const pats = memory.getPatterns();
    expect(pats.length).toBe(2);
    const ids = pats.map((p) => p.id);
    expect(ids).toContain("p1");
    expect(ids).toContain("p3");
  });

  it("getRecentBugs() returns records with bugs, ordered by date DESC", () => {
    setup();
    memory.saveDecisionRecord(
      makeRecord({ id: "b1", date: "2025-01-01", bugs: ["Memory leak in parser"] }),
    );
    memory.saveDecisionRecord(
      makeRecord({ id: "b2", date: "2025-06-15", bugs: ["Race condition in cache"] }),
    );
    memory.saveDecisionRecord(
      makeRecord({ id: "b3", date: "2025-03-10", bugs: [] }),
    );

    const bugRecs = memory.getRecentBugs();
    expect(bugRecs.length).toBe(2);
    expect(bugRecs[0].id).toBe("b2"); // Most recent first
    expect(bugRecs[1].id).toBe("b1");
  });

  it("close() does not throw", () => {
    setup();
    expect(() => memory.close()).not.toThrow();
  });

  it("prefix wildcards: 'auth' matches 'authentication' via wildcard", async () => {
    setup();
    memory.saveDecisionRecord(
      makeRecord({
        id: "pw1",
        summary: "Authentication system with OAuth2",
      }),
    );

    // "auth" is 4 chars (≤5), so buildFtsQuery appends `*` → "auth*"
    const results = await memory.search("auth");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("pw1");
  });

  it("OR queries: 'auth OR database' matches records for either term", async () => {
    setup();
    memory.saveDecisionRecord(
      makeRecord({
        id: "or1",
        summary: "Authentication token validation",
      }),
    );
    memory.saveDecisionRecord(
      makeRecord({
        id: "or2",
        summary: "Database schema migration tool",
      }),
    );

    const results = await memory.search("auth OR database");
    expect(results.length).toBe(2);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("or1");
    expect(ids).toContain("or2");
  });

  it("saveDecisionRecord() with INSERT OR REPLACE updates existing record", async () => {
    setup();
    const rec1 = makeRecord({ id: "upd1", summary: "Original summary" });
    memory.saveDecisionRecord(rec1);

    const rec2 = makeRecord({ id: "upd1", summary: "Updated summary about testing" });
    memory.saveDecisionRecord(rec2);

    const stats = memory.getStats();
    expect(stats.recordCount).toBe(1); // Not 2

    const results = await memory.search("testing");
    expect(results.length).toBe(1);
    expect(results[0].summary).toBe("Updated summary about testing");
  });

  it("rowToRecord parses JSON array columns correctly", async () => {
    setup();
    memory.saveDecisionRecord(
      makeRecord({
        id: "json1",
        summary: "JSON parsing test record",
        decisions: ["d1", "d2"],
        patterns: ["p1"],
        bugs: ["bug1"],
        filesChanged: ["a.ts", "b.ts"],
        tags: ["tag1", "tag2"],
        testsAdded: 3,
        cost: 0.42,
        model: "claude-sonnet",
      }),
    );

    const results = await memory.search("parsing");
    expect(results.length).toBe(1);
    const r = results[0];
    expect(r.decisions).toEqual(["d1", "d2"]);
    expect(r.patterns).toEqual(["p1"]);
    expect(r.bugs).toEqual(["bug1"]);
    expect(r.filesChanged).toEqual(["a.ts", "b.ts"]);
    expect(r.tags).toEqual(["tag1", "tag2"]);
    expect(r.testsAdded).toBe(3);
    expect(r.cost).toBe(0.42);
    expect(r.model).toBe("claude-sonnet");
  });
});
