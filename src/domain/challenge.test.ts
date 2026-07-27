import { describe, expect, it } from "vitest";
import { challengeExpired, compareChallengeScores } from "./challenge";

describe("Challenges", () => {
  it("uses score, turns, then health as deterministic tie-breakers", () => {
    expect(compareChallengeScores(
      { dungeonScore: 1_200, turns: 20, healthRemaining: 10 },
      { dungeonScore: 1_100, turns: 10, healthRemaining: 100 },
    )).toBe("challenger");
    expect(compareChallengeScores(
      { dungeonScore: 1_200, turns: 22, healthRemaining: 100 },
      { dungeonScore: 1_200, turns: 20, healthRemaining: 10 },
    )).toBe("challenged");
  });

  it("fails closed on invalid or elapsed expiry", () => {
    expect(challengeExpired("invalid")).toBe(true);
    expect(challengeExpired("2025-01-01T00:00:00Z", new Date("2026-01-01T00:00:00Z"))).toBe(true);
  });
});

