import type { Category, RulesMode } from '@prisma/client';
import { ConflictViolation } from '../types';

interface MatchScheduleItem {
  id: string;
  matchCode: string;
  courtNumber: number;
  category: Category;
  rulesMode: RulesMode;
  startTime: Date | string | null;
  endTime?: Date | string | null;
  teamA?: {
    teamCode: string;
    player1: { id: string; name: string; pool: number };
    player2: { id: string; name: string; pool: number };
  } | null;
  teamB?: {
    teamCode: string;
    player1: { id: string; name: string; pool: number };
    player2: { id: string; name: string; pool: number };
  } | null;
}

// Estimated match durations: Single set = 12 mins, BO3 = 30 mins
export function getEstimatedDurationMinutes(rulesMode: RulesMode | string): number {
  return (rulesMode as string) === 'SINGLE_SET_10MIN' ? 12 : 30;
}

const REQUIRED_BUFFER_MINUTES = 10;

/**
 * Checks an entire tournament match schedule for:
 * 1. Concurrent court overlap for the same player (especially Pool 1 players).
 * 2. Less than 10-minute rest buffer between consecutive matches for any player.
 */
export function checkScheduleConflicts(matches: MatchScheduleItem[]): ConflictViolation[] {
  const violations: ConflictViolation[] = [];

  // Map of playerId -> list of scheduled matches
  const playerMatchesMap = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      isPool1: boolean;
      match: MatchScheduleItem;
      start: Date;
      end: Date;
    }[]
  >();

  for (const match of matches) {
    if (!match.startTime) continue;
    const start = new Date(match.startTime);
    const duration = getEstimatedDurationMinutes(match.rulesMode);
    const end = match.endTime ? new Date(match.endTime) : new Date(start.getTime() + duration * 60 * 1000);

    const athletes = [
      match.teamA?.player1,
      match.teamA?.player2,
      match.teamB?.player1,
      match.teamB?.player2,
    ];

    for (const athlete of athletes) {
      if (!athlete) continue;
      if (!playerMatchesMap.has(athlete.id)) {
        playerMatchesMap.set(athlete.id, []);
      }
      playerMatchesMap.get(athlete.id)!.push({
        playerId: athlete.id,
        playerName: athlete.name,
        isPool1: athlete.pool === 1,
        match,
        start,
        end,
      });
    }
  }

  // Iterate over every player's matches and check for collisions
  for (const [playerId, playerEntries] of Array.from(playerMatchesMap.entries())) {
    // Sort chronologically by start time
    playerEntries.sort((a: { start: Date }, b: { start: Date }) => a.start.getTime() - b.start.getTime());

    for (let i = 0; i < playerEntries.length; i++) {
      for (let j = i + 1; j < playerEntries.length; j++) {
        const itemA = playerEntries[i];
        const itemB = playerEntries[j];

        // If they are on the exact same court and time, or different courts
        const aStart = itemA.start.getTime();
        const aEnd = itemA.end.getTime();
        const bStart = itemB.start.getTime();
        const bEnd = itemB.end.getTime();

        // 1. Simultaneous match conflict (Overlapping windows)
        const isOverlapping = aStart < bEnd && bStart < aEnd;

        if (isOverlapping) {
          violations.push({
            type: 'SIMULTANEOUS_MATCH',
            playerId,
            playerName: itemA.playerName,
            matchA: {
              id: itemA.match.id,
              matchCode: itemA.match.matchCode,
              courtNumber: itemA.match.courtNumber,
              startTime: itemA.start.toISOString(),
              category: itemA.match.category,
            },
            matchB: {
              id: itemB.match.id,
              matchCode: itemB.match.matchCode,
              courtNumber: itemB.match.courtNumber,
              startTime: itemB.start.toISOString(),
              category: itemB.match.category,
            },
            message: `CRITICAL CONFLICT: Pool 1 athlete ${itemA.playerName} is scheduled simultaneously on Court ${itemA.match.courtNumber} (${itemA.match.matchCode}) and Court ${itemB.match.courtNumber} (${itemB.match.matchCode})!`,
          });
          continue; // Don't also flag buffer if already overlapping
        }

        // 2. Buffer violation check (< 10 minutes between end of match A and start of match B)
        // Since sorted by start time, itemB starts after itemA starts
        const gapMs = bStart - aEnd;
        const gapMinutes = Math.floor(gapMs / (60 * 1000));

        if (gapMinutes < REQUIRED_BUFFER_MINUTES) {
          violations.push({
            type: 'BUFFER_VIOLATION',
            playerId,
            playerName: itemA.playerName,
            bufferMinutes: Math.max(0, gapMinutes),
            matchA: {
              id: itemA.match.id,
              matchCode: itemA.match.matchCode,
              courtNumber: itemA.match.courtNumber,
              startTime: itemA.start.toISOString(),
              category: itemA.match.category,
            },
            matchB: {
              id: itemB.match.id,
              matchCode: itemB.match.matchCode,
              courtNumber: itemB.match.courtNumber,
              startTime: itemB.start.toISOString(),
              category: itemB.match.category,
            },
            message: `BUFFER VIOLATION: Athlete ${itemA.playerName} has only ${gapMinutes}m rest between ${itemA.match.matchCode} (Court ${itemA.match.courtNumber}) and ${itemB.match.matchCode} (Court ${itemB.match.courtNumber}). Required minimum is ${REQUIRED_BUFFER_MINUTES}m.`,
          });
        }
      }
    }
  }

  return violations;
}
