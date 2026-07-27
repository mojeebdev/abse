import { describe, expect, it } from "vitest";
import { rankCandidates } from "./leaderboard";

describe("Leaderboard ranking", () => {
  it("is stable and deterministic", () => {
    const ranked = rankCandidates([
      { userId: "b", score: 10, updatedAt: "2026-01-02T00:00:00Z" },
      { userId: "a", score: 10, updatedAt: "2026-01-01T00:00:00Z" },
      { userId: "c", score: 20, updatedAt: "2026-01-03T00:00:00Z" },
    ]);
    expect(ranked.map((item) => item.userId)).toEqual(["c", "a", "b"]);
  });
});

