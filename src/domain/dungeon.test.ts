import { describe, expect, it } from "vitest";
import { initialDevelopmentBuild } from "../fixtures/development";
import { createDungeonRun, resolveCombatTurn } from "./dungeon";

describe("Dependency Depths engine", () => {
  it("creates deterministic runs from a seed", () => {
    const first = createDungeonRun("run-1", "seed-1", initialDevelopmentBuild);
    const second = createDungeonRun("run-1", "seed-1", initialDevelopmentBuild);
    expect(first).toEqual(second);
  });

  it("returns the stored result for a duplicate idempotency key", () => {
    const started = createDungeonRun("run-1", "seed-1", initialDevelopmentBuild);
    const resolved = resolveCombatTurn(started, { type: "attack" }, initialDevelopmentBuild, "action-1");
    const duplicate = resolveCombatTurn(resolved, { type: "attack" }, initialDevelopmentBuild, "action-1");
    expect(duplicate).toBe(resolved);
  });

  it("is deterministic for the same valid action", () => {
    const started = createDungeonRun("run-1", "seed-1", initialDevelopmentBuild);
    const first = resolveCombatTurn(started, { type: "defend" }, initialDevelopmentBuild, "action-1");
    const second = resolveCombatTurn(started, { type: "defend" }, initialDevelopmentBuild, "action-1");
    expect(first).toEqual(second);
  });

  it("can complete the full five-room dungeon", () => {
    const expeditionBuild = {
      ...initialDevelopmentBuild,
      attributes: { force: 26, guard: 24, momentum: 20, precision: 23, insight: 23 },
    };
    let state = createDungeonRun("run-1", "completion-seed", expeditionBuild);
    for (let index = 0; index < 80 && state.status === "active"; index += 1) {
      const action =
        state.eventPending === "conflicts"
          ? ({ type: "event", choice: "inspect" } as const)
          : state.eventPending === "cache"
            ? ({ type: "event", choice: "recover" } as const)
        : state.health < 80
          ? ({ type: "recover" } as const)
          : state.energy >= 2 && !(state.cooldowns["async-lunge"] > 0)
            ? ({ type: "ability", abilityId: "async-lunge" } as const)
            : ({ type: "attack" } as const);
      state = resolveCombatTurn(state, action, expeditionBuild, `action-${index}`);
    }
    expect(state.status).toBe("completed");
    expect(state.roomIndex).toBe(4);
    expect(state.processedKeys.length).toBeGreaterThan(0);
  });

  it("enforces ability cooldowns", () => {
    const started = createDungeonRun("run-1", "seed-1", initialDevelopmentBuild);
    const first = resolveCombatTurn(
      started,
      { type: "ability", abilityId: "async-lunge" },
      initialDevelopmentBuild,
      "action-1",
    );
    expect(() =>
      resolveCombatTurn(
        first,
        { type: "ability", abilityId: "async-lunge" },
        initialDevelopmentBuild,
        "action-2",
      ),
    ).toThrow("INVALID_ACTION");
  });
});
