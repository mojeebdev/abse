// base44/lib/http.ts
import { createClientFromRequest } from "npm:@base44/sdk";
var ApiError = class extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
};
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

// base44/functions/getLeaderboard/entry.ts
import { createClientFromRequest as createClientFromRequest2 } from "npm:@base44/sdk";
serve(async (req) => {
  const body = await jsonBody(req);
  const seasonId = body.seasonId ?? "season-1";
  const category = body.category ?? "seasonal_rating";
  const limit = Math.min(50, Math.max(1, Math.floor(body.limit ?? 20)));
  const afterRank = Math.max(0, Math.floor(body.afterRank ?? 0));
  const allowed = ["dungeon_score", "seasonal_rating", "faction_contribution", "rare_traits", "streak"];
  if (!allowed.includes(category)) throw new ApiError("INVALID_CATEGORY", "Unsupported leaderboard category.");
  const base44 = createClientFromRequest2(req);
  const rows = await base44.asServiceRole.entities.LeaderboardEntry.filter({ seasonId, category }, "rank", 500);
  const entries = rows.filter((row) => row.rank > afterRank).slice(0, limit).map((row) => ({
    rank: row.rank,
    score: row.score,
    publicProfile: row.publicProfile,
    updatedAt: row.updatedAt
  }));
  return {
    seasonId,
    category,
    entries,
    nextAfterRank: entries.length === limit ? entries[entries.length - 1].rank : null
  };
});
