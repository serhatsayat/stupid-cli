import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  utimesSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileSelector } from "../context/file-selector.js";
import type { TaskSpec } from "../types/index.js";
import { AgentRole } from "../types/index.js";

// ─── Helpers ─────────────────────────────────────────────────

/** Create a minimal TaskSpec for testing. */
function makeTaskSpec(description: string): TaskSpec {
  return {
    id: "T01",
    title: "Test task",
    description,
    assignedRole: AgentRole.Implementer,
    dependencies: [],
    files: [],
  };
}

/** Create a file with content inside the fixture root. */
function createFile(root: string, relPath: string, content: string): void {
  const fullPath = join(root, relPath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
}

// ─── Test Suite ──────────────────────────────────────────────

describe("FileSelector", () => {
  let fixtureRoot: string;

  beforeEach(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "file-selector-"));
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  // ── extractKeywords ────────────────────────────────────

  describe("extractKeywords", () => {
    it("tokenizes and lowercases text", () => {
      const kw = FileSelector.extractKeywords("Handle Error Logging");
      expect(kw).toContain("handle");
      expect(kw).toContain("error");
      expect(kw).toContain("logging");
    });

    it("removes stop words", () => {
      const kw = FileSelector.extractKeywords(
        "add the error handling for all requests",
      );
      // 'add', 'the', 'for', 'all' are stop words
      expect(kw).not.toContain("the");
      expect(kw).not.toContain("for");
      expect(kw).not.toContain("all");
      expect(kw).not.toContain("add");
      expect(kw).toContain("error");
      expect(kw).toContain("handling");
      expect(kw).toContain("requests");
    });

    it("removes words ≤2 chars", () => {
      const kw = FileSelector.extractKeywords("go to db and fix it");
      expect(kw).not.toContain("go");
      expect(kw).not.toContain("to");
      expect(kw).not.toContain("db");
    });

    it("deduplicates keywords", () => {
      const kw = FileSelector.extractKeywords("error error error handling");
      const errorCount = kw.filter((k) => k === "error").length;
      expect(errorCount).toBe(1);
    });

    it("splits on punctuation", () => {
      const kw = FileSelector.extractKeywords(
        "error-handling/auth_middleware.test",
      );
      expect(kw).toContain("error");
      expect(kw).toContain("handling");
      expect(kw).toContain("auth");
      expect(kw).toContain("middleware");
      expect(kw).toContain("test");
    });

    it("returns empty array for empty input", () => {
      expect(FileSelector.extractKeywords("")).toEqual([]);
      expect(FileSelector.extractKeywords("   ")).toEqual([]);
    });
  });

  // ── walkProject ────────────────────────────────────────

  describe("walkProject", () => {
    it("includes files with allowed extensions", () => {
      createFile(fixtureRoot, "src/index.ts", "export const x = 1;");
      createFile(fixtureRoot, "src/styles.css", "body {}");
      createFile(fixtureRoot, "README.md", "# Hello");

      const files = FileSelector.walkProject(fixtureRoot);
      expect(files).toContain("src/index.ts");
      expect(files).toContain("src/styles.css");
      expect(files).toContain("README.md");
    });

    it("excludes node_modules, dist, and .git", () => {
      createFile(fixtureRoot, "src/main.ts", "main()");
      createFile(fixtureRoot, "node_modules/pkg/index.js", "mod");
      createFile(fixtureRoot, "dist/bundle.js", "bundle");
      createFile(fixtureRoot, ".git/HEAD", "ref");

      const files = FileSelector.walkProject(fixtureRoot);
      expect(files).toContain("src/main.ts");
      expect(files.some((f) => f.includes("node_modules"))).toBe(false);
      expect(files.some((f) => f.includes("dist"))).toBe(false);
      expect(files.some((f) => f.includes(".git"))).toBe(false);
    });

    it("excludes files with non-allowed extensions", () => {
      createFile(fixtureRoot, "image.png", "binary");
      createFile(fixtureRoot, "data.bin", "binary");
      createFile(fixtureRoot, "src/main.ts", "main()");

      const files = FileSelector.walkProject(fixtureRoot);
      expect(files).not.toContain("image.png");
      expect(files).not.toContain("data.bin");
      expect(files).toContain("src/main.ts");
    });

    it("handles missing directory gracefully", () => {
      const files = FileSelector.walkProject("/nonexistent/path/xyzzy");
      expect(files).toEqual([]);
    });

    it("accepts custom exclude patterns", () => {
      createFile(fixtureRoot, "vendor/lib.js", "lib");
      createFile(fixtureRoot, "src/main.ts", "main");

      const files = FileSelector.walkProject(fixtureRoot, ["vendor"]);
      expect(files.some((f) => f.includes("vendor"))).toBe(false);
      expect(files).toContain("src/main.ts");
    });
  });

  // ── scoreFile ──────────────────────────────────────────

  describe("scoreFile", () => {
    it("gives +5 for path keyword match", () => {
      const score = FileSelector.scoreFile(
        "src/error-handler.ts",
        "// empty",
        ["error"],
      );
      // path match (+5) + .ts bonus (+1)
      expect(score).toBeGreaterThanOrEqual(5);
    });

    it("gives +2 for content keyword match", () => {
      const score = FileSelector.scoreFile("src/utils.js", "handle errors gracefully", [
        "errors",
      ]);
      // content match (+2)
      expect(score).toBeGreaterThanOrEqual(2);
    });

    it("gives +1 bonus for .ts extension", () => {
      const noKeywords = FileSelector.scoreFile("src/index.ts", "code", [
        "code",
      ]);
      const jsFile = FileSelector.scoreFile("src/index.js", "code", ["code"]);
      // Both have content match (+2), .ts gets +1 bonus
      expect(noKeywords).toBe(jsFile + 1);
    });

    it("gives +3 bonus for test files matching keywords", () => {
      const testScore = FileSelector.scoreFile(
        "src/__tests__/error.test.ts",
        "test errors",
        ["error"],
      );
      const srcScore = FileSelector.scoreFile(
        "src/error.ts",
        "test errors",
        ["error"],
      );
      // Test file: path(+5) + content(+2) + .ts(+1) + test-bonus(+3) = 11
      // Src file: path(+5) + content(+2) + .ts(+1) = 8
      expect(testScore).toBe(srcScore + 3);
    });

    it("returns 0 for no keyword matches", () => {
      const score = FileSelector.scoreFile("src/main.ts", "hello world", [
        "database",
        "query",
      ]);
      expect(score).toBe(0);
    });
  });

  // ── selectFiles ────────────────────────────────────────

  describe("selectFiles", () => {
    const selector = new FileSelector();

    it("returns ranked relevant files for a fixture project", async () => {
      createFile(
        fixtureRoot,
        "src/auth/login.ts",
        "export function login(user: string) { return authenticate(user); }",
      );
      createFile(
        fixtureRoot,
        "src/auth/session.ts",
        "export function createSession() { return { token: 'abc' }; }",
      );
      createFile(
        fixtureRoot,
        "src/utils/logger.ts",
        "export function log(msg: string) { console.log(msg); }",
      );
      createFile(
        fixtureRoot,
        "src/__tests__/login.test.ts",
        "describe('login', () => { it('authenticates', () => {}); });",
      );

      const files = await selector.selectFiles(
        "fix login authentication flow",
        fixtureRoot,
      );

      expect(files.length).toBeGreaterThan(0);
      // login.ts and login.test.ts should rank highest
      expect(files[0]).toContain("login");
    });

    it("respects maxFiles cap", async () => {
      // Create many matching files
      for (let i = 0; i < 20; i++) {
        createFile(
          fixtureRoot,
          `src/module${i}.ts`,
          `export function handler${i}() { return 'handler'; }`,
        );
      }

      const files = await selector.selectFiles("handler module", fixtureRoot, 5);
      expect(files.length).toBeLessThanOrEqual(5);
    });

    it("returns relative paths", async () => {
      createFile(fixtureRoot, "src/api/routes.ts", "export const routes = [];");

      const files = await selector.selectFiles("api routes", fixtureRoot);
      for (const f of files) {
        expect(f.startsWith("/")).toBe(false);
      }
    });

    it("falls back to recently-modified files when keywords match <3 files", async () => {
      // Create files with no keyword overlap to 'xylophone zyzzyx'
      createFile(fixtureRoot, "src/alpha.ts", "export const alpha = 1;");
      createFile(fixtureRoot, "src/beta.ts", "export const beta = 2;");
      createFile(fixtureRoot, "src/gamma.ts", "export const gamma = 3;");

      // Touch alpha most recently
      const future = new Date(Date.now() + 1000);
      utimesSync(join(fixtureRoot, "src/alpha.ts"), future, future);

      const files = await selector.selectFiles(
        "xylophone zyzzyx",
        fixtureRoot,
      );
      // Should fall back and return files sorted by mtime
      expect(files.length).toBeGreaterThan(0);
      expect(files[0]).toBe("src/alpha.ts");
    });

    it("handles TaskSpec input", async () => {
      createFile(
        fixtureRoot,
        "src/database/query.ts",
        "export function runQuery(sql: string) { return []; }",
      );

      const taskSpec = makeTaskSpec("optimize database query performance");
      const files = await selector.selectFiles(taskSpec, fixtureRoot);

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.includes("query"))).toBe(true);
    });

    it("returns empty array for empty project", async () => {
      const files = await selector.selectFiles("anything", fixtureRoot);
      expect(files).toEqual([]);
    });
  });

  // ── R030 Proof ─────────────────────────────────────────

  describe("R030: selectFiles returns relevant files for known tasks", () => {
    const selector = new FileSelector();

    it('selectFiles("add error handling", fixtureRoot) returns non-empty with expected files', async () => {
      // Set up a realistic fixture project
      createFile(
        fixtureRoot,
        "src/api/handler.ts",
        'export function handleRequest(req: Request) {\n  try {\n    return process(req);\n  } catch (error) {\n    throw error;\n  }\n}',
      );
      createFile(
        fixtureRoot,
        "src/utils/error-handler.ts",
        'export class AppError extends Error {\n  constructor(message: string, public code: number) {\n    super(message);\n  }\n}',
      );
      createFile(
        fixtureRoot,
        "src/__tests__/error-handler.test.ts",
        "describe('error handler', () => {\n  it('creates error with code', () => {});\n});",
      );
      createFile(
        fixtureRoot,
        "src/config/settings.ts",
        "export const settings = { debug: false };",
      );
      createFile(fixtureRoot, "README.md", "# Project\nA sample project.");

      const files = await selector.selectFiles(
        "add error handling",
        fixtureRoot,
      );

      // Must be non-empty
      expect(files.length).toBeGreaterThan(0);

      // Must contain the error-related files
      expect(files.some((f) => f.includes("error-handler"))).toBe(true);
      expect(files.some((f) => f.includes("handler"))).toBe(true);

      // Error-handler should rank above unrelated config
      const errorIdx = files.findIndex((f) => f.includes("error-handler"));
      const configIdx = files.findIndex((f) => f.includes("settings"));
      if (configIdx >= 0) {
        expect(errorIdx).toBeLessThan(configIdx);
      }
    });
  });
});
