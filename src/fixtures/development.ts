import type { ArchitectBuild, BuildInventory } from "../domain/architect";
import type { GitHubMetrics } from "../domain/types";

export const developmentMetrics: GitHubMetrics = {
  accountAgeDays: 3240,
  meaningfulRepoCount: 27,
  totalVerifiedCommits: 1847,
  recentVerifiedCommits: 286,
  currentStreakDays: 41,
  longestStreakDays: 204,
  activeWeeksLastYear: 47,
  pullRequestsMerged: 132,
  externalPullRequestsMerged: 58,
  releasesCount: 21,
  maintainedRepoCount: 9,
  languageDistribution: {
    TypeScript: 0.54,
    Python: 0.21,
    JavaScript: 0.13,
    Shell: 0.08,
    CSS: 0.04,
  },
};

export const developmentInventory: BuildInventory = {
  abilityIds: ["type-guard", "async-lunge", "dependency-scan", "rollback"],
  traitIds: ["one-year-flame", "merge-sovereign", "polyglot-architect", "shipwright"],
  artifactIds: ["lockfile-sigil"],
  affinities: ["typescript", "python", "javascript", "shell"],
};

export const initialDevelopmentBuild: ArchitectBuild = {
  attributes: { force: 16, guard: 16, momentum: 17, precision: 18, insight: 17 },
  activeAbilityIds: ["type-guard", "async-lunge", "dependency-scan"],
  passiveTraitIds: ["one-year-flame", "merge-sovereign"],
  artifactId: "lockfile-sigil",
  primaryAffinity: "typescript",
  buildVersion: 1,
};

export const developmentFactions = [
  { id: "faction-typescript", name: "Type Wardens", affinity: "typescript", influence: 18420 },
  { id: "faction-python", name: "Pyre Scribes", affinity: "python", influence: 16110 },
  { id: "faction-rust", name: "Rustbound", affinity: "rust", influence: 14980 },
  { id: "faction-go", name: "Gopher Vanguard", affinity: "go", influence: 12740 },
  { id: "faction-javascript", name: "Runtime Covenant", affinity: "javascript", influence: 11930 },
  { id: "faction-systems", name: "Kernel Order", affinity: "systems", influence: 9850 },
];

export const developmentTerritories = [
  { key: "registry-gate", name: "Registry Gate", owner: "Type Wardens", pressure: 72 },
  { key: "merge-frontier", name: "Merge Frontier", owner: "Pyre Scribes", pressure: 46 },
  { key: "cache-vault", name: "Cache Vault", owner: "Rustbound", pressure: 81 },
  { key: "runtime-rift", name: "Runtime Rift", owner: "Gopher Vanguard", pressure: 35 },
  { key: "release-spire", name: "Release Spire", owner: "Runtime Covenant", pressure: 64 },
  { key: "kernel-throne", name: "Kernel Throne", owner: "Kernel Order", pressure: 57 },
];

export const developmentLeaderboard = [
  ["NyxCompiler", "Type Wardens", 2840],
  ["mojeeb.eth", "Pyre Scribes", 2715],
  ["latent-branch", "Rustbound", 2580],
  ["zero-downtime", "Gopher Vanguard", 2475],
  ["sigil-stack", "Runtime Covenant", 2320],
] as const;
