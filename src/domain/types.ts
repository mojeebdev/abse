export const ATTRIBUTES = ["force", "guard", "momentum", "precision", "insight"] as const;
export type Attribute = (typeof ATTRIBUTES)[number];
export type Attributes = Record<Attribute, number>;

export interface GitHubMetrics {
  accountAgeDays: number;
  meaningfulRepoCount: number;
  totalVerifiedCommits: number;
  recentVerifiedCommits: number;
  currentStreakDays: number;
  longestStreakDays: number;
  activeWeeksLastYear: number;
  pullRequestsMerged: number;
  externalPullRequestsMerged: number;
  releasesCount: number;
  maintainedRepoCount: number;
  languageDistribution: Record<string, number>;
}

export interface MetricExplanation {
  key: string;
  label: string;
  raw: number;
  normalized: number;
  cap: number;
  points: number;
}

export interface TraitUnlock {
  key: string;
  name: string;
  description: string;
  evidence: string;
}

export interface ScoreCalculation {
  calculationVersion: string;
  totalForgePoints: number;
  potentials: Attributes;
  primaryAffinity: string;
  secondaryAffinities: string[];
  explanation: MetricExplanation[];
  traits: TraitUnlock[];
}

export type CombatAction =
  | { type: "attack" }
  | { type: "defend" }
  | { type: "recover" }
  | { type: "ability"; abilityId: string }
  | { type: "artifact"; artifactId: string }
  | {
      type: "event";
      choice: "stabilize" | "force" | "inspect" | "recover" | "package" | "corrupted";
    };

export interface CombatState {
  runId: string;
  seed: string;
  status: "active" | "completed" | "failed";
  roomIndex: number;
  turn: number;
  health: number;
  maxHealth: number;
  energy: number;
  guardMeter: number;
  momentumChain: number;
  enemyHealth: number;
  enemyMaxHealth: number;
  enemyIntent: "strike" | "heavy" | "drain";
  versionConflictStacks: number;
  cooldowns: Record<string, number>;
  eventPending?: "conflicts" | "cache";
  lastPlayerAction?: CombatAction["type"];
  actionHistory: string[];
  processedKeys: string[];
}
