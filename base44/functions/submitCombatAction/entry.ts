import { resolveCombatTurn } from "../../../src/domain/dungeon.ts";
import { ApiError, audit, context, jsonBody, serve, sha256 } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey) throw new ApiError("INVALID_ACTION", "An idempotency key is required.");
  const body = await jsonBody<{ runId: string; turnNumber: number; action: any }>(req);
  const runs = await entities.DungeonRun.filter({ id: body.runId, userId: user.id }, "-startedAt", 1);
  const run = runs[0];
  if (!run || run.status !== "active") throw new ApiError("RUN_NOT_ACTIVE", "This run is not active.", 409);
  if (run.currentTurn !== body.turnNumber) throw new ApiError("TURN_ALREADY_RESOLVED", "That turn is already resolved.", 409);
  const duplicate = await entities.CombatTurn.filter({ dungeonRunId: run.id, idempotencyKey }, "-resolvedAt", 1);
  if (duplicate[0]) return {
    turnNumber: duplicate[0].turnNumber,
    combatLog: duplicate[0].combatLog,
    state: duplicate[0].stateAfter,
    runStatus: duplicate[0].stateAfter.status,
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
    resolvedAt: new Date().toISOString(),
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
    lastActionAt: new Date().toISOString(),
    ...(state.status !== "active" ? { completedAt: new Date().toISOString() } : {}),
  });
  if (state.status !== "active") {
    await audit(entities, {
      userId: user.id,
      action: state.status === "completed" ? "dungeon_completed" : "dungeon_failed",
      entityType: "DungeonRun",
      entityId: run.id,
      correlationId,
    });
  }
  const safeState = { ...state, seed: undefined, processedKeys: undefined };
  return {
    turnNumber: body.turnNumber,
    combatLog: state.actionHistory.slice(0, 3),
    state: safeState,
    runStatus: state.status,
  };
});
