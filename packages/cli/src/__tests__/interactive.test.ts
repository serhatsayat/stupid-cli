import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

const mockRun = vi.fn().mockResolvedValue(undefined);
const mockSessionManager = { id: "mock-session-mgr" };
const mockSession = { id: "mock-session" };

vi.mock("@mariozechner/pi-coding-agent", () => {
  return {
    createAgentSession: vi.fn().mockResolvedValue({
      session: { id: "mock-session" },
      extensionsResult: {},
      modelFallbackMessage: undefined,
    }),
    InteractiveMode: vi.fn().mockImplementation(() => ({
      run: mockRun,
    })),
    SessionManager: {
      create: vi.fn().mockReturnValue({ id: "mock-session-mgr" }),
      continueRecent: vi.fn().mockReturnValue({ id: "mock-session-mgr-continue" }),
    },
    codingTools: [],
  };
});

vi.mock("../auth.js", () => ({
  getAuthStorage: vi.fn().mockReturnValue({ type: "mock-auth-storage" }),
  getModelRegistry: vi.fn().mockReturnValue({ type: "mock-model-registry" }),
  getSettingsManager: vi.fn().mockReturnValue({ type: "mock-settings-manager" }),
}));

// Mock fs operations to avoid real filesystem side-effects
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  };
});

// ── Imports (after mocks) ────────────────────────────────────────────

import {
  createAgentSession,
  InteractiveMode,
  SessionManager,
  codingTools,
} from "@mariozechner/pi-coding-agent";
import { getAuthStorage, getModelRegistry, getSettingsManager } from "../auth.js";

// ── Test suite ───────────────────────────────────────────────────────

describe("launchInteractiveMode", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = undefined;
  });

  /**
   * Helper: import fresh module each test to reset module-level state.
   * vi.mock hoists apply before each dynamic import.
   */
  async function getLaunchFn() {
    const mod = await import("../interactive.js");
    return mod.launchInteractiveMode;
  }

  it("calls SessionManager.create() when continue is false", async () => {
    const launch = await getLaunchFn();
    await launch({ continue: false });

    expect(SessionManager.create).toHaveBeenCalledTimes(1);
    const [cwd, sessionDir] = (SessionManager.create as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(typeof cwd).toBe("string");
    expect(sessionDir).toContain(".stupid");
    expect(sessionDir).toContain("agent");
  });

  it("calls SessionManager.continueRecent() when continue is true", async () => {
    const launch = await getLaunchFn();
    await launch({ continue: true });

    expect(SessionManager.continueRecent).toHaveBeenCalledTimes(1);
    expect(SessionManager.create).not.toHaveBeenCalled();
    const [cwd, sessionDir] = (SessionManager.continueRecent as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(typeof cwd).toBe("string");
    expect(sessionDir).toContain(".stupid");
  });

  it("passes agentDir containing .stupid/agent to createAgentSession", async () => {
    const launch = await getLaunchFn();
    await launch({});

    expect(createAgentSession).toHaveBeenCalledTimes(1);
    const opts = (createAgentSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(opts.agentDir).toContain(".stupid");
    expect(opts.agentDir).toContain("agent");
  });

  it("passes auth exports to createAgentSession", async () => {
    const launch = await getLaunchFn();
    await launch({});

    const opts = (createAgentSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(opts.authStorage).toEqual({ type: "mock-auth-storage" });
    expect(opts.modelRegistry).toEqual({ type: "mock-model-registry" });
    expect(opts.settingsManager).toEqual({ type: "mock-settings-manager" });
  });

  it("passes codingTools to createAgentSession", async () => {
    const launch = await getLaunchFn();
    await launch({});

    const opts = (createAgentSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(opts.tools).toBe(codingTools);
  });

  it("passes sessionManager to createAgentSession", async () => {
    const launch = await getLaunchFn();
    await launch({ continue: false });

    const opts = (createAgentSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // SessionManager.create returns our mock
    expect(opts.sessionManager).toEqual({ id: "mock-session-mgr" });
  });

  it("constructs InteractiveMode with the session from createAgentSession", async () => {
    const launch = await getLaunchFn();
    await launch({});

    expect(InteractiveMode).toHaveBeenCalledTimes(1);
    const [session] = (InteractiveMode as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(session).toEqual({ id: "mock-session" });
  });

  it("calls mode.run()", async () => {
    const launch = await getLaunchFn();
    await launch({});

    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it("prints welcome banner before run()", async () => {
    const launch = await getLaunchFn();
    await launch({});

    // At least one console.log call should contain "stupid"
    const allOutput = consoleLogSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    expect(allOutput).toContain("stupid");
  });

  it("prints 'Resuming session...' when continue is true", async () => {
    const launch = await getLaunchFn();
    await launch({ continue: true });

    const allOutput = consoleLogSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    expect(allOutput).toContain("Resuming session");
  });

  it("prints 'New session started' when continue is false", async () => {
    const launch = await getLaunchFn();
    await launch({ continue: false });

    const allOutput = consoleLogSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    expect(allOutput).toContain("New session started");
  });

  it("prints error to stderr and sets exitCode on createAgentSession failure", async () => {
    (createAgentSession as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("auth failed"),
    );

    const launch = await getLaunchFn();
    await launch({});

    const errorOutput = consoleErrorSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    expect(errorOutput).toContain("Failed to launch interactive mode");
    expect(errorOutput).toContain("auth failed");
    expect(process.exitCode).toBe(1);
  });

  it("does not print welcome banner when createAgentSession fails", async () => {
    (createAgentSession as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("boom"),
    );

    const launch = await getLaunchFn();
    await launch({});

    const logOutput = consoleLogSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    // Banner should NOT appear — it's inside the try block after createAgentSession
    expect(logOutput).not.toContain("New session started");
  });
});

describe("getSessionDir", () => {
  it("returns a path containing .stupid/agent/sessions", async () => {
    const { getSessionDir } = await import("../interactive.js");
    const dir = getSessionDir("/some/project");
    expect(dir).toContain(".stupid");
    expect(dir).toContain("agent");
    expect(dir).toContain("sessions");
  });

  it("encodes the cwd into the directory name", async () => {
    const { getSessionDir } = await import("../interactive.js");
    const dir = getSessionDir("/some/project");
    // The encoded name should start and end with --
    const dirName = dir.split("/").pop() ?? "";
    expect(dirName).toMatch(/^--.*--$/);
  });
});
