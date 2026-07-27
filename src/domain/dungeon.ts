import type { ArchitectBuild } from "./architect";
import { deriveCombatStats } from "./architect";
import type { CombatAction, CombatState } from "./types";

export const DUNGEON_VERSION = "dependency-depths-1";

export const ROOMS = [
  { name: "The Unmaintained Gate", kind: "combat", enemyHealth: 40 },
  { name: "Chamber of Conflicting Versions", kind: "event", enemyHealth: 1 },
  { name: "The Deprecated Guardian", kind: "combat", enemyHealth: 70 },
  { name: "Cache of Forgotten Packages", kind: "event", enemyHealth: 1 },
  { name: "The Dependency Phantom", kind: "boss", enemyHealth: 120 },
] as const;

function hash(input: string): number {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function random(seed: string, turn: number, index: number): number {
  const value = hash(`${seed}:${turn}:${index}`);
  return (value % 10000) / 10000;
}

function nextIntent(seed: string, turn: number, roomIndex: number): CombatState["enemyIntent"] {
  const roll = random(seed, turn, roomIndex);
  return roll > 0.78 ? "heavy" : roll > 0.55 ? "drain" : "strike";
}

export function createDungeonRun(runId: string, seed: string, build: ArchitectBuild): CombatState {
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
    processedKeys: [],
  };
}

function enterNextRoom(state: CombatState): CombatState {
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
        nextRoomIndex === 1
          ? "Conflicting versions detected. Choose how to resolve the graph."
          : "The forgotten package cache offers three recovery paths.",
        ...state.actionHistory,
      ],
    };
  }
  return {
    ...state,
    roomIndex: nextRoomIndex,
    enemyHealth: room.enemyHealth,
    enemyMaxHealth: room.enemyHealth,
    enemyIntent: nextIntent(state.seed, state.turn, nextRoomIndex),
    versionConflictStacks: 0,
    lastPlayerAction: undefined,
    eventPending: undefined,
    actionHistory: [`Entered ${room.name}.`, ...state.actionHistory],
  };
}

export function resolveCombatTurn(
  state: CombatState,
  action: CombatAction,
  build: ArchitectBuild,
  idempotencyKey: string,
): CombatState {
  if (state.status !== "active") throw new Error("RUN_NOT_ACTIVE");
  if (!idempotencyKey.trim()) throw new Error("INVALID_ACTION");
  if (state.processedKeys.includes(idempotencyKey)) return state;

  if (state.eventPending) {
    if (action.type !== "event") throw new Error("INVALID_ACTION");
    let health = state.health;
    let energy = state.energy;
    let conflicts = state.versionConflictStacks;
    let message = "";
    if (state.eventPending === "conflicts") {
      if (!["stabilize", "force", "inspect"].includes(action.choice)) throw new Error("INVALID_ACTION");
      if (action.choice === "stabilize") {
        health = Math.min(state.maxHealth, health + 10);
        message = "You stabilized the graph and recovered 10 integrity.";
      } else if (action.choice === "force") {
        conflicts += 2;
        message = "Compatibility forced. Two conflict stacks remain in the build.";
      } else {
        energy = Math.min(8, energy + 2);
        message = "Insight exposed the safe dependency path. Energy increased by 2.";
      }
    } else {
      if (!["recover", "package", "corrupted"].includes(action.choice)) throw new Error("INVALID_ACTION");
      if (action.choice === "recover") {
        health = Math.min(state.maxHealth, health + 22);
        message = "You restored from the signed cache and recovered 22 integrity.";
      } else if (action.choice === "package") {
        energy = Math.min(8, energy + 3);
        message = "A forgotten package yielded 3 energy.";
      } else {
        health = Math.max(1, health - 12);
        energy = Math.min(8, energy + 5);
        message = "The corrupted package cost 12 integrity and released 5 energy.";
      }
    }
    return enterNextRoom({
      ...state,
      health,
      energy,
      versionConflictStacks: conflicts,
      eventPending: undefined,
      turn: state.turn + 1,
      processedKeys: [...state.processedKeys, idempotencyKey],
      actionHistory: [message, ...state.actionHistory],
      lastPlayerAction: "event",
    });
  }

  const stats = deriveCombatStats(build.attributes);
  const cooldowns = Object.fromEntries(
    Object.entries(state.cooldowns).map(([id, turns]) => [id, Math.max(0, turns - 1)]),
  );
  const critical = random(state.seed, state.turn, 0) < stats.criticalChance;
  let enemyHealth = state.enemyHealth;
  let health = state.health;
  let energy = state.energy;
  let guardMeter = 0;
  let momentumChain = state.momentumChain;
  let conflicts = state.versionConflictStacks;
  const log: string[] = [];

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
      lastPlayerAction: action.type,
    });
  }

  const repeatPenalty =
    state.roomIndex === 2 && state.lastPlayerAction === action.type ? 5 : 0;
  const phaseBonus =
    state.roomIndex === 4 && state.enemyHealth < state.enemyMaxHealth / 2 ? 4 : 0;
  const baseEnemyDamage =
    state.enemyIntent === "heavy" ? 19 : state.enemyIntent === "drain" ? 12 : 10;
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
    actionHistory: [...log, ...state.actionHistory],
  };
}
