"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      sessionStorage.setItem(
        "player",
        JSON.stringify({
          nickname: trimmed,
          board: data.board,
          questions: data.questions,
        })
      );
      router.push("/play");
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50 p-4">
      <form
        onSubmit={handleJoin}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-6"
      >
        <h1 className="text-2xl font-bold text-center text-purple-800">
          Relationship Bingo
        </h1>
        <input
          type="text"
          placeholder="Enter your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl text-lg focus:outline-none focus:border-purple-500"
          autoFocus
          maxLength={20}
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || !nickname.trim()}
          className="w-full py-3 bg-purple-600 text-white rounded-xl text-lg font-semibold disabled:opacity-50 hover:bg-purple-700 transition-colors"
        >
          {loading ? "Joining..." : "Enter Game"}
        </button>
      </form>
    </div>
  );
}
