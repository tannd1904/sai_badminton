import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishEvent, CHANNELS } from '@/lib/redis';
import { RulesMode, MatchStatus, AuditActionType } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, team, timerRemainingSeconds, timerIsRunning, winnerTeamId: manualWinnerId } = body;

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        teamA: true,
        teamB: true,
        sets: { orderBy: { setNumber: 'asc' } },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const currentSetNum = match.currentSet || 1;
    let currentSet = match.sets.find((s) => s.setNumber === currentSetNum);

    if (!currentSet) {
      currentSet = await prisma.matchSet.create({
        data: {
          matchId: match.id,
          setNumber: currentSetNum,
          teamAScore: 0,
          teamBScore: 0,
          isFinished: false,
        },
      });
    }

    let updatedSet = { ...currentSet };
    let matchStatus = match.status;
    let winnerTeamId = match.winnerTeamId;
    let courtSideSwitched = match.courtSideSwitched;
    let nextSetNum = currentSetNum;
    let matchEndTime = match.endTime;
    let auditAction: AuditActionType = AuditActionType.ADD_POINT;
    let scoringTeamId: string | null = null;

    if (action === 'ADD_POINT') {
      auditAction = AuditActionType.ADD_POINT;
      if (team === 'A') {
        updatedSet.teamAScore += 1;
        scoringTeamId = match.teamAId;
      } else if (team === 'B') {
        updatedSet.teamBScore += 1;
        scoringTeamId = match.teamBId;
      }

      if (matchStatus === MatchStatus.SCHEDULED) {
        matchStatus = MatchStatus.IN_PROGRESS;
      }

      // Check set winning rules
      let setWon = false;
      let setWinnerId: string | null = null;

      if (match.rulesMode === RulesMode.SINGLE_SET_10MIN) {
        // Sudden death to 21
        if (updatedSet.teamAScore >= 21) {
          setWon = true;
          setWinnerId = match.teamAId;
        } else if (updatedSet.teamBScore >= 21) {
          setWon = true;
          setWinnerId = match.teamBId;
        }
      } else {
        // BO3 standard badminton rules (21 points, deuce by 2, max 30)
        const a = updatedSet.teamAScore;
        const b = updatedSet.teamBScore;
        if ((a >= 21 && a - b >= 2) || a === 30) {
          setWon = true;
          setWinnerId = match.teamAId;
        } else if ((b >= 21 && b - a >= 2) || b === 30) {
          setWon = true;
          setWinnerId = match.teamBId;
        }
      }

      if (setWon) {
        updatedSet.isFinished = true;

        if (match.rulesMode === RulesMode.SINGLE_SET_10MIN) {
          matchStatus = MatchStatus.COMPLETED;
          winnerTeamId = setWinnerId;
          matchEndTime = new Date();
        } else {
          // BO3 check: count sets won so far
          let teamAWins = updatedSet.teamAScore > updatedSet.teamBScore ? 1 : 0;
          let teamBWins = updatedSet.teamBScore > updatedSet.teamAScore ? 1 : 0;

          for (const s of match.sets) {
            if (s.setNumber !== currentSetNum && s.isFinished) {
              if (s.teamAScore > s.teamBScore) teamAWins++;
              if (s.teamBScore > s.teamAScore) teamBWins++;
            }
          }

          if (teamAWins >= 2) {
            matchStatus = MatchStatus.COMPLETED;
            winnerTeamId = match.teamAId;
            matchEndTime = new Date();
          } else if (teamBWins >= 2) {
            matchStatus = MatchStatus.COMPLETED;
            winnerTeamId = match.teamBId;
            matchEndTime = new Date();
          } else {
            // Move to next set
            nextSetNum = Math.min(3, currentSetNum + 1);
            // Ensure next set exists
            const existingNext = match.sets.find((s) => s.setNumber === nextSetNum);
            if (!existingNext) {
              await prisma.matchSet.create({
                data: {
                  matchId: match.id,
                  setNumber: nextSetNum,
                  teamAScore: 0,
                  teamBScore: 0,
                  isFinished: false,
                },
              });
            }
          }
        }
      }
    } else if (action === 'SUBTRACT_POINT' || action === 'UNDO') {
      auditAction = AuditActionType.SUBTRACT_POINT;
      if (team === 'A' && updatedSet.teamAScore > 0) {
        updatedSet.teamAScore -= 1;
        scoringTeamId = match.teamAId;
      } else if (team === 'B' && updatedSet.teamBScore > 0) {
        updatedSet.teamBScore -= 1;
        scoringTeamId = match.teamBId;
      } else {
        // Auto-detect from last audit log if team wasn't specified
        const lastLog = await prisma.scoreAuditLog.findFirst({
          where: { matchId: match.id, setNumber: currentSetNum, actionType: AuditActionType.ADD_POINT },
          orderBy: { timestamp: 'desc' },
        });
        if (lastLog) {
          if (lastLog.scoringTeamId === match.teamAId && updatedSet.teamAScore > 0) {
            updatedSet.teamAScore -= 1;
            scoringTeamId = match.teamAId;
          } else if (lastLog.scoringTeamId === match.teamBId && updatedSet.teamBScore > 0) {
            updatedSet.teamBScore -= 1;
            scoringTeamId = match.teamBId;
          }
        }
      }

      // Unmark finish if it was finished
      updatedSet.isFinished = false;
      if (matchStatus === MatchStatus.COMPLETED) {
        matchStatus = MatchStatus.IN_PROGRESS;
        winnerTeamId = null;
        matchEndTime = null;
      }
    } else if (action === 'SWITCH_COURT') {
      auditAction = AuditActionType.SWITCH_COURT;
      courtSideSwitched = !courtSideSwitched;
    } else if (action === 'UPDATE_TIMER') {
      // Just updating timer
    } else if (action === 'FINISH_MATCH') {
      matchStatus = MatchStatus.COMPLETED;
      matchEndTime = new Date();
      updatedSet.isFinished = true;
      if (manualWinnerId) {
        winnerTeamId = manualWinnerId;
      } else {
        winnerTeamId = updatedSet.teamAScore >= updatedSet.teamBScore ? match.teamAId : match.teamBId;
      }
    }

    // Persist set update
    const savedSet = await prisma.matchSet.update({
      where: { id: currentSet.id },
      data: {
        teamAScore: updatedSet.teamAScore,
        teamBScore: updatedSet.teamBScore,
        isFinished: updatedSet.isFinished,
      },
    });

    // Create Audit Log
    const auditLog = await prisma.scoreAuditLog.create({
      data: {
        matchId: match.id,
        setNumber: currentSetNum,
        scoringTeamId,
        actionType: auditAction,
        scoreSnapshotA: savedSet.teamAScore,
        scoreSnapshotB: savedSet.teamBScore,
      },
    });

    // Persist match updates
    const updatedMatch = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: matchStatus,
        winnerTeamId,
        courtSideSwitched,
        currentSet: nextSetNum,
        endTime: matchEndTime,
        ...(startTimeCheck(match.startTime, matchStatus)),
        ...(timerRemainingSeconds !== undefined && { timerRemainingSeconds }),
        ...(timerIsRunning !== undefined && { timerIsRunning }),
      },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        winnerTeam: { include: { player1: true, player2: true } },
        sets: { orderBy: { setNumber: 'asc' } },
      },
    });

    // Real-time broadcast payload
    const payload = {
      matchId: updatedMatch.id,
      matchCode: updatedMatch.matchCode,
      courtNumber: updatedMatch.courtNumber,
      category: updatedMatch.category,
      status: updatedMatch.status,
      rulesMode: updatedMatch.rulesMode,
      currentSet: updatedMatch.currentSet,
      courtSideSwitched: updatedMatch.courtSideSwitched,
      winnerTeamId: updatedMatch.winnerTeamId,
      winnerTeam: updatedMatch.winnerTeam,
      sets: updatedMatch.sets,
      currentScore: {
        setNumber: currentSetNum,
        teamAScore: savedSet.teamAScore,
        teamBScore: savedSet.teamBScore,
        isFinished: savedSet.isFinished,
      },
      timerRemainingSeconds: updatedMatch.timerRemainingSeconds,
      timerIsRunning: updatedMatch.timerIsRunning,
      auditLog,
    };

    // Low-latency broadcast via Redis Pub/Sub
    await publishEvent(CHANNELS.SCORE_UPDATE, payload);

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      set: savedSet,
      auditLog,
    });
  } catch (error: any) {
    console.error('Error in score endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function startTimeCheck(currentStart: Date | null, status: MatchStatus) {
  if (!currentStart && status === MatchStatus.IN_PROGRESS) {
    return { startTime: new Date() };
  }
  return {};
}

