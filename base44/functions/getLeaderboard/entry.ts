import { ApiError, jsonBody, serve } from "../../lib/http.ts";
import { createClientFromRequest } from "npm:@base44/sdk";

serve(async (req) => {
  const body = await jsonBody<{ seasonId?: string; category?: string; afterRank?: number; limit?: number }>(req);
  const seasonId = body.seasonId ?? "season-1";
  const category = body.category ?? "seasonal_rating";
  const limit = Math.min(50, Math.max(1, Math.floor(body.limit ?? 20)));
  const afterRank = Math.max(0, Math.floor(body.afterRank ?? 0));
  const allowed = ["dungeon_score", "seasonal_rating", "faction_contribution", "rare_traits", "streak"];
  if (!allowed.includes(category)) throw new ApiError("INVALID_CATEGORY", "Unsupported leaderboard category.");
  const base44 = createClientFromRequest(req);
  const rows = await (base44.asServiceRole.entities as any).LeaderboardEntry.filter({ seasonId, category }, "rank", 500);
  const entries = rows.filter((row: any) => row.rank > afterRank).slice(0, limit).map((row: any) => ({
    rank: row.rank, score: row.score, publicProfile: row.publicProfile, updatedAt: row.updatedAt,
  }));
  return {
    seasonId, category, entries,
    nextAfterRank: entries.length === limit ? entries[entries.length - 1].rank : null,
  };
});
