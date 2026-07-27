// src/domain/territory.ts
function resolveTerritory(state) {
  const attacks = Object.entries(state.attackInfluenceByFaction).filter(([, amount]) => Number.isFinite(amount) && amount > 0).sort(
    ([leftId, leftAmount], [rightId, rightAmount]) => rightAmount - leftAmount || leftId.localeCompare(rightId)
  );
  const [attackingFaction, attackingInfluence = 0] = attacks[0] ?? [];
  const defendingTotal = state.ownerFactionId ? state.defenceInfluence : 0;
  const attackerWins = Boolean(attackingFaction) && attackingInfluence > defendingTotal;
  const ownerFactionId = attackerWins ? attackingFaction : state.ownerFactionId;
  return {
    ownerFactionId,
    winningInfluence: attackerWins ? attackingInfluence : defendingTotal,
    changedOwner: Boolean(attackerWins && ownerFactionId !== state.ownerFactionId),
    nextStateVersion: state.stateVersion + 1
  };
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

// base44/functions/resolveTerritories/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  if (user.role !== "admin") throw new ApiError("ADMIN_REQUIRED", "Administrator access is required.", 403);
  const territories = await entities.Territory.filter({}, "key", 100);
  const now = /* @__PURE__ */ new Date();
  const resolutions = [];
  for (const territory of territories) {
    if (Date.parse(territory.resolvesAt) > now.getTime()) continue;
    const commitments = await entities.InfluenceLedger.filter({ territoryId: territory.id }, "-committedAt", 5e3);
    const attackInfluenceByFaction = {};
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
      stateVersion: territory.stateVersion
    });
    const updated = await entities.Territory.update(territory.id, {
      ownerFactionId: result.ownerFactionId,
      defenceInfluence: 0,
      attackInfluenceByFaction: {},
      stateVersion: result.nextStateVersion,
      resolvesAt: new Date(now.getTime() + 864e5).toISOString(),
      updatedAt: now.toISOString()
    });
    resolutions.push({ territoryId: territory.id, ...result });
    await audit(entities, {
      userId: user.id,
      action: "territory_resolved",
      entityType: "Territory",
      entityId: territory.id,
      correlationId,
      metadata: { ...result, previousOwnerFactionId: territory.ownerFactionId }
    });
    void updated;
  }
  return { resolvedAt: now.toISOString(), resolutions };
});
