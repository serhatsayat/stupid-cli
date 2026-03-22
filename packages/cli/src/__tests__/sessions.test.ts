import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

const mockSessions = [
  {
    id: "abc12345-long-session-id",
    path: "/tmp/sessions/abc",
    cwd: "/projects/my-app",
    created: new Date("2026-03-22T10:00:00Z"),
    modified: new Date("2026-03-22T12:00:00Z"),
    messageCount: 5,
    firstMessage: "fix the authentication bug in login.ts",
    allMessagesText: "fix the authentication bug in login.ts\nDone!",
  },
  {
    id: "def67890-another-session-id",
    path: "/tmp/sessions/def",
    cwd: "/projects/my-app",
    created: new Date("2026-03-21T08:00:00Z"),
    modified: new Date("2026-03-21T09:00:00Z"),
    messageCount: 12,
    firstMessage: "add unit tests for the payment module with comprehensive edge cases and error handling scenarios",
    allMessagesText: "add unit tests...",
  },
];

vi.mock("@mariozechner/pi-coding-agent", () => ({
  SessionManager: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

// Mock interactive.js to provide a predictable session dir
vi.mock("../interactive.js", () => ({
  getSessionDir: vi.fn().mockReturnValue("/mock/.stupid/agent/sessions/--mock-cwd--"),
}));

// Mock fs operations called inside getSessionDir (if re-exported)
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  };
});

// ── Imports (after mocks) ────────────────────────────────────────────

import { SessionManager } from "@mariozechner/pi-coding-agent";
import { getSessionDir } from "../interactive.js";

// ── Test suite ───────────────────────────────────────────────────────

describe("sessionsCommand", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = undefined;
  });

  async function getSessCmd() {
    const mod = await import("../commands/sessions.js");
    return mod.sessionsCommand;
  }

  it("calls SessionManager.list() with cwd and sessionDir", async () => {
    const sessionsCommand = await getSessCmd();
    await sessionsCommand();

    expect(SessionManager.list).toHaveBeenCalledTimes(1);
    const [cwd, sessionDir] = (SessionManager.list as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(typeof cwd).toBe("string");
    // sessionDir should come from getSessionDir mock
    expect(sessionDir).toContain(".stupid");
    expect(sessionDir).toContain("agent");
  });

  it("handles empty sessions list without crashing", async () => {
    (SessionManager.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const sessionsCommand = await getSessCmd();
    await sessionsCommand();

    // Should print a friendly message, not throw
    const output = consoleLogSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    expect(output.toLowerCase()).toContain("no sessions");
  });

  it("displays session info when sessions exist", async () => {
    (SessionManager.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSessions);

    const sessionsCommand = await getSessCmd();
    await sessionsCommand();

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    // Should contain session count
    expect(output).toContain("2");
    // Should contain first message preview
    expect(output).toContain("fix the authentication bug");
    // Should contain message count
    expect(output).toContain("5");
    expect(output).toContain("12");
  });

  it("truncates long first messages", async () => {
    (SessionManager.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSessions);

    const sessionsCommand = await getSessCmd();
    await sessionsCommand();

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    // The second session has a very long firstMessage (> 60 chars) — should be truncated with "…"
    expect(output).toContain("…");
  });

  it("shows session ID prefix", async () => {
    (SessionManager.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSessions);

    const sessionsCommand = await getSessCmd();
    await sessionsCommand();

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    // Session IDs should appear as 8-char prefixes
    expect(output).toContain("abc12345");
    expect(output).toContain("def67890");
  });

  it("prints error to stderr when SessionManager.list() fails", async () => {
    (SessionManager.list as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("ENOENT: no such directory"),
    );

    const sessionsCommand = await getSessCmd();
    await sessionsCommand();

    const errorOutput = consoleErrorSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    expect(errorOutput).toContain("Failed to list sessions");
    expect(errorOutput).toContain("ENOENT");
    expect(process.exitCode).toBe(1);
  });

  it("uses getSessionDir from interactive module", async () => {
    const sessionsCommand = await getSessCmd();
    await sessionsCommand();

    expect(getSessionDir).toHaveBeenCalledTimes(1);
    const [cwd] = (getSessionDir as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(typeof cwd).toBe("string");
  });

  it("shows guidance message when no sessions exist", async () => {
    (SessionManager.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const sessionsCommand = await getSessCmd();
    await sessionsCommand();

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    // Should suggest starting a session
    expect(output.toLowerCase()).toContain("stupid");
  });
});
