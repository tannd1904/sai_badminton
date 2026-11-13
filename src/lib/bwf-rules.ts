export type BwfSetOutcome = {
  setWon: boolean;
  winnerSide: 'A' | 'B' | null;
};

/**
 * Evaluate whether a badminton set is completed under official BWF 21-point rules:
 * - First to 21 points with at least a 2-point lead wins.
 * - From 20-20 onwards, a 2-point lead is required, capped at 30 points (29-29 -> 30 wins).
 */
export function evaluateBwfSet(teamAScore: number, teamBScore: number): BwfSetOutcome {
  if ((teamAScore >= 21 && teamAScore - teamBScore >= 2) || teamAScore >= 30) {
    return { setWon: true, winnerSide: 'A' };
  }
  if ((teamBScore >= 21 && teamBScore - teamAScore >= 2) || teamBScore >= 30) {
    return { setWon: true, winnerSide: 'B' };
  }
  return { setWon: false, winnerSide: null };
}

/**
 * Determine whether scoring the very next point would win the current set under BWF rules.
 */
export function isBwfSetPointFor(score: number, opponentScore: number): boolean {
  const current = evaluateBwfSet(score, opponentScore);
  if (current.setWon) return false;
  return (score + 1 >= 21 && score + 1 - opponentScore >= 2) || score + 1 >= 30;
}

/**
 * Evaluate overall match outcome based on sets array and rulesMode ('BO3' vs single set).
 */
export function evaluateBwfMatch<T extends { teamAScore: number; teamBScore: number; winnerId?: string | null }>(
  sets: T[],
  rulesMode: string,
  teamAId?: string | null,
  teamBId?: string | null
): {
  isCompleted: boolean;
  winnerSide: 'A' | 'B' | null;
  winnerTeamId: string | null;
  setsWonA: number;
  setsWonB: number;
} {
  let setsWonA = 0;
  let setsWonB = 0;

  for (const s of sets) {
    if (s.winnerId && teamAId && s.winnerId === teamAId) {
      setsWonA++;
    } else if (s.winnerId && teamBId && s.winnerId === teamBId) {
      setsWonB++;
    } else {
      const outcome = evaluateBwfSet(s.teamAScore, s.teamBScore);
      if (outcome.winnerSide === 'A') setsWonA++;
      else if (outcome.winnerSide === 'B') setsWonB++;
    }
  }

  const requiredSets = rulesMode === 'BO3' ? 2 : 1;
  if (setsWonA >= requiredSets) {
    return {
      isCompleted: true,
      winnerSide: 'A',
      winnerTeamId: teamAId ?? null,
      setsWonA,
      setsWonB,
    };
  }
  if (setsWonB >= requiredSets) {
    return {
      isCompleted: true,
      winnerSide: 'B',
      winnerTeamId: teamBId ?? null,
      setsWonA,
      setsWonB,
    };
  }

  return {
    isCompleted: false,
    winnerSide: null,
    winnerTeamId: null,
    setsWonA,
    setsWonB,
  };
}

