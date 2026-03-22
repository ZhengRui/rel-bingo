import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";
import { checkAndExpireGame } from "@/lib/time-check";

export async function POST(request: Request) {
  try {
    checkAndExpireGame();
    const { nickname, cellIndex, answeredBy } = await request.json();
    gameStore.solve(nickname, cellIndex, answeredBy);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
