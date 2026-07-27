import { context, serve } from "../../lib/http.ts";
import { influenceBalance } from "../../../src/domain/territory.ts";

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
    influenceBalance: influenceBalance(earned.map((item: any) => item.amount), spent.map((item: any) => item.amount)),
    leaderboard,
  };
});
