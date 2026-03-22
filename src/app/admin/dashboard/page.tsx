"use client";

import { useState, useEffect, useCallback } from "react";

interface SolveInfo {
  answeredBy: string;
  solvedAt: number;
}

interface PlayerState {
  nickname: string;
  solveCount: number;
  lastSolveAt: number | null;
  hasBingo: boolean;
  bingoAt: number | null;
  board: number[];
  solves: Record<number, SolveInfo>;
}

interface GameState {
  config: { n: number; mode: string; timeLimit: number; questions: string[] };
  status: string;
  startedAt: number | null;
  players: PlayerState[];
}

export default function DashboardPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        setState(await res.json());
      }
    } catch {
      // silently retry next poll
    }
  }, []);

  useEffect(() => {
    fetchState();
    const pollInterval = setInterval(fetchState, 2500);
    const clockInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, [fetchState]);

  async function handleEnd() {
    await fetch("/api/end", { method: "POST" });
    fetchState();
  }

  if (!state) return <div className="p-8 text-center">Loading...</div>;

  const { config, status, startedAt, players } = state;
  const totalCells = config.n * config.n;

  let timeRemaining = "";
  if (startedAt && status === "active") {
    const elapsed = Math.floor((now - startedAt) / 1000);
    const total = config.timeLimit * 60;
    const remaining = Math.max(0, total - elapsed);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timeRemaining = `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold">Relationship Bingo</h1>
          <span className="px-3 py-1 rounded-full bg-purple-600 text-sm font-medium">
            {config.mode === "bingo" ? "Bingo Mode" : "Leaderboard Mode"}
          </span>
          <span className="text-gray-400">{players.length} players</span>
        </div>
        <div className="flex items-center gap-6">
          {status === "active" && (
            <span className="text-3xl font-mono font-bold text-yellow-400">
              {timeRemaining}
            </span>
          )}
          {status === "ended" && (
            <span className="text-xl font-bold text-red-400">Game Over</span>
          )}
          {status === "active" && (
            <button
              onClick={handleEnd}
              className="px-6 py-2 bg-red-600 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              End Game
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {players.map((player, index) => (
          <div
            key={player.nickname}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
              player.hasBingo
                ? "bg-yellow-900/50 border-2 border-yellow-400 shadow-lg shadow-yellow-400/20"
                : "bg-gray-800"
            }`}
          >
            <span className="text-2xl font-bold text-gray-400 w-8 text-right">
              {index + 1}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold truncate">
                  {player.nickname}
                </span>
                {player.hasBingo && (
                  <span className="px-2 py-0.5 bg-yellow-400 text-black text-xs font-bold rounded-full animate-pulse">
                    BINGO!
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-400">
                {player.solveCount}/{totalCells} solved
              </span>
            </div>

            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns: `repeat(${config.n}, 1fr)`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, cellIdx) => {
                const solved = cellIdx in player.solves;
                return (
                  <div
                    key={cellIdx}
                    className={`w-4 h-4 rounded-sm ${
                      solved ? "bg-green-500" : "bg-gray-600"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {players.length === 0 && (
          <p className="text-center text-gray-500 py-12">
            Waiting for players to join...
          </p>
        )}
      </div>
    </div>
  );
}
