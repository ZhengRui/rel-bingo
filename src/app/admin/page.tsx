"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────

interface SolveInfo {
  answeredBy: string;
  solvedAt: number;
}

interface PlayerState {
  nickname: string;
  solveCount: number;
  lastSolveAt: number | null;
  bingoCount: number;
  firstBingoAt: number | null;
  board: number[];
  solves: Record<number, SolveInfo>;
}

interface GameState {
  config: { n: number; mode: string; timeLimit: number; questions: string[] };
  status: string;
  startedAt: number | null;
  players: PlayerState[];
}

// ── Setup Form ─────────────────────────────────────────

function SetupView({ onStarted }: { onStarted: () => void }) {
  const [n, setN] = useState(3);
  const [mode, setMode] = useState<"leaderboard" | "bingo">("leaderboard");
  const [timeLimit, setTimeLimit] = useState(10);
  const [questionsText, setQuestionsText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let questions: string[];
    try {
      questions = JSON.parse(questionsText);
      if (
        !Array.isArray(questions) ||
        !questions.every((q) => typeof q === "string")
      ) {
        throw new Error();
      }
    } catch {
      setError("Invalid JSON — must be an array of strings");
      return;
    }

    const needed = n * n;
    if (questions.length < needed) {
      setError(`Need at least ${needed} questions for a ${n}x${n} grid`);
      return;
    }

    setLoading(true);
    try {
      let res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n, mode, timeLimit, questions }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Setup failed");
        setLoading(false);
        return;
      }
      res = await fetch("/api/start", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Start failed");
        setLoading(false);
        return;
      }
      onStarted();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setQuestionsText(event.target?.result as string);
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <form
        onSubmit={handleStart}
        className="bg-gray-800 rounded-2xl border border-gray-700 p-8 w-full max-w-lg space-y-6"
      >
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-white">Relationship Bingo</h1>
          <p className="text-gray-400 text-sm mt-1">Configure your game</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Grid Size
            </label>
            <select
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              {[2, 3, 4, 5, 6].map((v) => (
                <option key={v} value={v}>
                  {v} x {v} ({v * v} questions)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Time Limit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={60}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <span className="text-gray-400 text-sm whitespace-nowrap">
                min
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Game Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("leaderboard")}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                mode === "leaderboard"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Leaderboard
            </button>
            <button
              type="button"
              onClick={() => setMode("bingo")}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                mode === "bingo"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Bingo
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Questions
          </label>
          <label className="flex items-center justify-center w-full px-4 py-2 bg-gray-700 border border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-600 transition-colors mb-2">
            <span className="text-gray-300 text-sm">
              Upload JSON file or paste below
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <textarea
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            placeholder='["Have you ever been on a blind date?", ...]'
            rows={5}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm placeholder:text-gray-500"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-purple-600 text-white rounded-xl text-lg font-semibold disabled:opacity-50 hover:bg-purple-500 transition-colors"
        >
          {loading ? "Starting..." : "Start Game"}
        </button>
      </form>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────

function DashboardView({
  gameOver,
  onReplay,
}: {
  gameOver: boolean;
  onReplay: () => void;
}) {
  const [state, setState] = useState<GameState | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) setState(await res.json());
    } catch {
      /* retry next poll */
    }
  }, []);

  useEffect(() => {
    fetchState();
    const poll = setInterval(fetchState, 2500);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [fetchState]);

  async function handleEnd() {
    await fetch("/api/end", { method: "POST" });
    fetchState();
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const { config, status, startedAt, players } = state;
  const totalCells = config.n * config.n;
  const isEnded = status === "ended";

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Relationship Bingo</h1>
          <span className="px-3 py-1 rounded-full bg-purple-600/80 text-sm font-medium">
            {config.mode === "bingo" ? "Bingo" : "Leaderboard"}
          </span>
          <span className="text-gray-500">
            {players.length} player{players.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {status === "active" && (
            <>
              <span className="text-3xl font-mono font-bold tabular-nums text-yellow-400">
                {timeRemaining}
              </span>
              <button
                onClick={handleEnd}
                className="px-5 py-2 bg-red-600 rounded-lg font-semibold hover:bg-red-500 transition-colors text-sm"
              >
                End Game
              </button>
            </>
          )}
          {isEnded && (
            <>
              <span className="text-lg font-bold text-red-400">Game Over</span>
              <button
                onClick={onReplay}
                className="px-5 py-2 bg-purple-600 rounded-lg font-semibold hover:bg-purple-500 transition-colors text-sm"
              >
                New Game
              </button>
            </>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {players.map((player, index) => {
          const hasBingo = player.bingoCount > 0;
          return (
            <div
              key={player.nickname}
              className={`flex items-center gap-5 px-6 py-3 rounded-xl transition-all ${
                hasBingo
                  ? "bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border border-yellow-500/50"
                  : "bg-gray-800/80"
              }`}
            >
              {/* Rank */}
              <span
                className={`text-5xl font-bold w-12 text-right ${
                  index === 0 && players.length > 1
                    ? "text-yellow-400"
                    : index === 1
                      ? "text-gray-300"
                      : index === 2
                        ? "text-amber-600"
                        : "text-gray-500"
                }`}
              >
                {index + 1}
              </span>

              {/* Name */}
              <span className="text-4xl font-bold truncate flex-1 min-w-0">
                {player.nickname}
              </span>

              {/* Bingo count */}
              <div className="w-64 flex justify-center items-center gap-4">
                {hasBingo && (
                  <>
                    <span className="px-5 py-1.5 bg-yellow-400 text-black text-lg font-bold rounded-full animate-pulse">
                      BINGO
                    </span>
                    <span className="text-4xl font-bold text-yellow-400">
                      x {player.bingoCount}
                    </span>
                  </>
                )}
              </div>

              {/* Solve count */}
              <span className="text-4xl font-bold text-gray-400 w-28 text-center tabular-nums">
                {player.solveCount}/{totalCells}
              </span>

              {/* Mini grid */}
              <div
                className="grid gap-0.5 shrink-0"
                style={{
                  gridTemplateColumns: `repeat(${config.n}, 1fr)`,
                }}
              >
                {Array.from({ length: totalCells }).map((_, cellIdx) => {
                  const solved = cellIdx in player.solves;
                  return (
                    <div
                      key={cellIdx}
                      className={`w-5 h-5 rounded-sm ${
                        solved ? "bg-green-500" : "bg-gray-600"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {players.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              Waiting for players to join...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────

export default function AdminPage() {
  const [view, setView] = useState<"setup" | "dashboard">("setup");
  const [gameOver, setGameOver] = useState(false);

  // Check if a game is already running on mount
  useEffect(() => {
    fetch("/api/state")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "active") {
          setView("dashboard");
          setGameOver(false);
        } else if (data.status === "ended") {
          setView("dashboard");
          setGameOver(true);
        }
      })
      .catch(() => {});
  }, []);

  if (view === "setup") {
    return (
      <SetupView
        onStarted={() => {
          setGameOver(false);
          setView("dashboard");
        }}
      />
    );
  }

  return (
    <DashboardView
      gameOver={gameOver}
      onReplay={() => {
        setView("setup");
        setGameOver(false);
      }}
    />
  );
}
