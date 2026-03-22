import { readFileSync, statSync } from "node:fs";
import type { StupidConfig } from "../types/index.js";

export interface QualityIssue {
  file: string;
  type: string;
  message: string;
}

export interface QualityCheckResult {
  passed: boolean;
  issues: QualityIssue[];
}

/**
 * Pre-commit quality gate that scans files for secrets, oversized files,
 * and AI slop patterns.
 */
export class QualityGate {
  private readonly maxFileSizeBytes: number;

  /** Patterns that indicate hardcoded secrets. */
  private static readonly SECRET_PATTERNS: Array<{
    pattern: RegExp;
    label: string;
  }> = [
    { pattern: /sk-[a-zA-Z0-9]{20,}/, label: "OpenAI API key" },
    { pattern: /AKIA[A-Z0-9]{16}/, label: "AWS access key" },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, label: "GitHub personal access token" },
    {
      pattern: /-----BEGIN[A-Z ]*PRIVATE KEY/,
      label: "Private key header",
    },
    {
      pattern: /password\s*=\s*['"]/,
      label: "Hardcoded password assignment",
    },
  ];

  /** AI slop phrases that should not appear in source code. */
  private static readonly AI_SLOP_PATTERNS: RegExp[] = [
    /As an AI/i,
    /I apologize/i,
    /Here's the code/i,
    /Let me help/i,
  ];

  /** File extensions that are considered source code (not documentation). */
  private static readonly SOURCE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".rs",
    ".go",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".rb",
    ".swift",
    ".kt",
  ]);

  constructor(private readonly config: StupidConfig) {
    // Default max file size: 500KB
    this.maxFileSizeBytes = 500 * 1024;
  }

  /**
   * Scan the provided files for quality issues.
   * If no files are provided, returns a clean result.
   */
  check(files?: string[]): QualityCheckResult {
    const issues: QualityIssue[] = [];

    if (!files || files.length === 0) {
      return { passed: true, issues: [] };
    }

    for (const file of files) {
      this.checkFile(file, issues);
    }

    return {
      passed: issues.length === 0,
      issues,
    };
  }

  private checkFile(file: string, issues: QualityIssue[]): void {
    // Check file size first (doesn't need content read)
    try {
      const stat = statSync(file);
      if (stat.size > this.maxFileSizeBytes) {
        issues.push({
          file,
          type: "file_size",
          message: `File exceeds ${this.maxFileSizeBytes} bytes (${stat.size} bytes)`,
        });
      }
    } catch {
      // File doesn't exist or inaccessible — skip size check
    }

    // Read file content for pattern checks
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      // Can't read file — skip content checks
      return;
    }

    // Secret detection — applies to all files
    this.checkSecrets(file, content, issues);

    // AI slop detection — only in source code files, not markdown/docs
    if (this.isSourceFile(file)) {
      this.checkAiSlop(file, content, issues);
    }
  }

  private checkSecrets(
    file: string,
    content: string,
    issues: QualityIssue[],
  ): void {
    for (const { pattern, label } of QualityGate.SECRET_PATTERNS) {
      if (pattern.test(content)) {
        issues.push({
          file,
          type: "secret",
          message: `Potential secret detected: ${label}`,
        });
      }
    }
  }

  private checkAiSlop(
    file: string,
    content: string,
    issues: QualityIssue[],
  ): void {
    for (const pattern of QualityGate.AI_SLOP_PATTERNS) {
      if (pattern.test(content)) {
        issues.push({
          file,
          type: "ai_slop",
          message: `AI-generated text pattern detected: ${pattern.source}`,
        });
      }
    }
  }

  private isSourceFile(file: string): boolean {
    const dotIndex = file.lastIndexOf(".");
    if (dotIndex === -1) return false;
    const ext = file.slice(dotIndex).toLowerCase();
    return QualityGate.SOURCE_EXTENSIONS.has(ext);
  }
}
