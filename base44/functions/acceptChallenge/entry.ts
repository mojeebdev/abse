import { challengeExpired, compareChallengeScores } from "../../../src/domain/challenge.ts";
import { ApiError, audit, context, jsonBody, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const { shareCode, runId } = await jsonBody<{ shareCode?: string; runId?: string }>(req);
  if (!shareCode) throw new ApiError("INVALID_CHALLENGE", "A challenge code is required.");
  const challenge = (await entities.Challenge.filter({ shareCode }, "-expiresAt", 1))[0];
  if (!challenge) throw new ApiError("CHALLENGE_NOT_FOUND", "Challenge not found.", 404);
  if (challenge.challengerUserId === user.id) throw new ApiError("SELF_CHALLENGE", "You cannot accept your own challenge.");
  if (challengeExpired(challenge.expiresAt)) {
    if (challenge.status === "open") await entities.Challenge.update(challenge.id, { status: "expired" });
    throw new ApiError("CHALLENGE_EXPIRED", "This challenge has expired.", 410);
  }
  if (!["open", "accepted"].includes(challenge.status)) {
    throw new ApiError("CHALLENGE_CLOSED", "This challenge is no longer open.", 409);
  }
  if (challenge.challengedUserId && challenge.challengedUserId !== user.id) {
    throw new ApiError("CHALLENGE_TAKEN", "Another Architect accepted this challenge.", 409);
  }
  const acceptedAt = challenge.acceptedAt ?? new Date().toISOString();
  if (!runId) {
    await entities.Challenge.update(challenge.id, {
      challengedUserId: user.id, status: "accepted", acceptedAt,
    });
    return { status: "accepted", shareCode, acceptedAt };
  }
  const run = (await entities.DungeonRun.filter({ id: runId, userId: user.id, status: "completed" }, "-completedAt", 1))[0];
  if (!run || run.rewardStatus !== "issued") throw new ApiError("RUN_INELIGIBLE", "A rewarded completed run is required.");
  const rewards = await entities.RewardLedger.filter({ userId: user.id, sourceId: run.id }, "-issuedAt", 20);
  const score = rewards.find((item: any) => item.rewardType === "experience")?.metadata?.dungeonScore;
  if (!Number.isFinite(score)) throw new ApiError("SCORE_NOT_FOUND", "Validated run score is unavailable.");
  const challengedScore = { dungeonScore: score, turns: run.currentTurn, healthRemaining: run.health };
  const winner = compareChallengeScores(challenge.challengerSnapshot, challengedScore);
  const result = { winner, challengedScore, runId: run.id };
  await entities.Challenge.update(challenge.id, {
    challengedUserId: user.id, status: "completed", acceptedAt,
    completedAt: new Date().toISOString(), result,
  });
  await audit(entities, {
    userId: user.id, action: "challenge_completed", entityType: "Challenge",
    entityId: challenge.id, correlationId, metadata: { winner },
  });
  return { status: "completed", result };
});
