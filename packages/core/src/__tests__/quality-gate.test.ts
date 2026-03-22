import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { QualityGate } from "../governance/quality-gate.js";
import { DEFAULT_CONFIG } from "../index.js";

describe("QualityGate", () => {
  const tempDirs: string[] = [];

  function makeTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "quality-gate-test-"));
    tempDirs.push(dir);
    return dir;
  }

  function makeTempFile(dir: string, name: string, content: string): string {
    const filePath = join(dir, name);
    writeFileSync(filePath, content, "utf-8");
    return filePath;
  }

  afterEach(() => {
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
    tempDirs.length = 0;
  });

  it("check() with no files returns passed: true and empty issues", () => {
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check();
    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("check() with empty array returns passed: true", () => {
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([]);
    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("check() detects hardcoded OpenAI API key pattern", () => {
    const dir = makeTempDir();
    const file = makeTempFile(
      dir,
      "config.ts",
      'const key = "sk-abc12345678901234567890";',
    );
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([file]);
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
    const secretIssue = result.issues.find((i) => i.type === "secret");
    expect(secretIssue).toBeDefined();
    expect(secretIssue!.message).toContain("OpenAI API key");
  });

  it("check() detects AWS access key pattern", () => {
    const dir = makeTempDir();
    const file = makeTempFile(
      dir,
      "env.ts",
      'const aws = "AKIAIOSFODNN7EXAMPLE";',
    );
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([file]);
    expect(result.passed).toBe(false);
    const secretIssue = result.issues.find(
      (i) => i.type === "secret" && i.message.includes("AWS"),
    );
    expect(secretIssue).toBeDefined();
  });

  it("check() detects private key header", () => {
    const dir = makeTempDir();
    const file = makeTempFile(
      dir,
      "key.ts",
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEp...',
    );
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([file]);
    expect(result.passed).toBe(false);
    const secretIssue = result.issues.find(
      (i) => i.type === "secret" && i.message.includes("Private key"),
    );
    expect(secretIssue).toBeDefined();
  });

  it("check() detects password assignment pattern", () => {
    const dir = makeTempDir();
    const file = makeTempFile(
      dir,
      "db.ts",
      "const password = 'my-secret-pass';",
    );
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([file]);
    expect(result.passed).toBe(false);
    const secretIssue = result.issues.find(
      (i) => i.type === "secret" && i.message.includes("password"),
    );
    expect(secretIssue).toBeDefined();
  });

  it("check() detects AI slop patterns in .ts files", () => {
    const dir = makeTempDir();
    const file = makeTempFile(
      dir,
      "handler.ts",
      '// As an AI, I cannot do this\nconsole.log("hello");',
    );
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([file]);
    expect(result.passed).toBe(false);
    const slopIssue = result.issues.find((i) => i.type === "ai_slop");
    expect(slopIssue).toBeDefined();
    expect(slopIssue!.message).toContain("AI-generated text");
  });

  it("check() does NOT flag AI slop patterns in .md files", () => {
    const dir = makeTempDir();
    const file = makeTempFile(
      dir,
      "README.md",
      "# FAQ\n\nAs an AI assistant, I can help with...\nI apologize for any confusion.",
    );
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([file]);
    // .md files should not trigger AI slop detection
    const slopIssues = result.issues.filter((i) => i.type === "ai_slop");
    expect(slopIssues).toHaveLength(0);
  });

  it("check() detects oversized files", () => {
    const dir = makeTempDir();
    // Create a file > 500KB
    const bigContent = "x".repeat(600 * 1024);
    const file = makeTempFile(dir, "big.ts", bigContent);
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([file]);
    expect(result.passed).toBe(false);
    const sizeIssue = result.issues.find((i) => i.type === "file_size");
    expect(sizeIssue).toBeDefined();
    expect(sizeIssue!.message).toContain("exceeds");
  });

  it("check() returns all issues found across multiple files", () => {
    const dir = makeTempDir();
    const fileWithSecret = makeTempFile(
      dir,
      "secret.ts",
      'const t = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";',
    );
    const fileWithSlop = makeTempFile(
      dir,
      "slop.ts",
      '// Let me help you with this\nconsole.log("hi");',
    );
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([fileWithSecret, fileWithSlop]);
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
    // Should have issues from both files
    const files = new Set(result.issues.map((i) => i.file));
    expect(files.size).toBe(2);
  });

  it("check() handles missing files gracefully", () => {
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check(["/nonexistent/path/to/file.ts"]);
    // Should not throw — just skip unreadable files
    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("check() with clean files returns passed: true", () => {
    const dir = makeTempDir();
    const file = makeTempFile(
      dir,
      "clean.ts",
      'export function add(a: number, b: number): number {\n  return a + b;\n}\n',
    );
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([file]);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("check() detects GitHub token pattern", () => {
    const dir = makeTempDir();
    const file = makeTempFile(
      dir,
      "auth.ts",
      'const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";',
    );
    const gate = new QualityGate(DEFAULT_CONFIG);
    const result = gate.check([file]);
    expect(result.passed).toBe(false);
    const secretIssue = result.issues.find(
      (i) => i.type === "secret" && i.message.includes("GitHub"),
    );
    expect(secretIssue).toBeDefined();
  });
});
