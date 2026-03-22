import {
  appendFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import type { ActivityEventType, StupidConfig } from "../types/index.js";

interface ActivityEvent {
  type: ActivityEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Writes structured JSONL audit trails to `.stupid/activity/YYYY-MM-DD.jsonl`.
 * Each line is an independently parseable JSON object.
 */
export class ActivityLogger {
  private readonly activityDir: string;

  constructor(private readonly config: StupidConfig) {
    this.activityDir = join(config.projectRoot, ".stupid", "activity");
  }

  /**
   * Appends a single event as a JSON line to the day's log file.
   */
  log(event: {
    type: ActivityEventType;
    data: Record<string, unknown>;
    timestamp?: string;
  }): void {
    if (!existsSync(this.activityDir)) {
      mkdirSync(this.activityDir, { recursive: true });
    }

    const entry: ActivityEvent = {
      type: event.type,
      data: event.data,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };

    const dateStr = entry.timestamp.slice(0, 10); // YYYY-MM-DD
    const logFile = join(this.activityDir, `${dateStr}.jsonl`);
    appendFileSync(logFile, JSON.stringify(entry) + "\n", "utf-8");
  }

  /**
   * Reads and parses JSONL events for a given date, optionally filtering by type.
   * Returns empty array if the file or directory doesn't exist.
   */
  readLogs(options?: {
    date?: string;
    type?: ActivityEventType;
  }): ActivityEvent[] {
    const dateStr = options?.date ?? new Date().toISOString().slice(0, 10);
    const logFile = join(this.activityDir, `${dateStr}.jsonl`);

    if (!existsSync(logFile)) {
      return [];
    }

    try {
      const raw = readFileSync(logFile, "utf-8");
      const lines = raw.trim().split("\n").filter(Boolean);
      const events = lines.map((line) => JSON.parse(line) as ActivityEvent);

      if (options?.type) {
        return events.filter((e) => e.type === options.type);
      }

      return events;
    } catch {
      return [];
    }
  }
}
