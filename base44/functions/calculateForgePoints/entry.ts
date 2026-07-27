import { calculateForgeProfile } from "../../../src/domain/scoring.ts";
import { audit, context, serve, sha256 } from "../../lib/http.ts";

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
    calculatedAt: new Date().toISOString(),
  });

  for (const trait of calculation.traits) {
    const definitions = await entities.TraitDefinition.filter({ key: trait.key, enabled: true }, "-created_date", 1);
    if (!definitions[0]) continue;
    const existingTraits = await entities.PlayerTrait.filter({
      userId: user.id,
      traitDefinitionId: definitions[0].id,
      snapshotId: snapshot.id,
    }, "-unlockedAt", 1);
    if (!existingTraits[0]) {
      await entities.PlayerTrait.create({
        userId: user.id,
        traitDefinitionId: definitions[0].id,
        snapshotId: snapshot.id,
        evidence: { summary: trait.evidence, calculationVersion: calculation.calculationVersion },
        unlockedAt: new Date().toISOString(),
        active: true,
      });
    }
  }

  const starterArtifacts = await entities.ArtifactDefinition.filter({
    key: "lockfile-sigil",
    enabled: true,
  }, "-created_date", 1);
  if (starterArtifacts[0]) {
    const owned = await entities.PlayerArtifact.filter({
      userId: user.id,
      artifactDefinitionId: starterArtifacts[0].id,
    }, "-acquiredAt", 1);
    if (!owned[0]) {
      await entities.PlayerArtifact.create({
        userId: user.id,
        artifactDefinitionId: starterArtifacts[0].id,
        quantity: 1,
        acquiredAt: new Date().toISOString(),
        sourceType: "onboarding",
        sourceId: created.id,
      });
    }
  }
  await audit(entities, {
    userId: user.id,
    action: "forge_points_calculated",
    entityType: "ScoreCalculation",
    entityId: created.id,
    correlationId,
    metadata: { calculationVersion: calculation.calculationVersion },
  });
  return { ...created, traits: calculation.traits };
});

