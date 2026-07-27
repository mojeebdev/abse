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
function enterNextRoom(state) {
  const nextRoomIndex = state.roomIndex + 1;
  if (nextRoomIndex >= ROOMS.length) {
    return { ...state, status: "completed", actionHistory: ["The Depths compile cleanly.", ...state.actionHistory] };
  }
  const room = ROOMS[nextRoomIndex];
  if (room.kind === "event") {
    return {
      ...state,
      roomIndex: nextRoomIndex,
      enemyHealth: 0,
      enemyMaxHealth: 1,
      eventPending: nextRoomIndex === 1 ? "conflicts" : "cache",
      actionHistory: [
        nextRoomIndex === 1 ? "Conflicting versions detected. Choose how to resolve the graph." : "The forgotten package cache offers three recovery paths.",
        ...state.actionHistory
      ]
    };
  }
  return {
    ...state,
    roomIndex: nextRoomIndex,
    enemyHealth: room.enemyHealth,
    enemyMaxHealth: room.enemyHealth,
    enemyIntent: nextIntent(state.seed, state.turn, nextRoomIndex),
    versionConflictStacks: 0,
    lastPlayerAction: void 0,
    eventPending: void 0,
    actionHistory: [`Entered ${room.name}.`, ...state.actionHistory]
  };
}
function resolveCombatTurn(state, action, build, idempotencyKey) {
  if (state.status !== "active") throw new Error("RUN_NOT_ACTIVE");
  if (!idempotencyKey.trim()) throw new Error("INVALID_ACTION");
  if (state.processedKeys.includes(idempotencyKey)) return state;
  if (state.eventPending) {
    if (action.type !== "event") throw new Error("INVALID_ACTION");
    let health2 = state.health;
    let energy2 = state.energy;
    let conflicts2 = state.versionConflictStacks;
    let message = "";
    if (state.eventPending === "conflicts") {
      if (!["stabilize", "force", "inspect"].includes(action.choice)) throw new Error("INVALID_ACTION");
      if (action.choice === "stabilize") {
        health2 = Math.min(state.maxHealth, health2 + 10);
        message = "You stabilized the graph and recovered 10 integrity.";
      } else if (action.choice === "force") {
        conflicts2 += 2;
        message = "Compatibility forced. Two conflict stacks remain in the build.";
      } else {
        energy2 = Math.min(8, energy2 + 2);
        message = "Insight exposed the safe dependency path. Energy increased by 2.";
      }
    } else {
      if (!["recover", "package", "corrupted"].includes(action.choice)) throw new Error("INVALID_ACTION");
      if (action.choice === "recover") {
        health2 = Math.min(state.maxHealth, health2 + 22);
        message = "You restored from the signed cache and recovered 22 integrity.";
      } else if (action.choice === "package") {
        energy2 = Math.min(8, energy2 + 3);
        message = "A forgotten package yielded 3 energy.";
      } else {
        health2 = Math.max(1, health2 - 12);
        energy2 = Math.min(8, energy2 + 5);
        message = "The corrupted package cost 12 integrity and released 5 energy.";
      }
    }
    return enterNextRoom({
      ...state,
      health: health2,
      energy: energy2,
      versionConflictStacks: conflicts2,
      eventPending: void 0,
      turn: state.turn + 1,
      processedKeys: [...state.processedKeys, idempotencyKey],
      actionHistory: [message, ...state.actionHistory],
      lastPlayerAction: "event"
    });
  }
  const stats = deriveCombatStats(build.attributes);
  const cooldowns = Object.fromEntries(
    Object.entries(state.cooldowns).map(([id, turns]) => [id, Math.max(0, turns - 1)])
  );
  const critical = random(state.seed, state.turn, 0) < stats.criticalChance;
  let enemyHealth = state.enemyHealth;
  let health = state.health;
  let energy = state.energy;
  let guardMeter = 0;
  let momentumChain = state.momentumChain;
  let conflicts = state.versionConflictStacks;
  const log = [];
  if (action.type === "attack") {
    const damage = Math.round(stats.baseDamage * (critical ? 1.7 : 1));
    enemyHealth -= damage;
    momentumChain += 1;
    log.push(`You dealt ${damage} damage${critical ? " with a precise critical." : "."}`);
  } else if (action.type === "defend") {
    guardMeter = 8 + build.attributes.guard;
    momentumChain = 0;
    log.push(`You raised ${guardMeter} guard.`);
  } else if (action.type === "recover") {
    health = Math.min(state.maxHealth, health + 12 + Math.floor(build.attributes.insight / 3));
    energy = Math.min(stats.maxEnergy, energy + 2);
    momentumChain = 0;
    log.push("You recovered health and 2 energy.");
  } else if (action.type === "ability") {
    if (energy < 2) throw new Error("INVALID_ACTION");
    if ((cooldowns[action.abilityId] ?? 0) > 0) throw new Error("INVALID_ACTION");
    const damage = Math.round(stats.baseDamage * 1.65 + build.attributes.insight * 0.35);
    energy -= 2;
    enemyHealth -= damage;
    cooldowns[action.abilityId] = 2;
    log.push(`Your ability resolved for ${damage} damage.`);
  } else if (action.type === "artifact") {
    if (energy < 1) throw new Error("INVALID_ACTION");
    energy -= 1;
    guardMeter = 18;
    log.push("The Lockfile Sigil absorbed the unstable graph.");
  }
  if (enemyHealth <= 0) {
    return enterNextRoom({
      ...state,
      turn: state.turn + 1,
      enemyHealth: 0,
      health,
      energy,
      guardMeter,
      momentumChain,
      cooldowns,
      processedKeys: [...state.processedKeys, idempotencyKey],
      actionHistory: [...log, ...state.actionHistory],
      lastPlayerAction: action.type
    });
  }
  const repeatPenalty = state.roomIndex === 2 && state.lastPlayerAction === action.type ? 5 : 0;
  const phaseBonus = state.roomIndex === 4 && state.enemyHealth < state.enemyMaxHealth / 2 ? 4 : 0;
  const baseEnemyDamage = state.enemyIntent === "heavy" ? 19 : state.enemyIntent === "drain" ? 12 : 10;
  const incoming = baseEnemyDamage + repeatPenalty + phaseBonus + conflicts * 2;
  const received = Math.max(1, incoming - guardMeter);
  health -= received;
  if (state.enemyIntent === "drain") energy = Math.max(0, energy - 1);
  if (state.roomIndex === 4) conflicts += 1;
  log.push(`${ROOMS[state.roomIndex].name} dealt ${received} damage.`);
  if (repeatPenalty) log.push("Repeated action detected: the Guardian adapted.");
  return {
    ...state,
    status: health <= 0 ? "failed" : "active",
    turn: state.turn + 1,
    health: Math.max(0, health),
    energy,
    guardMeter,
    momentumChain,
    cooldowns,
    enemyHealth,
    enemyIntent: nextIntent(state.seed, state.turn + 1, state.roomIndex),
    versionConflictStacks: conflicts,
    lastPlayerAction: action.type,
    processedKeys: [...state.processedKeys, idempotencyKey],
    actionHistory: [...log, ...state.actionHistory]
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
async function sha256(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// base44/functions/submitCombatAction/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey) throw new ApiError("INVALID_ACTION", "An idempotency key is required.");
  const body = await jsonBody(req);
  const runs = await entities.DungeonRun.filter({ id: body.runId, userId: user.id }, "-startedAt", 1);
  const run = runs[0];
  if (!run || run.status !== "active") throw new ApiError("RUN_NOT_ACTIVE", "This run is not active.", 409);
  if (run.currentTurn !== body.turnNumber) throw new ApiError("TURN_ALREADY_RESOLVED", "That turn is already resolved.", 409);
  const duplicate = await entities.CombatTurn.filter({ dungeonRunId: run.id, idempotencyKey }, "-resolvedAt", 1);
  if (duplicate[0]) return {
    turnNumber: duplicate[0].turnNumber,
    combatLog: duplicate[0].combatLog,
    state: duplicate[0].stateAfter,
    runStatus: duplicate[0].stateAfter.status
  };
  const beforeHash = await sha256(run.statePayload);
  const state = resolveCombatTurn(run.statePayload, body.action, run.buildSnapshot, idempotencyKey);
  const afterHash = await sha256(state);
  await entities.CombatTurn.create({
    userId: user.id,
    dungeonRunId: run.id,
    turnNumber: body.turnNumber,
    idempotencyKey,
    playerAction: body.action,
    enemyAction: { intent: run.statePayload.enemyIntent },
    randomValues: [],
    stateBeforeHash: beforeHash,
    stateAfter: state,
    stateAfterHash: afterHash,
    combatLog: state.actionHistory.slice(0, 3),
    resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await entities.DungeonRun.update(run.id, {
    status: state.status,
    currentRoomIndex: state.roomIndex,
    currentTurn: state.turn,
    health: state.health,
    energy: state.energy,
    guardMeter: state.guardMeter,
    momentumChain: state.momentumChain,
    statePayload: state,
    lastActionAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...state.status !== "active" ? { completedAt: (/* @__PURE__ */ new Date()).toISOString() } : {}
  });
  if (state.status !== "active") {
    await audit(entities, {
      userId: user.id,
      action: state.status === "completed" ? "dungeon_completed" : "dungeon_failed",
      entityType: "DungeonRun",
      entityId: run.id,
      correlationId
    });
  }
  const safeState = { ...state, seed: void 0, processedKeys: void 0 };
  return {
    turnNumber: body.turnNumber,
    combatLog: state.actionHistory.slice(0, 3),
    state: safeState,
    runStatus: state.status
  };
});
