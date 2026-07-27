import { ApiError, audit, context, jsonBody, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const { runId, challengeType = "dungeon_score" } = await jsonBody<{ runId?: string; challengeType?: string }>(req);
  if (challengeType !== "dungeon_score") throw new ApiError("INVALID_CHALLENGE", "Unsupported challenge type.");
  const run = (await entities.DungeonRun.filter({ id: runId, userId: user.id, status: "completed" }, "-completedAt", 1))[0];
  if (!run || run.rewardStatus !== "issued") throw new ApiError("RUN_INELIGIBLE", "A rewarded completed run is required.");
  const rewards = await entities.RewardLedger.filter({ userId: user.id, sourceId: run.id }, "-issuedAt", 20);
  const score = rewards.find((item: any) => item.rewardType === "experience")?.metadata?.dungeonScore;
  if (!Number.isFinite(score)) throw new ApiError("SCORE_NOT_FOUND", "Validated run score is unavailable.");
  const profile = (await entities.UserProfile.filter({ userId: user.id }, "-updatedAt", 1))[0];
  const shareCode = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  const created = await entities.Challenge.create({
    challengerUserId: user.id,
    shareCode,
    challengeType,
    challengerSnapshot: {
      displayName: profile?.displayName ?? profile?.githubLogin ?? "Anonymous Architect",
      githubAvatarUrl: profile?.githubAvatarUrl,
      score,
      dungeonScore: score,
      turns: run.currentTurn,
      healthRemaining: run.health,
      affinity: run.buildSnapshot?.primaryAffinity,
    },
    status: "open",
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  });
  await audit(entities, {
    userId: user.id, action: "challenge_created", entityType: "Challenge",
    entityId: created.id, correlationId,
  });
  return { shareCode, expiresAt: created.expiresAt, snapshot: created.challengerSnapshot };
});
