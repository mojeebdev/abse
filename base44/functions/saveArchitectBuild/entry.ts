import { validateArchitectBuild } from "../../../src/domain/architect.ts";
import { ApiError, audit, context, jsonBody, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const body = await jsonBody<any>(req);
  const calculations = await entities.ScoreCalculation.filter({ userId: user.id }, "-calculatedAt", 1);
  const calculation = calculations[0];
  if (!calculation) throw new ApiError("SNAPSHOT_NOT_FOUND", "Calculate your profile before saving a build.", 404);
  const current = (await entities.Architect.filter({ userId: user.id }, "-updatedAt", 1))[0];
  const traits = await entities.PlayerTrait.filter({ userId: user.id, active: true });
  const artifacts = await entities.PlayerArtifact.filter({ userId: user.id, quantity: { $gt: 0 } });
  const abilities = await entities.AbilityDefinition.filter({ enabled: true });
  const score = {
    calculationVersion: calculation.calculationVersion,
    totalForgePoints: calculation.totalForgePoints,
    potentials: {
      force: calculation.forcePotential,
      guard: calculation.guardPotential,
      momentum: calculation.momentumPotential,
      precision: calculation.precisionPotential,
      insight: calculation.insightPotential,
    },
    primaryAffinity: calculation.primaryAffinity,
    secondaryAffinities: calculation.secondaryAffinities,
    explanation: calculation.explanation,
    traits: [],
  };
  try {
    validateArchitectBuild(body, score, {
      abilityIds: abilities.map((item: any) => item.id),
      traitIds: traits.map((item: any) => item.traitDefinitionId),
      artifactIds: artifacts.map((item: any) => item.artifactDefinitionId),
      affinities: [calculation.primaryAffinity, ...calculation.secondaryAffinities],
    }, current?.buildVersion ?? body.buildVersion);
  } catch (error) {
    throw new ApiError("INVALID_BUILD", error instanceof Error ? error.message : "The build is invalid.");
  }
  const next = {
    userId: user.id,
    scoreCalculationId: calculation.id,
    level: current?.level ?? 1,
    experience: current?.experience ?? 0,
    powerBand: calculation.totalForgePoints >= 90 ? "mythic" : calculation.totalForgePoints >= 65 ? "veteran" : "rising",
    ...body.attributes,
    primaryAffinity: body.primaryAffinity,
    secondaryAffinities: calculation.secondaryAffinities,
    activeAbilityIds: body.activeAbilityIds,
    passiveTraitIds: body.passiveTraitIds,
    artifactId: body.artifactId,
    buildVersion: (current?.buildVersion ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  const architect = current
    ? await entities.Architect.update(current.id, next)
    : await entities.Architect.create(next);
  await audit(entities, {
    userId: user.id,
    action: "architect_build_saved",
    entityType: "Architect",
    entityId: architect.id,
    correlationId,
    metadata: { buildVersion: architect.buildVersion },
  });
  return { architectId: architect.id, buildVersion: architect.buildVersion };
});

