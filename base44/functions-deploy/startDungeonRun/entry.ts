// src/domain/architect.ts
function deriveCombatStats(attributes) {
  return {
    maxHealth: 90 + attributes.guard * 4,
    baseDamage: 7 + attributes.force * 0.8,
    maxEnergy: 5 + Math.floor(attributes.insight / 8),
    criticalChance: Math.min(0.35, 0.05 + attributes.precision * 6e-3),
    initiative: 5 + attributes.momentum * 0.7
  };
}

// src/domain/dungeon.ts
var DUNGEON_VERSION = "dependency-depths-1";
var ROOMS = [
  { name: "The Unmaintained Gate", kind: "combat", enemyHealth: 40 },
  { name: "Chamber of Conflicting Versions", kind: "event", enemyHealth: 1 },
  { name: "The Deprecated Guardian", kind: "combat", enemyHealth: 70 },
  { name: "Cache of Forgotten Packages", kind: "event", enemyHealth: 1 },
  { name: "The Dependency Phantom", kind: "boss", enemyHealth: 120 }
];
function hash(input) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
function random(seed, turn, index) {
  const value = hash(`${seed}:${turn}:${index}`);
  return value % 1e4 / 1e4;
}
function nextIntent(seed, turn, roomIndex) {
  const roll = random(seed, turn, roomIndex);
  return roll > 0.78 ? "heavy" : roll > 0.55 ? "drain" : "strike";
}
function createDungeonRun(runId, seed, build) {
  const stats = deriveCombatStats(build.attributes);
  return {
    runId,
    seed,
    status: "active",
    roomIndex: 0,
    turn: 1,
    health: stats.maxHealth,
    maxHealth: stats.maxHealth,
    energy: stats.maxEnergy,
    guardMeter: 0,
    momentumChain: 0,
    enemyHealth: ROOMS[0].enemyHealth,
    enemyMaxHealth: ROOMS[0].enemyHealth,
    enemyIntent: nextIntent(seed, 1, 0),
    versionConflictStacks: 0,
    cooldowns: {},
    actionHistory: ["Run initialized. The Gate scans for abandoned dependencies."],
    processedKeys: []
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

// base44/functions/startDungeonRun/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const body = await jsonBody(req);
  const architect = (await entities.Architect.filter({ userId: user.id }, "-updatedAt", 1))[0];
  if (!architect || architect.buildVersion !== body.architectBuildVersion) throw new Error("INVALID_BUILD");
  const runId = crypto.randomUUID();
  const seedBytes = crypto.getRandomValues(new Uint8Array(16));
  const seed = Array.from(seedBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const build = {
    attributes: {
      force: architect.force,
      guard: architect.guard,
      momentum: architect.momentum,
      precision: architect.precision,
      insight: architect.insight
    },
    activeAbilityIds: architect.activeAbilityIds,
    passiveTraitIds: architect.passiveTraitIds,
    artifactId: architect.artifactId,
    primaryAffinity: architect.primaryAffinity,
    buildVersion: architect.buildVersion
  };
  const state = createDungeonRun(runId, seed, build);
  const created = await entities.DungeonRun.create({
    userId: user.id,
    dungeonDefinitionId: "dependency-depths",
    dungeonVersion: DUNGEON_VERSION,
    seed,
    status: state.status,
    currentRoomIndex: state.roomIndex,
    currentTurn: state.turn,
    health: state.health,
    maxHealth: state.maxHealth,
    energy: state.energy,
    guardMeter: state.guardMeter,
    momentumChain: state.momentumChain,
    statusEffects: [],
    statePayload: state,
    buildSnapshot: build,
    calculationVersion: "forge-2026.1",
    rewardStatus: "pending",
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastActionAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await audit(entities, {
    userId: user.id,
    action: "dungeon_started",
    entityType: "DungeonRun",
    entityId: created.id,
    correlationId
  });
  const safeState = { ...state, seed: void 0 };
  return { runId: created.id, status: "active", state: safeState };
});
