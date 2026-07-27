import { ApiError, audit, context, jsonBody, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const { factionId } = await jsonBody<{ factionId?: string }>(req);
  if (!factionId) throw new ApiError("INVALID_FACTION", "Choose a faction.");
  const faction = (await entities.Faction.filter({ id: factionId }, "-createdAt", 1))[0];
  if (!faction) throw new ApiError("INVALID_FACTION", "That faction does not exist.", 404);
  const profile = (await entities.UserProfile.filter({ userId: user.id }, "-updatedAt", 1))[0];
  if (!profile) throw new ApiError("PROFILE_NOT_FOUND", "Sync GitHub before joining a faction.", 404);
  if (profile.factionId && profile.factionId !== factionId) {
    const committed = await entities.InfluenceLedger.filter({ userId: user.id }, "-committedAt", 1);
    if (committed[0]) throw new ApiError("FACTION_LOCKED", "A faction cannot change after influence is committed.", 409);
  }
  await entities.UserProfile.update(profile.id, {
    factionId,
    currentSeasonId: faction.currentSeasonId,
    updatedAt: new Date().toISOString(),
  });
  await audit(entities, {
    userId: user.id, action: "faction_selected", entityType: "Faction",
    entityId: faction.id, correlationId,
  });
  return { faction: { id: faction.id, key: faction.key, name: faction.name } };
});
