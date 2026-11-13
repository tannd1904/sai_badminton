import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { publishEvent, CHANNELS } from '../../../../../lib/redis';
import { MatchStatus } from '@prisma/client';
import { advancePlayoffsForCategory } from '../../../../../lib/playoffs';
import { evaluateBwfMatch, evaluateBwfSet } from '../../../../../lib/bwf-rules';

type OverrideSetInput = {
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      setNumber = 1,
      teamAScore,
      teamBScore,
      sets: setsInput,
      status,
      winnerTeamId,
      refereeId,
      courtNumber,
      autoCompleteByBwf = false,
      reason = 'Organizer Score Override',
    } = body;

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: { sets: { orderBy: { setNumber: 'asc' } } },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const incomingSets: OverrideSetInput[] = Array.isArray(setsInput) && setsInput.length > 0
      ? setsInput.map((s: OverrideSetInput) => ({
          setNumber: Number(s.setNumber),
          teamAScore: Math.max(0, Math.min(30, Number(s.teamAScore) || 0)),
          teamBScore: Math.max(0, Math.min(30, Number(s.teamBScore) || 0)),
        }))
      : teamAScore !== undefined && teamBScore !== undefined
      ? [
          {
            setNumber: Number(setNumber),
            teamAScore: Math.max(0, Math.min(30, Number(teamAScore) || 0)),
            teamBScore: Math.max(0, Math.min(30, Number(teamBScore) || 0)),
          },
        ]
      : [];

    const setWritePromises: Promise<unknown>[] = [];

    for (const inputSet of incomingSets) {
      const bwfSet = evaluateBwfSet(inputSet.teamAScore, inputSet.teamBScore);
      const isSetFinished = bwfSet.setWon || status === MatchStatus.COMPLETED;
      const existingSet = match.sets.find((s) => s.setNumber === inputSet.setNumber);

      if (existingSet) {
        setWritePromises.push(
          prisma.matchSet.update({
            where: { id: existingSet.id },
            data: {
              teamAScore: inputSet.teamAScore,
              teamBScore: inputSet.teamBScore,
              isFinished: status === MatchStatus.SCHEDULED ? false : isSetFinished,
            },
          })
        );
      } else {
        setWritePromises.push(
          prisma.matchSet.create({
            data: {
              matchId: match.id,
              setNumber: inputSet.setNumber,
              teamAScore: inputSet.teamAScore,
              teamBScore: inputSet.teamBScore,
              isFinished: status === MatchStatus.SCHEDULED ? false : isSetFinished,
            },
          })
        );
      }
    }

    if (incomingSets.length > 0) {
      const lastSet = incomingSets[incomingSets.length - 1];
      setWritePromises.push(
        prisma.scoreAuditLog.create({
          data: {
            matchId: match.id,
            setNumber: lastSet.setNumber,
            actionType: 'ADD_POINT',
            scoreSnapshotA: lastSet.teamAScore,
            scoreSnapshotB: lastSet.teamBScore,
          },
        })
      );
    }

    if (setWritePromises.length > 0) {
      await Promise.all(setWritePromises);
    }

    // Recompute merged sets to evaluate BWF match completion & winner automatically
    const mergedSetsMap = new Map<number, { setNumber: number; teamAScore: number; teamBScore: number }>();
    for (const s of match.sets) {
      mergedSetsMap.set(s.setNumber, {
        setNumber: s.setNumber,
        teamAScore: s.teamAScore,
        teamBScore: s.teamBScore,
      });
    }
    for (const s of incomingSets) {
      mergedSetsMap.set(s.setNumber, s);
    }
    const mergedSets = Array.from(mergedSetsMap.values()).sort((a, b) => a.setNumber - b.setNumber);
    const bwfMatch = evaluateBwfMatch(mergedSets, match.rulesMode, match.teamAId, match.teamBId);

    let resolvedStatus: MatchStatus = (status as MatchStatus) || match.status;
    if (autoCompleteByBwf && bwfMatch.isCompleted) {
      resolvedStatus = MatchStatus.COMPLETED;
    }

    let resolvedWinnerId: string | null | undefined = winnerTeamId;
    if (resolvedStatus === MatchStatus.COMPLETED) {
      if (!resolvedWinnerId) {
        if (bwfMatch.winnerTeamId) {
          resolvedWinnerId = bwfMatch.winnerTeamId;
        } else {
          // Fallback to highest set/point lead when BTC manually forces COMPLETED
          let winsA = 0;
          let winsB = 0;
          let ptsA = 0;
          let ptsB = 0;
          for (const s of mergedSets) {
            ptsA += s.teamAScore;
            ptsB += s.teamBScore;
            if (s.teamAScore > s.teamBScore) winsA++;
            else if (s.teamBScore > s.teamAScore) winsB++;
          }
          if (winsA > winsB || (winsA === winsB && ptsA > ptsB)) {
            resolvedWinnerId = match.teamAId;
          } else if (winsB > winsA || (winsA === winsB && ptsB > ptsA)) {
            resolvedWinnerId = match.teamBId;
          }
        }
      }
    } else {
      resolvedWinnerId = null;
    }

    // Update match record
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: resolvedStatus,
        winnerTeamId: resolvedWinnerId ?? null,
        endTime: resolvedStatus === MatchStatus.COMPLETED ? match.endTime || new Date() : null,
        ...(refereeId !== undefined && { refereeId }),
        ...(courtNumber !== undefined && { courtNumber }),
      },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        winnerTeam: { include: { player1: true, player2: true } },
        sets: { orderBy: { setNumber: 'asc' } },
        referee: true,
      },
    });

    // Broadcast override immediately
    await publishEvent(CHANNELS.SCORE_UPDATE, {
      matchId: updated.id,
      matchCode: updated.matchCode,
      courtNumber: updated.courtNumber,
      status: updated.status,
      winnerTeamId: updated.winnerTeamId,
      winnerTeam: updated.winnerTeam,
      sets: updated.sets,
      overrideReason: reason,
    });

    if (updated.status === MatchStatus.COMPLETED) {
      try {
        await advancePlayoffsForCategory(updated.category);
      } catch (err) {
        console.error('[Auto Playoff Sync Override Error]:', err);
      }
    }

    await publishEvent(CHANNELS.MATCH_STATUS, {
      matchId: updated.id,
      status: updated.status,
      category: updated.category,
      winnerTeamId: updated.winnerTeamId,
      courtNumber: updated.courtNumber,
    });

    return NextResponse.json({ success: true, match: updated });
  } catch (error: any) {
    console.error('Error in override endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

