// src/domain/scoring.ts
var CALCULATION_VERSION = "forge-2026.1";
var RULES = [
  { key: "totalVerifiedCommits", label: "Verified commits", reference: 900, cap: 1, weight: 18, attribute: "force" },
  { key: "releasesCount", label: "Shipped releases", reference: 24, cap: 1, weight: 8, attribute: "force" },
  { key: "maintainedRepoCount", label: "Maintained repositories", reference: 12, cap: 1, weight: 18, attribute: "guard" },
  { key: "accountAgeDays", label: "Account longevity", reference: 3650, cap: 1, weight: 8, attribute: "guard" },
  { key: "activeWeeksLastYear", label: "Active weeks", reference: 48, cap: 1, weight: 16, attribute: "momentum" },
  { key: "longestStreakDays", label: "Longest active streak", reference: 120, cap: 1, weight: 10, attribute: "momentum" },
  { key: "pullRequestsMerged", label: "Merged pull requests", reference: 120, cap: 1, weight: 13, attribute: "precision" },
  { key: "externalPullRequestsMerged", label: "External merges", reference: 60, cap: 1, weight: 10, attribute: "precision" },
  { key: "meaningfulRepoCount", label: "Meaningful repositories", reference: 35, cap: 1, weight: 10, attribute: "insight" }
];
function normalizeMetric(value, reference, cap = 1) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(cap, Math.log1p(value) / Math.log1p(reference));
}
function round(value) {
  return Math.round(value * 100) / 100;
}
function calculateForgeProfile(metrics) {
  const potentials = { force: 0, guard: 0, momentum: 0, precision: 0, insight: 0 };
  const explanation = RULES.map((rule) => {
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
    points: languagePoints
  });
  for (const attribute of Object.keys(potentials)) {
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
    traits: evaluateRareTraits(metrics)
  };
}
function evaluateRareTraits(metrics) {
  const traits = [];
  if (metrics.longestStreakDays >= 180) {
    traits.push({
      key: "one-year-flame",
      name: "The One-Year Flame",
      description: "Successful consecutive turns build extra Momentum.",
      evidence: `${metrics.longestStreakDays}-day verified contribution streak`
    });
  }
  if (metrics.externalPullRequestsMerged >= 40) {
    traits.push({
      key: "merge-sovereign",
      name: "Merge Sovereign",
      description: "Successful counters trigger a follow-up strike.",
      evidence: `${metrics.externalPullRequestsMerged} merged pull requests outside owned repositories`
    });
  }
  if (Object.values(metrics.languageDistribution).filter((share) => share >= 0.08).length >= 4) {
    traits.push({
      key: "polyglot-architect",
      name: "Polyglot Architect",
      description: "Change active affinity once per dungeon.",
      evidence: "Meaningful activity across four or more language ecosystems"
    });
  }
  if (metrics.releasesCount >= 18 && metrics.maintainedRepoCount >= 5) {
    traits.push({
      key: "shipwright",
      name: "Shipwright",
      description: "Begin each run with a temporary crafted artifact.",
      evidence: `${metrics.releasesCount} releases across maintained repositories`
    });
  }
  return traits;
}

// base44/lib/http.ts
import { createClientFromRequest } from "npm:@base44/sdk";
var ApiError = class extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
};
async function context(req) {
  const base44 = createClientFromRequest(req);
  let user;
  try {
    user = await base44.auth.me();
  } catch {
    throw new ApiError("AUTH_REQUIRED", "Sign in to continue.", 401);
  }
  if (!user) throw new ApiError("AUTH_REQUIRED", "Sign in to continue.", 401);
  return {
    base44,
    entities: base44.asServiceRole.entities,
    user,
    correlationId: req.headers.get("x-correlation-id") ?? crypto.randomUUID()
  };
}
function serve(handler) {
  Deno.serve(async (req) => {
    const started = performance.now();
    try {
      const result = await handler(req);
      return Response.json(result);
    } catch (error) {
      const safe = error instanceof ApiError ? error : new ApiError("INTERNAL_ERROR", "The operation could not be completed.", 500);
      console.error(JSON.stringify({
        category: safe.code,
        durationMs: Math.round(performance.now() - started)
      }));
      return Response.json(
        { error: { code: safe.code, message: safe.message } },
        { status: safe.status }
      );
    }
  });
}
async function audit(entities, input) {
  await entities.AuditLog.create({
    ...input,
    metadata: input.metadata ?? {},
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// base44/functions/calculateForgePoints/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const snapshots = await entities.GitHubSnapshot.filter({ userId: user.id, isCurrent: true }, "-capturedAt", 1);
  const snapshot = snapshots[0];
  if (!snapshot) throw new Error("SNAPSHOT_NOT_FOUND");
  const calculation = calculateForgeProfile(snapshot);
  const inputHash = await sha256({ snapshotHash: snapshot.snapshotHash, version: calculation.calculationVersion });
  const existing = await entities.ScoreCalculation.filter({ userId: user.id, inputHash }, "-calculatedAt", 1);
  if (existing[0]) return existing[0];
  const created = await entities.ScoreCalculation.create({
    userId: user.id,
    snapshotId: snapshot.id,
    calculationVersion: calculation.calculationVersion,
    formulaConfigId: "forge-default-2026.1",
    forcePotential: calculation.potentials.force,
    guardPotential: calculation.potentials.guard,
    momentumPotential: calculation.potentials.momentum,
    precisionPotential: calculation.potentials.precision,
    insightPotential: calculation.potentials.insight,
    totalForgePoints: calculation.totalForgePoints,
    primaryAffinity: calculation.primaryAffinity,
    secondaryAffinities: calculation.secondaryAffinities,
    normalizedMetrics: Object.fromEntries(calculation.explanation.map((item) => [item.key, item.normalized])),
    appliedCaps: Object.fromEntries(calculation.explanation.map((item) => [item.key, item.cap])),
    explanation: calculation.explanation,
    inputHash,
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  for (const trait of calculation.traits) {
    const definitions = await entities.TraitDefinition.filter({ key: trait.key, enabled: true }, "-created_date", 1);
    if (!definitions[0]) continue;
    const existingTraits = await entities.PlayerTrait.filter({
      userId: user.id,
      traitDefinitionId: definitions[0].id,
      snapshotId: snapshot.id
    }, "-unlockedAt", 1);
    if (!existingTraits[0]) {
      await entities.PlayerTrait.create({
        userId: user.id,
        traitDefinitionId: definitions[0].id,
        snapshotId: snapshot.id,
        evidence: { summary: trait.evidence, calculationVersion: calculation.calculationVersion },
        unlockedAt: (/* @__PURE__ */ new Date()).toISOString(),
        active: true
      });
    }
  }
  const starterArtifacts = await entities.ArtifactDefinition.filter({
    key: "lockfile-sigil",
    enabled: true
  }, "-created_date", 1);
  if (starterArtifacts[0]) {
    const owned = await entities.PlayerArtifact.filter({
      userId: user.id,
      artifactDefinitionId: starterArtifacts[0].id
    }, "-acquiredAt", 1);
    if (!owned[0]) {
      await entities.PlayerArtifact.create({
        userId: user.id,
        artifactDefinitionId: starterArtifacts[0].id,
        quantity: 1,
        acquiredAt: (/* @__PURE__ */ new Date()).toISOString(),
        sourceType: "onboarding",
        sourceId: created.id
      });
    }
  }
  await audit(entities, {
    userId: user.id,
    action: "forge_points_calculated",
    entityType: "ScoreCalculation",
    entityId: created.id,
    correlationId,
    metadata: { calculationVersion: calculation.calculationVersion }
  });
  return { ...created, traits: calculation.traits };
});
