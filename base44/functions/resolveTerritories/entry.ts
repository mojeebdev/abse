import { resolveTerritory } from "../../../src/domain/territory.ts";
import { ApiError, audit, context, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  if (user.role !== "admin") throw new ApiError("ADMIN_REQUIRED", "Administrator access is required.", 403);
  const territories = await entities.Territory.filter({}, "key", 100);
  const now = new Date();
  const resolutions = [];
  for (const territory of territories) {
    if (Date.parse(territory.resolvesAt) > now.getTime()) continue;
    const commitments = await entities.InfluenceLedger.filter({ territoryId: territory.id }, "-committedAt", 5_000);
    const attackInfluenceByFaction: Record<string, number> = {};
    let defenceInfluence = 0;
    for (const item of commitments) {
      if (Date.parse(item.committedAt) <= Date.parse(territory.updatedAt)) continue;
      if (item.actionType === "defend" && item.factionId === territory.ownerFactionId) {
        defenceInfluence += item.amount;
      } else {
        attackInfluenceByFaction[item.factionId] = (attackInfluenceByFaction[item.factionId] ?? 0) + item.amount;
      }
    }
    const result = resolveTerritory({
      ownerFactionId: territory.ownerFactionId,
      defenceInfluence,
      attackInfluenceByFaction,
      stateVersion: territory.stateVersion,
    });
    const updated = await entities.Territory.update(territory.id, {
      ownerFactionId: result.ownerFactionId,
      defenceInfluence: 0,
      attackInfluenceByFaction: {},
      stateVersion: result.nextStateVersion,
      resolvesAt: new Date(now.getTime() + 86_400_000).toISOString(),
      updatedAt: now.toISOString(),
    });
    resolutions.push({ territoryId: territory.id, ...result });
    await audit(entities, {
      userId: user.id, action: "territory_resolved", entityType: "Territory",
      entityId: territory.id, correlationId, metadata: { ...result, previousOwnerFactionId: territory.ownerFactionId },
    });
    void updated;
  }
  return { resolvedAt: now.toISOString(), resolutions };
});
