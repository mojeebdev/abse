// src/domain/territory.ts
function influenceBalance(earned, committed) {
  const income = earned.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  const spent = committed.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  return Math.max(0, income - spent);
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

// base44/functions/commitTerritoryInfluence/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const idempotencyKey = req.headers.get("x-idempotency-key")?.trim();
  if (!idempotencyKey) throw new ApiError("IDEMPOTENCY_REQUIRED", "An idempotency key is required.");
  const body = await jsonBody(req);
  if (!body.territoryId || !body.runId || !Number.isInteger(body.amount) || Number(body.amount) < 1) {
    throw new ApiError("INVALID_INFLUENCE", "Territory, run, and a positive whole amount are required.");
  }
  const duplicate = (await entities.InfluenceLedger.filter({ userId: user.id, idempotencyKey }, "-committedAt", 1))[0];
  if (duplicate) return { status: "already_committed", commitment: duplicate };
  const profile = (await entities.UserProfile.filter({ userId: user.id }, "-updatedAt", 1))[0];
  if (!profile?.factionId) throw new ApiError("FACTION_REQUIRED", "Join a faction before committing influence.");
  const territory = (await entities.Territory.filter({ id: body.territoryId }, "-updatedAt", 1))[0];
  if (!territory) throw new ApiError("TERRITORY_NOT_FOUND", "That territory does not exist.", 404);
  const run = (await entities.DungeonRun.filter({ id: body.runId, userId: user.id }, "-completedAt", 1))[0];
  if (!run || run.status !== "completed" || run.rewardStatus !== "issued") {
    throw new ApiError("RUN_INELIGIBLE", "Only rewarded completed runs can supply influence.");
  }
  const actionType = body.actionType ?? (territory.ownerFactionId === profile.factionId ? "defend" : "attack");
  if (actionType === "defend" !== (territory.ownerFactionId === profile.factionId)) {
    throw new ApiError("INVALID_INFLUENCE_ACTION", "Your faction relationship does not match that action.");
  }
  const earned = await entities.RewardLedger.filter({ userId: user.id, rewardType: "influence" }, "-issuedAt", 500);
  const spent = await entities.InfluenceLedger.filter({ userId: user.id }, "-committedAt", 500);
  if (influenceBalance(earned.map((item) => item.amount), spent.map((item) => item.amount)) < Number(body.amount)) {
    throw new ApiError("INSUFFICIENT_INFLUENCE", "You do not have enough uncommitted influence.", 409);
  }
  const commitment = await entities.InfluenceLedger.create({
    userId: user.id,
    factionId: profile.factionId,
    territoryId: territory.id,
    dungeonRunId: run.id,
    amount: body.amount,
    actionType,
    idempotencyKey,
    committedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await audit(entities, {
    userId: user.id,
    action: "territory_influence_committed",
    entityType: "Territory",
    entityId: territory.id,
    correlationId,
    metadata: { amount: body.amount, actionType }
  });
  return { status: "committed", commitment };
});
