// src/domain/leaderboard.ts
function rankCandidates(candidates) {
  return [...candidates].sort(
    (left, right) => right.score - left.score || left.updatedAt.localeCompare(right.updatedAt) || left.userId.localeCompare(right.userId)
  ).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
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

// base44/functions/refreshLeaderboards/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  if (user.role !== "admin") throw new ApiError("ADMIN_REQUIRED", "Administrator access is required.", 403);
  const { seasonId = "season-1" } = await jsonBody(req);
  const rewards = await entities.RewardLedger.filter({ rewardType: "seasonal_rating" }, "-issuedAt", 1e4);
  const totals = /* @__PURE__ */ new Map();
  for (const reward of rewards) {
    const current = totals.get(reward.userId) ?? { score: 0, updatedAt: reward.issuedAt };
    current.score += reward.amount;
    if (reward.issuedAt < current.updatedAt) current.updatedAt = reward.issuedAt;
    totals.set(reward.userId, current);
  }
  const ranked = rankCandidates([...totals].map(([userId, value]) => ({ userId, ...value })));
  for (const candidate of ranked) {
    const profile = (await entities.UserProfile.filter({ userId: candidate.userId }, "-updatedAt", 1))[0];
    const data = {
      userId: candidate.userId,
      seasonId,
      category: "seasonal_rating",
      score: candidate.score,
      rank: candidate.rank,
      sourceVersion: "leaderboard-2026.1",
      publicProfile: {
        displayName: profile?.displayName ?? profile?.githubLogin ?? "Anonymous Architect",
        githubAvatarUrl: profile?.githubAvatarUrl,
        factionId: profile?.factionId
      },
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const existing = (await entities.LeaderboardEntry.filter({
      userId: candidate.userId,
      seasonId,
      category: "seasonal_rating"
    }, "-updatedAt", 1))[0];
    if (existing) await entities.LeaderboardEntry.update(existing.id, data);
    else await entities.LeaderboardEntry.create(data);
  }
  await audit(entities, {
    userId: user.id,
    action: "leaderboard_refreshed",
    entityType: "LeaderboardEntry",
    entityId: seasonId,
    correlationId,
    metadata: { entries: ranked.length }
  });
  return { seasonId, entries: ranked.length };
});
