const now = new Date();
const seasonId = "season-1";
const resolvesAt = new Date(now.getTime() + 86_400_000).toISOString();

const factionSeeds = [
  ["type-wardens", "Type Wardens", "typescript"],
  ["pyre-scribes", "Pyre Scribes", "python"],
  ["rustbound", "Rustbound", "rust"],
  ["gopher-vanguard", "Gopher Vanguard", "go"],
  ["runtime-covenant", "Runtime Covenant", "javascript"],
  ["kernel-order", "Kernel Order", "systems"],
];

const factions = [];
for (const [key, name, primaryAffinity] of factionSeeds) {
  const existing = (await base44.asServiceRole.entities.Faction.filter({ key }, "-createdAt", 1))[0];
  factions.push(existing ?? await base44.asServiceRole.entities.Faction.create({
    key, name, primaryAffinity, totalInfluence: 0, currentSeasonId: seasonId, createdAt: now.toISOString(),
  }));
}

const territorySeeds = [
  ["registry-gate", "Registry Gate"],
  ["merge-frontier", "Merge Frontier"],
  ["cache-vault", "Cache Vault"],
  ["runtime-rift", "Runtime Rift"],
  ["release-spire", "Release Spire"],
  ["kernel-throne", "Kernel Throne"],
];

for (let index = 0; index < territorySeeds.length; index += 1) {
  const [key, name] = territorySeeds[index];
  const existing = (await base44.asServiceRole.entities.Territory.filter({ key }, "-updatedAt", 1))[0];
  if (!existing) {
    await base44.asServiceRole.entities.Territory.create({
      key, name, ownerFactionId: factions[index].id, attackInfluenceByFaction: {},
      defenceInfluence: 0, activeModifier: { type: "affinity_boost", value: 0.05 },
      stateVersion: 1, currentSeasonId: seasonId, resolvesAt, updatedAt: now.toISOString(),
    });
  }
}

console.log(`Seeded ${factions.length} factions and ${territorySeeds.length} territories without replacing existing records.`);
