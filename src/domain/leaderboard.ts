export interface RankedCandidate {
  userId: string;
  score: number;
  updatedAt: string;
}

export function rankCandidates(candidates: RankedCandidate[]) {
  return [...candidates]
    .sort((left, right) =>
      right.score - left.score ||
      left.updatedAt.localeCompare(right.updatedAt) ||
      left.userId.localeCompare(right.userId),
    )
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

