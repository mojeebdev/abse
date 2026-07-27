// src/domain/challenge.ts
function compareChallengeScores(challenger, challenged) {
  const challengerTuple = [challenger.dungeonScore, -challenger.turns, challenger.healthRemaining];
  const challengedTuple = [challenged.dungeonScore, -challenged.turns, challenged.healthRemaining];
  for (let index = 0; index < challengerTuple.length; index += 1) {
    if (challengerTuple[index] > challengedTuple[index]) return "challenger";
    if (challengerTuple[index] < challengedTuple[index]) return "challenged";
  }
  return "draw";
}
function challengeExpired(expiresAt, now = /* @__PURE__ */ new Date()) {
  const timestamp = Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= now.getTime();
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

// base44/functions/acceptChallenge/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const { shareCode, runId } = await jsonBody(req);
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
  const acceptedAt = challenge.acceptedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  if (!runId) {
    await entities.Challenge.update(challenge.id, {
      challengedUserId: user.id,
      status: "accepted",
      acceptedAt
    });
    return { status: "accepted", shareCode, acceptedAt };
  }
  const run = (await entities.DungeonRun.filter({ id: runId, userId: user.id, status: "completed" }, "-completedAt", 1))[0];
  if (!run || run.rewardStatus !== "issued") throw new ApiError("RUN_INELIGIBLE", "A rewarded completed run is required.");
  const rewards = await entities.RewardLedger.filter({ userId: user.id, sourceId: run.id }, "-issuedAt", 20);
  const score = rewards.find((item) => item.rewardType === "experience")?.metadata?.dungeonScore;
  if (!Number.isFinite(score)) throw new ApiError("SCORE_NOT_FOUND", "Validated run score is unavailable.");
  const challengedScore = { dungeonScore: score, turns: run.currentTurn, healthRemaining: run.health };
  const winner = compareChallengeScores(challenge.challengerSnapshot, challengedScore);
  const result = { winner, challengedScore, runId: run.id };
  await entities.Challenge.update(challenge.id, {
    challengedUserId: user.id,
    status: "completed",
    acceptedAt,
    completedAt: (/* @__PURE__ */ new Date()).toISOString(),
    result
  });
  await audit(entities, {
    userId: user.id,
    action: "challenge_completed",
    entityType: "Challenge",
    entityId: challenge.id,
    correlationId,
    metadata: { winner }
  });
  return { status: "completed", result };
});
