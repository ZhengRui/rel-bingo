"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────

interface PlayerData {
  gameId: string;
  nickname: string;
  board: number[];
  questions: string[];
}

interface SolveData {
  [cellIndex: number]: string;
}

const STORAGE_KEY = "relationship-bingo-player";
const SOLVES_KEY = "relationship-bingo-solves";
const GAMEOVER_KEY = "relationship-bingo-gameover";

function savePlayer(player: PlayerData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

function loadPlayer(): PlayerData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveSolves(solves: SolveData) {
  localStorage.setItem(SOLVES_KEY, JSON.stringify(solves));
}

function loadSolves(): SolveData {
  try {
    const stored = localStorage.getItem(SOLVES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveGameOver(value: boolean) {
  localStorage.setItem(GAMEOVER_KEY, JSON.stringify(value));
}

function loadGameOver(): boolean {
  try {
    const stored = localStorage.getItem(GAMEOVER_KEY);
    return stored ? JSON.parse(stored) : false;
  } catch {
    return false;
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SOLVES_KEY);
  localStorage.removeItem(GAMEOVER_KEY);
}

// ── Join Screen ────────────────────────────────────────

function JoinView({ onJoined }: { onJoined: (player: PlayerData) => void }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join");
        setLoading(false);
        return;
      }
      const player: PlayerData = {
        gameId: data.gameId,
        nickname: trimmed,
        board: data.board,
        questions: data.questions,
      };
      savePlayer(player);
      saveSolves({});
      saveGameOver(false);
      onJoined(player);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-4">
      <form
        onSubmit={handleJoin}
        className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">
            Relationship Bingo
          </h1>
          <p className="text-purple-200 text-sm mt-2">
            Enter your nickname to join
          </p>
        </div>
        <input
          type="text"
          placeholder="Your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-lg text-white placeholder:text-purple-300/50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          autoFocus
          maxLength={20}
        />
        {error && (
          <p className="text-red-300 text-sm text-center bg-red-900/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !nickname.trim()}
          className="w-full py-3 bg-purple-500 text-white rounded-xl text-lg font-semibold disabled:opacity-40 hover:bg-purple-400 transition-colors"
        >
          {loading ? "Joining..." : "Enter Game"}
        </button>
      </form>
    </div>
  );
}

// ── Board Screen ───────────────────────────────────────

function BoardView({
  player,
  onRejoin,
}: {
  player: PlayerData;
  onRejoin: () => void;
}) {
  const [solves, setSolves] = useState<SolveData>(loadSolves);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [inputName, setInputName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gameOver, setGameOverState] = useState(loadGameOver);
  const [rejoinConfirm, setRejoinConfirm] = useState(false);

  function setGameOver(value: boolean) {
    setGameOverState(value);
    saveGameOver(value);
  }

  // Check game state on mount — if different game or not active, mark game over
  useEffect(() => {
    fetch("/api/state")
      .then((res) => res.json())
      .then((data) => {
        if (data.gameId !== player.gameId || data.status !== "active") {
          setGameOver(true);
        }
      })
      .catch(() => {});
  }, [player.gameId]);

  const n = Math.sqrt(player.board.length);
  const activeQuestionIndex =
    activeCell !== null ? player.board[activeCell] : null;
  const activeQuestion =
    activeQuestionIndex !== null ? player.questions[activeQuestionIndex] : null;
  const isSolved = activeCell !== null && activeCell in solves;

  async function handleSolve() {
    if (activeCell === null || !inputName.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: player.nickname,
          cellIndex: activeCell,
          answeredBy: inputName.trim(),
        }),
      });
      if (res.ok) {
        const newSolves = { ...solves, [activeCell]: inputName.trim() };
        setSolves(newSolves);
        saveSolves(newSolves);
        setActiveCell(null);
        setInputName("");
      } else {
        // Any error (game over, player not found, etc.) means game has changed
        setGameOver(true);
      }
    } catch {
      // network error — solve saved locally, can retry
    }
    setSubmitting(false);
  }

  async function handleCellTap(cellIndex: number) {
    if (!gameOver) {
      try {
        const res = await fetch("/api/state");
        if (res.ok) {
          const data = await res.json();
          if (data.gameId !== player.gameId || data.status !== "active") {
            setGameOver(true);
          }
        }
      } catch { /* ignore, let them view */ }
    }
    setActiveCell(cellIndex);
    setInputName("");
  }

  const solveCount = Object.keys(solves).length;
  const totalCells = player.board.length;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">{player.nickname}</h2>
        <p className="text-purple-300 text-sm">
          {solveCount} / {totalCells} found
        </p>
      </div>

      {/* Grid */}
      <div
        className="grid gap-2 w-full max-w-xs"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {player.board.map((_, cellIndex) => {
          const solved = cellIndex in solves;
          return (
            <button
              key={cellIndex}
              onClick={() => handleCellTap(cellIndex)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all active:scale-95 ${
                solved
                  ? "bg-green-500/20 border-2 border-green-400/60 text-green-300"
                  : "bg-white/10 border-2 border-white/15 text-purple-200 hover:bg-white/15 hover:border-white/30"
              }`}
            >
              {solved ? (
                <>
                  <span className="text-green-400 text-lg">&#10003;</span>
                  <span className="text-xs mt-0.5 truncate w-full px-1 text-center text-green-300/80">
                    {solves[cellIndex]}
                  </span>
                </>
              ) : (
                <span className="text-base">?</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Rejoin button — shown after game over */}
      {gameOver && (
        <button
          onClick={() => setRejoinConfirm(true)}
          className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors text-sm"
        >
          Join New Game
        </button>
      )}

      {/* Question Popup */}
      {activeCell !== null && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveCell(null);
              setInputName("");
            }
          }}
        >
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 w-full max-w-sm space-y-5">
            {gameOver && (
              <div className="text-center py-1">
                <span className="px-4 py-1 bg-red-600 text-white text-sm font-bold rounded-full">
                  Game Over
                </span>
              </div>
            )}

            <p className="text-lg font-semibold text-white text-center leading-relaxed">
              {activeQuestion}
            </p>

            {isSolved ? (
              <div className="text-center py-2">
                <span className="text-green-400 text-4xl">&#10003;</span>
                <p className="text-green-300 mt-2">
                  {solves[activeCell]}
                </p>
              </div>
            ) : gameOver ? (
              <div className="text-center py-2">
                <p className="text-gray-400">Not solved</p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Who said yes?"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400"
                  autoFocus
                  maxLength={20}
                />
                <button
                  onClick={handleSolve}
                  disabled={submitting || !inputName.trim()}
                  className="w-full py-3 bg-green-600 text-white rounded-xl text-lg font-semibold disabled:opacity-40 hover:bg-green-500 transition-colors"
                >
                  {submitting ? "Submitting..." : "Found it!"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rejoin Confirmation */}
      {rejoinConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setRejoinConfirm(false)}
        >
          <div
            className="bg-gray-900 border border-white/20 rounded-2xl p-8 w-full max-w-sm text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white">Join New Game?</h3>
            <p className="text-gray-400">
              Your current game data will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRejoinConfirm(false)}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearStorage();
                  onRejoin();
                }}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────

export default function HomePage() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [checked, setChecked] = useState(false);

  // On mount, restore from localStorage — never clear it here
  useEffect(() => {
    const stored = loadPlayer();
    if (stored) {
      setPlayer(stored);
    }
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!player) {
    return <JoinView onJoined={(p) => setPlayer(p)} />;
  }

  return (
    <BoardView
      player={player}
      onRejoin={() => {
        clearStorage();
        setPlayer(null);
      }}
    />
  );
}
