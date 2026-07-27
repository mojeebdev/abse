import { influenceBalance } from "../../../src/domain/territory.ts";
import { ApiError, audit, context, jsonBody, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const idempotencyKey = req.headers.get("x-idempotency-key")?.trim();
  if (!idempotencyKey) throw new ApiError("IDEMPOTENCY_REQUIRED", "An idempotency key is required.");
  const body = await jsonBody<{ territoryId?: string; runId?: string; amount?: number; actionType?: "attack" | "defend" }>(req);
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
  if ((actionType === "defend") !== (territory.ownerFactionId === profile.factionId)) {
    throw new ApiError("INVALID_INFLUENCE_ACTION", "Your faction relationship does not match that action.");
  }
  const earned = await entities.RewardLedger.filter({ userId: user.id, rewardType: "influence" }, "-issuedAt", 500);
  const spent = await entities.InfluenceLedger.filter({ userId: user.id }, "-committedAt", 500);
  if (influenceBalance(earned.map((item: any) => item.amount), spent.map((item: any) => item.amount)) < Number(body.amount)) {
    throw new ApiError("INSUFFICIENT_INFLUENCE", "You do not have enough uncommitted influence.", 409);
  }
  const commitment = await entities.InfluenceLedger.create({
    userId: user.id, factionId: profile.factionId, territoryId: territory.id,
    dungeonRunId: run.id, amount: body.amount, actionType, idempotencyKey,
    committedAt: new Date().toISOString(),
  });
  await audit(entities, {
    userId: user.id, action: "territory_influence_committed", entityType: "Territory",
    entityId: territory.id, correlationId, metadata: { amount: body.amount, actionType },
  });
  return { status: "committed", commitment };
});
