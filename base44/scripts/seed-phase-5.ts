// Run with `npx base44 exec base44/scripts/seed-phase-5.ts`.
// This seed is additive and idempotent: it never deletes or renames records.
const definitions = [
  {
    entity: "AbilityDefinition",
    records: [
      { key: "type-guard", name: "Type Guard", affinity: "typescript", energyCost: 2, cooldownTurns: 2, targetingType: "self", effectConfig: { guard: 22 }, enabled: true, version: "1" },
      { key: "async-lunge", name: "Async Lunge", affinity: "typescript", energyCost: 2, cooldownTurns: 2, targetingType: "enemy", effectConfig: { damageMultiplier: 1.65 }, enabled: true, version: "1" },
      { key: "dependency-scan", name: "Dependency Scan", affinity: "typescript", energyCost: 1, cooldownTurns: 3, targetingType: "enemy", effectConfig: { revealIntentTurns: 2 }, enabled: true, version: "1" },
      { key: "rollback", name: "Rollback", affinity: "utility", energyCost: 3, cooldownTurns: 4, targetingType: "self", effectConfig: { restorePreviousHealthPercent: 0.35 }, enabled: true, version: "1" },
    ],
  },
  {
    entity: "ArtifactDefinition",
    records: [
      { key: "lockfile-sigil", name: "Lockfile Sigil", rarity: "common", effectConfig: { energyCost: 1, guard: 18 }, enabled: true, version: "1" },
    ],
  },
  {
    entity: "TraitDefinition",
    records: [
      { key: "one-year-flame", name: "The One-Year Flame", description: "Successful consecutive turns build extra Momentum.", rarity: "rare", criteriaVersion: "forge-2026.1", combatEffectConfig: { momentumPerSuccess: 1 }, enabled: true },
      { key: "merge-sovereign", name: "Merge Sovereign", description: "Successful counters trigger a follow-up strike.", rarity: "rare", criteriaVersion: "forge-2026.1", combatEffectConfig: { counterFollowUp: true }, enabled: true },
      { key: "polyglot-architect", name: "Polyglot Architect", description: "Change active affinity once per dungeon.", rarity: "rare", criteriaVersion: "forge-2026.1", combatEffectConfig: { affinitySwapCount: 1 }, enabled: true },
      { key: "shipwright", name: "Shipwright", description: "Begin each run with a temporary crafted artifact.", rarity: "rare", criteriaVersion: "forge-2026.1", combatEffectConfig: { temporaryArtifact: true }, enabled: true },
    ],
  },
  {
    entity: "DungeonDefinition",
    records: [
      {
        key: "dependency-depths",
        name: "The Dependency Depths",
        version: "dependency-depths-1",
        roomConfig: [
          { key: "unmaintained-gate", type: "combat" },
          { key: "conflicting-versions", type: "event" },
          { key: "deprecated-guardian", type: "elite" },
          { key: "forgotten-packages", type: "event" },
          { key: "dependency-phantom", type: "boss" },
        ],
        rewardConfig: {},
        enabled: true,
      },
    ],
  },
];

for (const group of definitions) {
  const entity = base44.asServiceRole.entities[group.entity];
  for (const record of group.records) {
    const existing = await entity.filter({ key: record.key }, "-created_date", 1);
    if (!existing[0]) await entity.create(record);
  }
}

console.log("Phase 0–5 definitions are present.");
