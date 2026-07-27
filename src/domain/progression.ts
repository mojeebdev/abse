import type { CombatState } from "./types";

export const REWARD_VERSION = "rewards-2026.1";

export interface DungeonRewards {
  experience: number;
  seasonalRating: number;
  influence: number;
  dungeonScore: number;
}

export function calculateDungeonRewards(state: CombatState): DungeonRewards {
  if (state.status !== "completed") {
    return { experience: 20, seasonalRating: 0, influence: 0, dungeonScore: 0 };
  }
  const healthRatio = state.maxHealth ? state.health / state.maxHealth : 0;
  const efficiency = Math.max(0, 45 - state.turn);
  return {
    experience: 120 + Math.floor(healthRatio * 60),
    seasonalRating: 20 + Math.floor(healthRatio * 20),
    influence: 25 + Math.floor(healthRatio * 15),
    dungeonScore: Math.max(1, Math.round(1_000 + healthRatio * 500 + efficiency * 12)),
  };
}

export function levelForExperience(experience: number): number {
  if (!Number.isFinite(experience) || experience <= 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(experience / 100)) + 1);
}

