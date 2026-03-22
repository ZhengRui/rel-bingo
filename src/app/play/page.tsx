"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PlayerData {
  nickname: string;
  board: number[];
  questions: string[];
}

interface SolveData {
  [cellIndex: number]: string;
}

export default function PlayPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [solves, setSolves] = useState<SolveData>({});
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [inputName, setInputName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("player");
    if (!stored) {
      router.push("/");
      return;
    }
    setPlayer(JSON.parse(stored));
  }, [router]);

  if (!player) return null;

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
          nickname: player!.nickname,
          cellIndex: activeCell,
          answeredBy: inputName.trim(),
        }),
      });
      if (res.ok) {
        setSolves((prev) => ({ ...prev, [activeCell!]: inputName.trim() }));
        setActiveCell(null);
        setInputName("");
      }
    } catch {
      // silently fail — user can retry
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 p-4 flex flex-col items-center">
      <h2 className="text-lg font-semibold text-purple-800 mb-4">
        {player.nickname}&apos;s Board
      </h2>

      <div
        className="grid gap-2 w-full max-w-sm"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {player.board.map((_, cellIndex) => {
          const solved = cellIndex in solves;
          return (
            <button
              key={cellIndex}
              onClick={() => {
                setActiveCell(cellIndex);
                setInputName("");
              }}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-colors ${
                solved
                  ? "bg-green-100 border-2 border-green-400 text-green-800"
                  : "bg-white border-2 border-purple-200 text-purple-600 hover:border-purple-400"
              }`}
            >
              {solved ? (
                <>
                  <span className="text-green-600 text-xl">&#10003;</span>
                  <span className="text-xs mt-1 truncate w-full px-1 text-center">
                    {solves[cellIndex]}
                  </span>
                </>
              ) : (
                <span>Q{cellIndex + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeCell !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveCell(null);
              setInputName("");
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <p className="text-lg font-semibold text-purple-800 text-center">
              {activeQuestion}
            </p>

            {isSolved ? (
              <div className="text-center">
                <span className="text-green-600 text-4xl">&#10003;</span>
                <p className="text-green-700 mt-2">
                  Answered by: {solves[activeCell]}
                </p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Who said yes?"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl text-lg focus:outline-none focus:border-purple-500"
                  autoFocus
                  maxLength={20}
                />
                <button
                  onClick={handleSolve}
                  disabled={submitting || !inputName.trim()}
                  className="w-full py-3 bg-green-600 text-white rounded-xl text-lg font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors"
                >
                  {submitting ? "Submitting..." : "Found it!"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
