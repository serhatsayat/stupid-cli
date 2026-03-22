import { describe, it, expect } from "vitest";
import stupid from "../index.js";

describe("@stupid/pi-extension", () => {
  it("exports a default function", () => {
    expect(typeof stupid).toBe("function");
  });
});
