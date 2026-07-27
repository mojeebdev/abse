// src/domain/types.ts
var ATTRIBUTES = ["force", "guard", "momentum", "precision", "insight"];

// src/domain/architect.ts
var BuildValidationError = class extends Error {
  code = "INVALID_BUILD";
};
function validateArchitectBuild(build, score, inventory, expectedVersion) {
  if (expectedVersion !== void 0 && build.buildVersion !== expectedVersion) {
    throw new BuildValidationError("This build changed elsewhere. Reload before saving.");
  }
  const values = ATTRIBUTES.map((attribute) => build.attributes[attribute]);
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new BuildValidationError("Attributes must be non-negative whole numbers.");
  }
  if (values.reduce((sum, value) => sum + value, 0) > score.totalForgePoints) {
    throw new BuildValidationError("Allocated attributes exceed verified Forge Points.");
  }
  if (build.activeAbilityIds.length !== 3 || new Set(build.activeAbilityIds).size !== 3) {
    throw new BuildValidationError("Choose three different active abilities.");
  }
  if (build.passiveTraitIds.length > 2 || new Set(build.passiveTraitIds).size !== build.passiveTraitIds.length) {
    throw new BuildValidationError("Choose no more than two different passive traits.");
  }
  if (!build.activeAbilityIds.every((id) => inventory.abilityIds.includes(id))) {
    throw new BuildValidationError("The build contains an unowned ability.");
  }
  if (!build.passiveTraitIds.every((id) => inventory.traitIds.includes(id))) {
    throw new BuildValidationError("The build contains an ineligible trait.");
  }
  if (!inventory.artifactIds.includes(build.artifactId)) {
    throw new BuildValidationError("The build contains an unowned artifact.");
  }
  if (!inventory.affinities.includes(build.primaryAffinity)) {
    throw new BuildValidationError("The selected affinity is not available.");
  }
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
async function jsonBody(req) {
  try {
    return await req.json();
  } catch {
    throw new ApiError("INVALID_ACTION", "The request body is not valid JSON.");
  }
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

// base44/functions/saveArchitectBuild/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const body = await jsonBody(req);
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
      insight: calculation.insightPotential
    },
    primaryAffinity: calculation.primaryAffinity,
    secondaryAffinities: calculation.secondaryAffinities,
    explanation: calculation.explanation,
    traits: []
  };
  try {
    validateArchitectBuild(body, score, {
      abilityIds: abilities.map((item) => item.id),
      traitIds: traits.map((item) => item.traitDefinitionId),
      artifactIds: artifacts.map((item) => item.artifactDefinitionId),
      affinities: [calculation.primaryAffinity, ...calculation.secondaryAffinities]
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
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const architect = current ? await entities.Architect.update(current.id, next) : await entities.Architect.create(next);
  await audit(entities, {
    userId: user.id,
    action: "architect_build_saved",
    entityType: "Architect",
    entityId: architect.id,
    correlationId,
    metadata: { buildVersion: architect.buildVersion }
  });
  return { architectId: architect.id, buildVersion: architect.buildVersion };
});
