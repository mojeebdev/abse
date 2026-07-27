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

// base44/functions/selectFaction/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const { factionId } = await jsonBody(req);
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
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await audit(entities, {
    userId: user.id,
    action: "faction_selected",
    entityType: "Faction",
    entityId: faction.id,
    correlationId
  });
  return { faction: { id: faction.id, key: faction.key, name: faction.name } };
});
