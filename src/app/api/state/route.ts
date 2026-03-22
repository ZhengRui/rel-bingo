import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function GET() {
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
