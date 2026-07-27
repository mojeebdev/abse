export interface ChallengeScore {
  dungeonScore: number;
  turns: number;
  healthRemaining: number;
}

export function compareChallengeScores(challenger: ChallengeScore, challenged: ChallengeScore) {
  const challengerTuple = [challenger.dungeonScore, -challenger.turns, challenger.healthRemaining];
  const challengedTuple = [challenged.dungeonScore, -challenged.turns, challenged.healthRemaining];
  for (let index = 0; index < challengerTuple.length; index += 1) {
    if (challengerTuple[index] > challengedTuple[index]) return "challenger" as const;
    if (challengerTuple[index] < challengedTuple[index]) return "challenged" as const;
  }
  return "draw" as const;
}

export function challengeExpired(expiresAt: string, now = new Date()): boolean {
  const timestamp = Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= now.getTime();
}

