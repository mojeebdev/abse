import { describe, expect, it } from "vitest";
import { developmentMetrics } from "../fixtures/development";
import { CALCULATION_VERSION, calculateForgeProfile, normalizeMetric } from "./scoring";

describe("GitHub scoring", () => {
  it("applies zero floor and logarithmic caps", () => {
    expect(normalizeMetric(-10, 100)).toBe(0);
    expect(normalizeMetric(100, 100)).toBe(1);
    expect(normalizeMetric(10000, 100)).toBe(1);
  });

  it("is deterministic and explainable", () => {
    const first = calculateForgeProfile(developmentMetrics);
    const second = calculateForgeProfile(structuredClone(developmentMetrics));
    expect(first).toEqual(second);
    expect(first.calculationVersion).toBe(CALCULATION_VERSION);
    expect(first.totalForgePoints).toBeGreaterThan(0);
    expect(first.explanation.every((item) => item.normalized <= item.cap)).toBe(true);
    expect(first.totalForgePoints).toBe(
      Object.values(first.potentials).reduce((sum, value) => sum + value, 0),
    );
  });

  it("does not create meaningful power from empty activity", () => {
    const empty = calculateForgeProfile({
      accountAgeDays: 0,
      meaningfulRepoCount: 0,
      totalVerifiedCommits: 0,
      recentVerifiedCommits: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
      activeWeeksLastYear: 0,
      pullRequestsMerged: 0,
      externalPullRequestsMerged: 0,
      releasesCount: 0,
      maintainedRepoCount: 0,
      languageDistribution: {},
    });
    expect(empty.totalForgePoints).toBe(0);
    expect(empty.traits).toEqual([]);
  });
});

