import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";
import { checkAndExpireGame } from "@/lib/time-check";

export async function GET() {
  checkAndExpireGame();
  const state = gameStore.getState();
  const rankings = gameStore.getRankings();

  const players = rankings.map((p) => ({
    nickname: p.nickname,
    solveCount: p.solveCount,
    lastSolveAt: p.lastSolveAt,
    bingoCount: p.bingoCount,
    firstBingoAt: p.firstBingoAt,
    board: p.board,
    solves: Object.fromEntries(p.solves),
  }));

  return NextResponse.json({
    gameId: state.gameId,
    config: state.config,
    status: state.status,
    startedAt: state.startedAt,
    players,
  });
}
