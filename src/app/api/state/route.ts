import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function GET() {
  const state = gameStore.getState();
  const rankings = gameStore.getRankings();

  const players = rankings.map((p) => ({
    nickname: p.nickname,
    solveCount: p.solveCount,
    lastSolveAt: p.lastSolveAt,
    hasBingo: p.hasBingo,
    bingoAt: p.bingoAt,
    board: p.board,
    solves: Object.fromEntries(p.solves),
  }));

  return NextResponse.json({
    config: state.config,
    status: state.status,
    startedAt: state.startedAt,
    players,
  });
}
