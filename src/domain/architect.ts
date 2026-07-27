import { ATTRIBUTES, type Attributes, type ScoreCalculation } from "./types";

export interface ArchitectBuild {
  attributes: Attributes;
  activeAbilityIds: string[];
  passiveTraitIds: string[];
  artifactId: string;
  primaryAffinity: string;
  buildVersion: number;
}

export interface BuildInventory {
  abilityIds: string[];
  traitIds: string[];
  artifactIds: string[];
  affinities: string[];
}

export class BuildValidationError extends Error {
  code = "INVALID_BUILD" as const;
}

export function validateArchitectBuild(
  build: ArchitectBuild,
  score: ScoreCalculation,
  inventory: BuildInventory,
  expectedVersion?: number,
): void {
  if (expectedVersion !== undefined && build.buildVersion !== expectedVersion) {
    throw new BuildValidationError("This build changed elsewhere. Reload before saving.");
  }
  const values = ATTRIBUTES.map((attribute) => build.attributes[attribute]);
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new BuildValidationError("Attributes must be non-negative whole numbers.");
  }
  if (values.reduce((sum, value) => sum + value, 0) > score.totalForgePoints) {
    throw new BuildValidationError("Allocated attributes exceed verified Forge Points.");
  }
  if (build.activeAbilityIds.length !== 3 || new Set(build.activeAbilityIds).size !== 3) {
    throw new BuildValidationError("Choose three different active abilities.");
  }
  if (build.passiveTraitIds.length > 2 || new Set(build.passiveTraitIds).size !== build.passiveTraitIds.length) {
    throw new BuildValidationError("Choose no more than two different passive traits.");
  }
  if (!build.activeAbilityIds.every((id) => inventory.abilityIds.includes(id))) {
    throw new BuildValidationError("The build contains an unowned ability.");
  }
  if (!build.passiveTraitIds.every((id) => inventory.traitIds.includes(id))) {
    throw new BuildValidationError("The build contains an ineligible trait.");
  }
  if (!inventory.artifactIds.includes(build.artifactId)) {
    throw new BuildValidationError("The build contains an unowned artifact.");
  }
  if (!inventory.affinities.includes(build.primaryAffinity)) {
    throw new BuildValidationError("The selected affinity is not available.");
  }
}

export function deriveCombatStats(attributes: Attributes) {
  return {
    maxHealth: 90 + attributes.guard * 4,
    baseDamage: 7 + attributes.force * 0.8,
    maxEnergy: 5 + Math.floor(attributes.insight / 8),
    criticalChance: Math.min(0.35, 0.05 + attributes.precision * 0.006),
    initiative: 5 + attributes.momentum * 0.7,
  };
}

