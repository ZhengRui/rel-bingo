import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST(request: Request) {
  try {
    const { n, mode, timeLimit, questions } = await request.json();
    gameStore.setup({ n, mode, timeLimit, questions });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
