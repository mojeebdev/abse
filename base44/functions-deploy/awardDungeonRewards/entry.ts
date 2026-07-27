// src/domain/progression.ts
var REWARD_VERSION = "rewards-2026.1";
function calculateDungeonRewards(state) {
  if (state.status !== "completed") {
    return { experience: 20, seasonalRating: 0, influence: 0, dungeonScore: 0 };
  }
  const healthRatio = state.maxHealth ? state.health / state.maxHealth : 0;
  const efficiency = Math.max(0, 45 - state.turn);
  return {
    experience: 120 + Math.floor(healthRatio * 60),
    seasonalRating: 20 + Math.floor(healthRatio * 20),
    influence: 25 + Math.floor(healthRatio * 15),
    dungeonScore: Math.max(1, Math.round(1e3 + healthRatio * 500 + efficiency * 12))
  };
}
function levelForExperience(experience) {
  if (!Number.isFinite(experience) || experience <= 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(experience / 100)) + 1);
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

// base44/functions/awardDungeonRewards/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const { runId } = await jsonBody(req);
  if (!runId) throw new ApiError("INVALID_ACTION", "A dungeon run is required.");
  const run = (await entities.DungeonRun.filter({ id: runId, userId: user.id }, "-completedAt", 1))[0];
  if (!run) throw new ApiError("RUN_NOT_FOUND", "That dungeon run was not found.", 404);
  if (!["completed", "failed"].includes(run.status)) {
    throw new ApiError("RUN_ACTIVE", "Finish the expedition before claiming rewards.");
  }
  const prefix = `reward:${run.id}:${REWARD_VERSION}`;
  const existing = await entities.RewardLedger.filter({ userId: user.id, sourceId: run.id }, "-issuedAt", 20);
  if (existing.some((item) => item.idempotencyKey?.startsWith(prefix))) {
    return { status: "already_issued", rewards: existing };
  }
  const rewards = calculateDungeonRewards(run.statePayload);
  const issuedAt = (/* @__PURE__ */ new Date()).toISOString();
  const rows = [
    ["experience", rewards.experience],
    ["seasonal_rating", rewards.seasonalRating],
    ["influence", rewards.influence]
  ];
  const created = [];
  for (const [rewardType, amount] of rows) {
    created.push(await entities.RewardLedger.create({
      userId: user.id,
      sourceType: "dungeon_run",
      sourceId: run.id,
      rewardType,
      amount,
      metadata: { rewardVersion: REWARD_VERSION, dungeonScore: rewards.dungeonScore },
      idempotencyKey: `${prefix}:${rewardType}`,
      issuedAt
    }));
  }
  const architect = (await entities.Architect.filter({ userId: user.id }, "-updatedAt", 1))[0];
  if (architect) {
    const experience = (architect.experience ?? 0) + rewards.experience;
    await entities.Architect.update(architect.id, {
      experience,
      level: levelForExperience(experience),
      updatedAt: issuedAt
    });
  }
  await entities.DungeonRun.update(run.id, { rewardStatus: "issued" });
  await audit(entities, {
    userId: user.id,
    action: "dungeon_rewards_issued",
    entityType: "DungeonRun",
    entityId: run.id,
    correlationId,
    metadata: { rewardVersion: REWARD_VERSION }
  });
  return { status: "issued", rewards: created, summary: rewards };
});
