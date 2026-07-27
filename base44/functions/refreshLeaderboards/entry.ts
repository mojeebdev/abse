import { rankCandidates } from "../../../src/domain/leaderboard.ts";
import { ApiError, audit, context, jsonBody, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  if (user.role !== "admin") throw new ApiError("ADMIN_REQUIRED", "Administrator access is required.", 403);
  const { seasonId = "season-1" } = await jsonBody<{ seasonId?: string }>(req);
  const rewards = await entities.RewardLedger.filter({ rewardType: "seasonal_rating" }, "-issuedAt", 10_000);
  const totals = new Map<string, { score: number; updatedAt: string }>();
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
      userId: candidate.userId, seasonId, category: "seasonal_rating",
      score: candidate.score, rank: candidate.rank, sourceVersion: "leaderboard-2026.1",
      publicProfile: {
        displayName: profile?.displayName ?? profile?.githubLogin ?? "Anonymous Architect",
        githubAvatarUrl: profile?.githubAvatarUrl,
        factionId: profile?.factionId,
      },
      updatedAt: new Date().toISOString(),
    };
    const existing = (await entities.LeaderboardEntry.filter({
      userId: candidate.userId, seasonId, category: "seasonal_rating",
    }, "-updatedAt", 1))[0];
    if (existing) await entities.LeaderboardEntry.update(existing.id, data);
    else await entities.LeaderboardEntry.create(data);
  }
  await audit(entities, {
    userId: user.id, action: "leaderboard_refreshed", entityType: "LeaderboardEntry",
    entityId: seasonId, correlationId, metadata: { entries: ranked.length },
  });
  return { seasonId, entries: ranked.length };
});
