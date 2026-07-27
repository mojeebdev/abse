import { createDungeonRun, DUNGEON_VERSION } from "../../../src/domain/dungeon.ts";
import { audit, context, jsonBody, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const body = await jsonBody<{ architectBuildVersion: number }>(req);
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
      insight: architect.insight,
    },
    activeAbilityIds: architect.activeAbilityIds,
    passiveTraitIds: architect.passiveTraitIds,
    artifactId: architect.artifactId,
    primaryAffinity: architect.primaryAffinity,
    buildVersion: architect.buildVersion,
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
    startedAt: new Date().toISOString(),
    lastActionAt: new Date().toISOString(),
  });
  await audit(entities, {
    userId: user.id,
    action: "dungeon_started",
    entityType: "DungeonRun",
    entityId: created.id,
    correlationId,
  });
  const safeState = { ...state, seed: undefined };
  return { runId: created.id, status: "active", state: safeState };
});
