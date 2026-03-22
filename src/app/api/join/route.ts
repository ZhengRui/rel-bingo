import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";
import { checkAndExpireGame } from "@/lib/time-check";

export async function POST(request: Request) {
  try {
    checkAndExpireGame();
    const { nickname } = await request.json();
    const result = gameStore.join(nickname);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
