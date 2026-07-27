import type {
  Attribute,
  Attributes,
  GitHubMetrics,
  MetricExplanation,
  ScoreCalculation,
  TraitUnlock,
} from "./types";

export const CALCULATION_VERSION = "forge-2026.1";

interface MetricRule {
  key: keyof Omit<GitHubMetrics, "languageDistribution">;
  label: string;
  reference: number;
  cap: number;
  weight: number;
  attribute: Attribute;
}

const RULES: MetricRule[] = [
  { key: "totalVerifiedCommits", label: "Verified commits", reference: 900, cap: 1, weight: 18, attribute: "force" },
  { key: "releasesCount", label: "Shipped releases", reference: 24, cap: 1, weight: 8, attribute: "force" },
  { key: "maintainedRepoCount", label: "Maintained repositories", reference: 12, cap: 1, weight: 18, attribute: "guard" },
  { key: "accountAgeDays", label: "Account longevity", reference: 3650, cap: 1, weight: 8, attribute: "guard" },
  { key: "activeWeeksLastYear", label: "Active weeks", reference: 48, cap: 1, weight: 16, attribute: "momentum" },
  { key: "longestStreakDays", label: "Longest active streak", reference: 120, cap: 1, weight: 10, attribute: "momentum" },
  { key: "pullRequestsMerged", label: "Merged pull requests", reference: 120, cap: 1, weight: 13, attribute: "precision" },
  { key: "externalPullRequestsMerged", label: "External merges", reference: 60, cap: 1, weight: 10, attribute: "precision" },
  { key: "meaningfulRepoCount", label: "Meaningful repositories", reference: 35, cap: 1, weight: 10, attribute: "insight" },
];

export function normalizeMetric(value: number, reference: number, cap = 1): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(cap, Math.log1p(value) / Math.log1p(reference));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateForgeProfile(metrics: GitHubMetrics): ScoreCalculation {
  const potentials: Attributes = { force: 0, guard: 0, momentum: 0, precision: 0, insight: 0 };
  const explanation: MetricExplanation[] = RULES.map((rule) => {
    const raw = metrics[rule.key];
    const normalized = normalizeMetric(raw, rule.reference, rule.cap);
    const points = round(normalized * rule.weight);
    potentials[rule.attribute] += points;
    return { key: rule.key, label: rule.label, raw, normalized: round(normalized), cap: rule.cap, points };
  });

  const languageCount = Object.values(metrics.languageDistribution).filter((share) => share >= 0.08).length;
  const languagePoints = round(normalizeMetric(languageCount, 6) * 9);
  potentials.insight += languagePoints;
  explanation.push({
    key: "languageBreadth",
    label: "Language breadth",
    raw: languageCount,
    normalized: round(normalizeMetric(languageCount, 6)),
    cap: 1,
    points: languagePoints,
  });

  for (const attribute of Object.keys(potentials) as Attribute[]) {
    potentials[attribute] = Math.round(potentials[attribute]);
  }

  const languages = Object.entries(metrics.languageDistribution).sort((a, b) => b[1] - a[1]);
  const totalForgePoints = Object.values(potentials).reduce((sum, value) => sum + value, 0);

  return {
    calculationVersion: CALCULATION_VERSION,
    totalForgePoints,
    potentials,
    primaryAffinity: (languages[0]?.[0] ?? "utility").toLowerCase(),
    secondaryAffinities: languages.slice(1, 3).map(([language]) => language.toLowerCase()),
    explanation,
    traits: evaluateRareTraits(metrics),
  };
}

export function evaluateRareTraits(metrics: GitHubMetrics): TraitUnlock[] {
  const traits: TraitUnlock[] = [];
  if (metrics.longestStreakDays >= 180) {
    traits.push({
      key: "one-year-flame",
      name: "The One-Year Flame",
      description: "Successful consecutive turns build extra Momentum.",
      evidence: `${metrics.longestStreakDays}-day verified contribution streak`,
    });
  }
  if (metrics.externalPullRequestsMerged >= 40) {
    traits.push({
      key: "merge-sovereign",
      name: "Merge Sovereign",
      description: "Successful counters trigger a follow-up strike.",
      evidence: `${metrics.externalPullRequestsMerged} merged pull requests outside owned repositories`,
    });
  }
  if (Object.values(metrics.languageDistribution).filter((share) => share >= 0.08).length >= 4) {
    traits.push({
      key: "polyglot-architect",
      name: "Polyglot Architect",
      description: "Change active affinity once per dungeon.",
      evidence: "Meaningful activity across four or more language ecosystems",
    });
  }
  if (metrics.releasesCount >= 18 && metrics.maintainedRepoCount >= 5) {
    traits.push({
      key: "shipwright",
      name: "Shipwright",
      description: "Begin each run with a temporary crafted artifact.",
      evidence: `${metrics.releasesCount} releases across maintained repositories`,
    });
  }
  return traits;
}

