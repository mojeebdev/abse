import { describe, expect, it } from "vitest";
import { influenceBalance, resolveTerritory } from "./territory";

describe("Territory resolution", () => {
  it("uses deterministic faction-id ordering for equal attacks", () => {
    const resolved = resolveTerritory({
      ownerFactionId: "rust",
      defenceInfluence: 10,
      attackInfluenceByFaction: { typescript: 25, python: 25 },
      stateVersion: 4,
    });
    expect(resolved.ownerFactionId).toBe("python");
    expect(resolved.nextStateVersion).toBe(5);
  });

  it("lets defence win ties", () => {
    expect(resolveTerritory({
      ownerFactionId: "rust",
      defenceInfluence: 25,
      attackInfluenceByFaction: { python: 25 },
      stateVersion: 1,
    }).ownerFactionId).toBe("rust");
  });

  it("never returns a negative influence balance", () => {
    expect(influenceBalance([20, 10], [5])).toBe(25);
    expect(influenceBalance([10], [40])).toBe(0);
  });
});

