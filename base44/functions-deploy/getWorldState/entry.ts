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

// src/domain/territory.ts
function influenceBalance(earned, committed) {
  const income = earned.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  const spent = committed.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  return Math.max(0, income - spent);
}

// base44/functions/getWorldState/entry.ts
serve(async (req) => {
  const { entities, user } = await context(req);
  const [profile] = await entities.UserProfile.filter({ userId: user.id }, "-updatedAt", 1);
  const factions = await entities.Faction.filter({}, "-totalInfluence", 20);
  const territories = await entities.Territory.filter({}, "key", 20);
  const earned = await entities.RewardLedger.filter({ userId: user.id, rewardType: "influence" }, "-issuedAt", 500);
  const spent = await entities.InfluenceLedger.filter({ userId: user.id }, "-committedAt", 500);
  const leaderboard = await entities.LeaderboardEntry.filter({ seasonId: profile?.currentSeasonId ?? "season-1" }, "rank", 50);
  return {
    profile: profile ? { factionId: profile.factionId, displayName: profile.displayName } : null,
    factions,
    territories,
    influenceBalance: influenceBalance(earned.map((item) => item.amount), spent.map((item) => item.amount)),
    leaderboard
  };
});
