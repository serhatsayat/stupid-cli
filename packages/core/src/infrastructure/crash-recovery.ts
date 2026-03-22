import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import type { SessionState, StupidConfig } from "../types/index.js";

interface LockData {
  pid: number;
  startedAt: string;
  heartbeat: string;
}

/**
 * Manages lock files with PID-based stale detection for crash recovery.
 * Lock file: `.stupid/auto.lock` — contains the owning PID and timestamps.
 */
export class CrashRecovery {
  private readonly stateDir: string;
  private readonly lockFile: string;
  private readonly stateFile: string;

  constructor(private readonly config: StupidConfig) {
    this.stateDir = join(config.projectRoot, ".stupid");
    this.lockFile = join(this.stateDir, "auto.lock");
    this.stateFile = join(this.stateDir, "state.json");
  }

  /**
   * Acquires an exclusive lock. Returns false if another live process holds it.
   */
  acquireLock(): boolean {
    if (!existsSync(this.stateDir)) {
      mkdirSync(this.stateDir, { recursive: true });
    }

    if (existsSync(this.lockFile)) {
      try {
        const raw = readFileSync(this.lockFile, "utf-8");
        const lock = JSON.parse(raw) as LockData;
        if (this.isPidAlive(lock.pid)) {
          return false; // Lock held by a live process
        }
      } catch {
        // Corrupt lock file — overwrite it
      }
    }

    const lock: LockData = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      heartbeat: new Date().toISOString(),
    };
    writeFileSync(this.lockFile, JSON.stringify(lock, null, 2), "utf-8");
    return true;
  }

  /**
   * Releases the lock file if it exists.
   */
  releaseLock(): void {
    try {
      unlinkSync(this.lockFile);
    } catch (err: unknown) {
      // Ignore ENOENT — already removed
      if (
        err instanceof Error &&
        (err as NodeJS.ErrnoException).code !== "ENOENT"
      ) {
        throw err;
      }
    }
  }

  /**
   * Checks if a previous session crashed (stale lock with dead PID).
   * Returns null if no lock file exists.
   */
  detectCrash(): {
    crashed: boolean;
    stalePid?: number;
    lockAge?: string;
  } | null {
    if (!existsSync(this.lockFile)) {
      return null;
    }

    try {
      const raw = readFileSync(this.lockFile, "utf-8");
      const lock = JSON.parse(raw) as LockData;

      if (this.isPidAlive(lock.pid)) {
        return { crashed: false };
      }

      return {
        crashed: true,
        stalePid: lock.pid,
        lockAge: lock.startedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Updates the heartbeat timestamp in the lock file.
   */
  updateHeartbeat(): void {
    if (!existsSync(this.lockFile)) {
      return;
    }

    try {
      const raw = readFileSync(this.lockFile, "utf-8");
      const lock = JSON.parse(raw) as LockData;
      lock.heartbeat = new Date().toISOString();
      writeFileSync(this.lockFile, JSON.stringify(lock, null, 2), "utf-8");
    } catch {
      // Lock file gone or corrupt — nothing to update
    }
  }

  /**
   * Reads state.json to find the last active slice/task for resumption.
   */
  getResumePoint(): { sliceId?: string; taskId?: string } | null {
    if (!existsSync(this.stateFile)) {
      return null;
    }

    try {
      const raw = readFileSync(this.stateFile, "utf-8");
      const state = JSON.parse(raw) as { progress: SessionState };
      return {
        sliceId: state.progress.currentSliceId,
        taskId: state.progress.currentTaskId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Checks if a process with the given PID is alive.
   */
  private isPidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
