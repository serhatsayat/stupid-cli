import { describe, it, expect } from "vitest";
import { BudgetEnforcer } from "../governance/budget-enforcer.js";
import { DEFAULT_CONFIG } from "../index.js";
import type { IBudgetEnforcer, StupidConfig } from "../index.js";

describe("BudgetEnforcer", () => {
  // DEFAULT_CONFIG: softLimitUsd = 1.0, hardLimitUsd = 5.0

  it("implements IBudgetEnforcer interface", () => {
    const enforcer: IBudgetEnforcer = new BudgetEnforcer(DEFAULT_CONFIG);
    expect(enforcer).toBeDefined();
    expect(typeof enforcer.check).toBe("function");
    expect(typeof enforcer.getRemainingBudget).toBe("function");
  });

  it('check(0) returns "ok"', () => {
    const enforcer = new BudgetEnforcer(DEFAULT_CONFIG);
    expect(enforcer.check(0)).toBe("ok");
  });

  it('check(below soft limit) returns "ok"', () => {
    const enforcer = new BudgetEnforcer(DEFAULT_CONFIG);
    expect(enforcer.check(0.99)).toBe("ok");
  });

  it('check(softLimit) returns "soft_warning"', () => {
    const enforcer = new BudgetEnforcer(DEFAULT_CONFIG);
    expect(enforcer.check(1.0)).toBe("soft_warning");
  });

  it('check(between soft and hard) returns "soft_warning"', () => {
    const enforcer = new BudgetEnforcer(DEFAULT_CONFIG);
    expect(enforcer.check(3.0)).toBe("soft_warning");
  });

  it('check(hardLimit) returns "hard_stop"', () => {
    const enforcer = new BudgetEnforcer(DEFAULT_CONFIG);
    expect(enforcer.check(5.0)).toBe("hard_stop");
  });

  it('check(above hardLimit) returns "hard_stop"', () => {
    const enforcer = new BudgetEnforcer(DEFAULT_CONFIG);
    expect(enforcer.check(10.0)).toBe("hard_stop");
  });

  it("getRemainingBudget() returns hardLimitUsd", () => {
    const enforcer = new BudgetEnforcer(DEFAULT_CONFIG);
    expect(enforcer.getRemainingBudget()).toBe(5.0);
  });

  it("works with custom config values", () => {
    const customConfig: StupidConfig = {
      ...DEFAULT_CONFIG,
      budget: {
        softLimitUsd: 0.5,
        hardLimitUsd: 2.0,
        warningThresholdPercent: 80,
      },
    };
    const enforcer = new BudgetEnforcer(customConfig);
    expect(enforcer.check(0.3)).toBe("ok");
    expect(enforcer.check(0.5)).toBe("soft_warning");
    expect(enforcer.check(1.5)).toBe("soft_warning");
    expect(enforcer.check(2.0)).toBe("hard_stop");
    expect(enforcer.getRemainingBudget()).toBe(2.0);
  });
});
