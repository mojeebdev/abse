import { calculateDungeonRewards, levelForExperience, REWARD_VERSION } from "../../../src/domain/progression.ts";
import { ApiError, audit, context, jsonBody, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const { runId } = await jsonBody<{ runId?: string }>(req);
  if (!runId) throw new ApiError("INVALID_ACTION", "A dungeon run is required.");

  const run = (await entities.DungeonRun.filter({ id: runId, userId: user.id }, "-completedAt", 1))[0];
  if (!run) throw new ApiError("RUN_NOT_FOUND", "That dungeon run was not found.", 404);
  if (!["completed", "failed"].includes(run.status)) {
    throw new ApiError("RUN_ACTIVE", "Finish the expedition before claiming rewards.");
  }

  const prefix = `reward:${run.id}:${REWARD_VERSION}`;
  const existing = await entities.RewardLedger.filter({ userId: user.id, sourceId: run.id }, "-issuedAt", 20);
  if (existing.some((item: any) => item.idempotencyKey?.startsWith(prefix))) {
    return { status: "already_issued", rewards: existing };
  }

  const rewards = calculateDungeonRewards(run.statePayload);
  const issuedAt = new Date().toISOString();
  const rows = [
    ["experience", rewards.experience],
    ["seasonal_rating", rewards.seasonalRating],
    ["influence", rewards.influence],
  ] as const;
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
      issuedAt,
    }));
  }

  const architect = (await entities.Architect.filter({ userId: user.id }, "-updatedAt", 1))[0];
  if (architect) {
    const experience = (architect.experience ?? 0) + rewards.experience;
    await entities.Architect.update(architect.id, {
      experience,
      level: levelForExperience(experience),
      updatedAt: issuedAt,
    });
  }
  await entities.DungeonRun.update(run.id, { rewardStatus: "issued" });
  await audit(entities, {
    userId: user.id,
    action: "dungeon_rewards_issued",
    entityType: "DungeonRun",
    entityId: run.id,
    correlationId,
    metadata: { rewardVersion: REWARD_VERSION },
  });
  return { status: "issued", rewards: created, summary: rewards };
});
