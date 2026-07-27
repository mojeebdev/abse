import { describe, expect, it } from "vitest";
import { initialDevelopmentBuild } from "../fixtures/development";
import { createDungeonRun } from "./dungeon";
import { calculateDungeonRewards, levelForExperience } from "./progression";

describe("Progression rewards", () => {
  it("does not issue competitive rewards for a failed run", () => {
    const run = { ...createDungeonRun("run", "seed", initialDevelopmentBuild), status: "failed" as const };
    expect(calculateDungeonRewards(run)).toEqual({
      experience: 20,
      seasonalRating: 0,
      influence: 0,
      dungeonScore: 0,
    });
  });

  it("rewards efficient completed runs deterministically", () => {
    const run = {
      ...createDungeonRun("run", "seed", initialDevelopmentBuild),
      status: "completed" as const,
      turn: 20,
      health: 100,
      maxHealth: 150,
    };
    expect(calculateDungeonRewards(run)).toEqual(calculateDungeonRewards(structuredClone(run)));
    expect(calculateDungeonRewards(run).influence).toBeGreaterThan(0);
  });

  it("derives levels monotonically", () => {
    expect(levelForExperience(0)).toBe(1);
    expect(levelForExperience(900)).toBeGreaterThan(levelForExperience(100));
  });
});

