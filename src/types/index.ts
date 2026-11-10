import { Role, Gender, Category, GroupName, RoundType, MatchStatus, RulesMode, AuditActionType } from '@prisma/client';

export type { Role, Gender, Category, GroupName, RoundType, MatchStatus, RulesMode, AuditActionType };

export interface PlayerData {
  id: string;
  name: string;
  gender: Gender;
  pool: number;
  powerRating: number;
  isSaiStaff: boolean;
  department?: string | null;
}

export interface TeamData {
  id: string;
  teamCode: string;
  category: Category;
  groupName: GroupName;
  player1Id: string;
  player1: PlayerData;
  player2Id: string;
  player2: PlayerData;
  totalPower: number;
}

export interface MatchSetData {
  id: string;
  matchId: string;
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
  isFinished: boolean;
}

export interface ScoreAuditLogData {
  id: string;
  matchId: string;
  setNumber: number;
  scoringTeamId?: string | null;
  actionType: AuditActionType;
  scoreSnapshotA: number;
  scoreSnapshotB: number;
  timestamp: string | Date;
}

export interface MatchData {
  id: string;
  matchCode: string;
  category: Category;
  roundType: RoundType;
  courtNumber: number;
  refereeId?: string | null;
  referee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  teamAId?: string | null;
  teamA?: TeamData | null;
  teamBId?: string | null;
  teamB?: TeamData | null;
  status: MatchStatus;
  rulesMode: RulesMode;
  winnerTeamId?: string | null;
  winnerTeam?: TeamData | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  courtSideSwitched: boolean;
  currentSet: number;
  timerRemainingSeconds: number | null;
  timerIsRunning: boolean;
  orderIndex: number;
  sets: MatchSetData[];
  auditLogs?: ScoreAuditLogData[];
}

export interface GroupStandingItem {
  teamId: string;
  teamCode: string;
  category: Category;
  groupName: GroupName;
  player1Name: string;
  player2Name: string;
  played: number;
  won: number;
  lost: number;
  points: number; // 2 points per win, 0 for loss
  setsWon: number;
  setsLost: number;
  setDiff: number;
  pointsScored: number;
  pointsConceded: number;
  pointDiff: number;
  rank: number;
}

export interface ConflictViolation {
  type: 'SIMULTANEOUS_MATCH' | 'BUFFER_VIOLATION';
  playerId: string;
  playerName: string;
  matchA: {
    id: string;
    matchCode: string;
    courtNumber: number;
    startTime: string;
    category: Category;
  };
  matchB: {
    id: string;
    matchCode: string;
    courtNumber: number;
    startTime: string;
    category: Category;
  };
  bufferMinutes?: number;
  message: string;
}

export interface LiveScorePayload {
  matchId: string;
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
  courtSideSwitched: boolean;
  isFinished: boolean;
  winnerTeamId?: string | null;
  status: MatchStatus;
  timerRemainingSeconds?: number | null;
  timerIsRunning?: boolean;
  auditLog?: ScoreAuditLogData;
}

