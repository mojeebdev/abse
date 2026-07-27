export interface TerritoryState {
  ownerFactionId?: string;
  defenceInfluence: number;
  attackInfluenceByFaction: Record<string, number>;
  stateVersion: number;
}

export interface TerritoryResolution {
  ownerFactionId?: string;
  winningInfluence: number;
  changedOwner: boolean;
  nextStateVersion: number;
}

export function resolveTerritory(state: TerritoryState): TerritoryResolution {
  const attacks = Object.entries(state.attackInfluenceByFaction)
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    .sort(([leftId, leftAmount], [rightId, rightAmount]) =>
      rightAmount - leftAmount || leftId.localeCompare(rightId),
    );
  const [attackingFaction, attackingInfluence = 0] = attacks[0] ?? [];
  const defendingTotal = state.ownerFactionId ? state.defenceInfluence : 0;
  const attackerWins = Boolean(attackingFaction) && attackingInfluence > defendingTotal;
  const ownerFactionId = attackerWins ? attackingFaction : state.ownerFactionId;
  return {
    ownerFactionId,
    winningInfluence: attackerWins ? attackingInfluence : defendingTotal,
    changedOwner: Boolean(attackerWins && ownerFactionId !== state.ownerFactionId),
    nextStateVersion: state.stateVersion + 1,
  };
}

export function influenceBalance(earned: number[], committed: number[]): number {
  const income = earned.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  const spent = committed.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  return Math.max(0, income - spent);
}

