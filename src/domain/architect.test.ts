import { describe, expect, it } from "vitest";
import {
  BuildValidationError,
  deriveCombatStats,
  validateArchitectBuild,
} from "./architect";
import { calculateForgeProfile } from "./scoring";
import {
  developmentInventory,
  developmentMetrics,
  initialDevelopmentBuild,
} from "../fixtures/development";

describe("Architect validation", () => {
  const score = calculateForgeProfile(developmentMetrics);

  it("accepts a valid verified build", () => {
    expect(() =>
      validateArchitectBuild(initialDevelopmentBuild, score, developmentInventory, 1),
    ).not.toThrow();
  });

  it("rejects excess and negative allocations", () => {
    expect(() =>
      validateArchitectBuild(
        {
          ...initialDevelopmentBuild,
          attributes: { force: 999, guard: 0, momentum: 0, precision: 0, insight: 0 },
        },
        score,
        developmentInventory,
      ),
    ).toThrow(BuildValidationError);
    expect(() =>
      validateArchitectBuild(
        {
          ...initialDevelopmentBuild,
          attributes: { ...initialDevelopmentBuild.attributes, insight: -1 },
        },
        score,
        developmentInventory,
      ),
    ).toThrow("non-negative");
  });

  it("rejects stale versions and unowned loadout items", () => {
    expect(() =>
      validateArchitectBuild(initialDevelopmentBuild, score, developmentInventory, 2),
    ).toThrow("changed elsewhere");
    expect(() =>
      validateArchitectBuild(
        { ...initialDevelopmentBuild, activeAbilityIds: ["type-guard", "async-lunge", "cheat"] },
        score,
        developmentInventory,
      ),
    ).toThrow("unowned ability");
  });

  it("derives combat stats without mutating attributes", () => {
    const attributes = structuredClone(initialDevelopmentBuild.attributes);
    const stats = deriveCombatStats(attributes);
    expect(stats.maxHealth).toBeGreaterThan(90);
    expect(attributes).toEqual(initialDevelopmentBuild.attributes);
  });
});

