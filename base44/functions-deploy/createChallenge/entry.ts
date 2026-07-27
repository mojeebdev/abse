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

// base44/functions/createChallenge/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const { runId, challengeType = "dungeon_score" } = await jsonBody(req);
  if (challengeType !== "dungeon_score") throw new ApiError("INVALID_CHALLENGE", "Unsupported challenge type.");
  const run = (await entities.DungeonRun.filter({ id: runId, userId: user.id, status: "completed" }, "-completedAt", 1))[0];
  if (!run || run.rewardStatus !== "issued") throw new ApiError("RUN_INELIGIBLE", "A rewarded completed run is required.");
  const rewards = await entities.RewardLedger.filter({ userId: user.id, sourceId: run.id }, "-issuedAt", 20);
  const score = rewards.find((item) => item.rewardType === "experience")?.metadata?.dungeonScore;
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
      affinity: run.buildSnapshot?.primaryAffinity
    },
    status: "open",
    expiresAt: new Date(Date.now() + 7 * 864e5).toISOString()
  });
  await audit(entities, {
    userId: user.id,
    action: "challenge_created",
    entityType: "Challenge",
    entityId: created.id,
    correlationId
  });
  return { shareCode, expiresAt: created.expiresAt, snapshot: created.challengerSnapshot };
});
