"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSetupPage() {
  const router = useRouter();
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

      router.push("/admin/dashboard");
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
    <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
      <form
        onSubmit={handleStart}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg space-y-6"
      >
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Game Setup
        </h1>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grid Size (N)
          </label>
          <input
            type="number"
            min={2}
            max={6}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">
            {n}x{n} = {n * n} questions needed
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Game Mode
          </label>
          <select
            value={mode}
            onChange={(e) =>
              setMode(e.target.value as "leaderboard" | "bingo")
            }
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="leaderboard">Leaderboard (most cells solved)</option>
            <option value="bingo">Bingo (row/column/diagonal)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time Limit (minutes)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Questions JSON
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 mb-2"
          />
          <textarea
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            placeholder='["Question 1?", "Question 2?", ...]'
            rows={6}
            className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {loading ? "Starting..." : "Start Game"}
        </button>
      </form>
    </div>
  );
}
