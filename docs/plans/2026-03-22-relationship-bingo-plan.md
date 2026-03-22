# Relationship Bingo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-friendly social bingo game where meetup attendees solve yes/no relationship questions by asking people around them, with a live admin dashboard for the host.

**Architecture:** Single Next.js 15 app (App Router) with in-memory server state. Player-facing pages on `/` and `/play`, admin pages on `/admin` and `/admin/dashboard`. Six API routes handle game lifecycle and player actions. Admin dashboard polls for state every 2-3 seconds.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4

**Design doc:** `docs/plans/2026-03-22-relationship-bingo-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This scaffolds the project with Next.js 15, React 19, TypeScript, Tailwind CSS, App Router, and `src/` directory.

**Step 2: Clean up generated files**

Remove the default boilerplate content from `src/app/page.tsx` — replace with a minimal placeholder:

```tsx
export default function Home() {
  return <div>Relationship Bingo</div>;
}
```

Remove the default `public/` SVG files if any were created.

**Step 3: Verify it runs**

Run: `npm run dev`
Expected: App starts on `http://localhost:3000`, shows "Relationship Bingo"

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind"
```

---

### Task 2: Game Store — In-Memory State

**Files:**
- Create: `src/lib/game-store.ts`
- Create: `src/lib/__tests__/game-store.test.ts`

**Step 1: Install test dependencies**

Run: `npm install -D vitest @vitejs/plugin-react`

Create `vitest.config.ts` at project root:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`

**Step 2: Write failing tests for game store**

```typescript
// src/lib/__tests__/game-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { gameStore } from "@/lib/game-store";

describe("gameStore", () => {
  beforeEach(() => {
    gameStore.reset();
  });

  describe("setup", () => {
    it("stores game config", () => {
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9"],
      });
      const state = gameStore.getState();
      expect(state.config.n).toBe(3);
      expect(state.config.mode).toBe("leaderboard");
      expect(state.config.timeLimit).toBe(10);
      expect(state.config.questions).toHaveLength(9);
      expect(state.status).toBe("setup");
    });

    it("rejects if questions < n^2", () => {
      expect(() =>
        gameStore.setup({
          n: 3,
          mode: "leaderboard",
          timeLimit: 10,
          questions: ["Q1", "Q2"],
        })
      ).toThrow("Need at least 9 questions");
    });

    it("trims questions to n^2", () => {
      const questions = Array.from({ length: 15 }, (_, i) => `Q${i + 1}`);
      gameStore.setup({ n: 3, mode: "leaderboard", timeLimit: 10, questions });
      expect(gameStore.getState().config.questions).toHaveLength(9);
    });
  });

  describe("start", () => {
    it("sets status to active and records startedAt", () => {
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: Array.from({ length: 9 }, (_, i) => `Q${i}`),
      });
      gameStore.start();
      const state = gameStore.getState();
      expect(state.status).toBe("active");
      expect(state.startedAt).toBeDefined();
    });
  });

  describe("join", () => {
    beforeEach(() => {
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: Array.from({ length: 9 }, (_, i) => `Q${i}`),
      });
      gameStore.start();
    });

    it("adds a player with a shuffled board", () => {
      const result = gameStore.join("Alice");
      expect(result.board).toHaveLength(9);
      // board contains indices 0-8 in some order
      expect([...result.board].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("rejects duplicate nicknames", () => {
      gameStore.join("Alice");
      expect(() => gameStore.join("Alice")).toThrow("Nickname already taken");
    });
  });

  describe("solve", () => {
    beforeEach(() => {
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: Array.from({ length: 9 }, (_, i) => `Q${i}`),
      });
      gameStore.start();
      gameStore.join("Alice");
    });

    it("records a solve", () => {
      gameStore.solve("Alice", 0, "Bob");
      const state = gameStore.getState();
      const alice = state.players.get("Alice")!;
      expect(alice.solves.has(0)).toBe(true);
      expect(alice.solves.get(0)!.answeredBy).toBe("Bob");
    });

    it("rejects solving already-solved cell", () => {
      gameStore.solve("Alice", 0, "Bob");
      expect(() => gameStore.solve("Alice", 0, "Charlie")).toThrow(
        "Cell already solved"
      );
    });

    it("rejects unknown player", () => {
      expect(() => gameStore.solve("Unknown", 0, "Bob")).toThrow(
        "Player not found"
      );
    });
  });

  describe("end", () => {
    it("sets status to ended", () => {
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: Array.from({ length: 9 }, (_, i) => `Q${i}`),
      });
      gameStore.start();
      gameStore.end();
      expect(gameStore.getState().status).toBe("ended");
    });
  });

  describe("rankings", () => {
    beforeEach(() => {
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: Array.from({ length: 9 }, (_, i) => `Q${i}`),
      });
      gameStore.start();
      gameStore.join("Alice");
      gameStore.join("Bob");
    });

    it("ranks by solve count descending", () => {
      gameStore.solve("Alice", 0, "X");
      gameStore.solve("Alice", 1, "Y");
      gameStore.solve("Bob", 0, "Z");
      const rankings = gameStore.getRankings();
      expect(rankings[0].nickname).toBe("Alice");
      expect(rankings[1].nickname).toBe("Bob");
    });

    it("breaks ties by last solve time ascending", () => {
      gameStore.solve("Alice", 0, "X");
      gameStore.solve("Bob", 0, "Y");
      // Both have 1 solve; Bob solved later, so Alice ranks higher
      const rankings = gameStore.getRankings();
      expect(rankings[0].nickname).toBe("Alice");
    });
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run`
Expected: All tests FAIL (module not found)

**Step 4: Implement game store**

```typescript
// src/lib/game-store.ts

export type GameMode = "leaderboard" | "bingo";
export type GameStatus = "setup" | "active" | "ended";

export interface SolveInfo {
  answeredBy: string;
  solvedAt: number;
}

export interface Player {
  nickname: string;
  joinedAt: number;
  board: number[];
  solves: Map<number, SolveInfo>;
  hasBingo: boolean;
  bingoAt: number | null;
}

export interface GameConfig {
  n: number;
  mode: GameMode;
  timeLimit: number;
  questions: string[];
}

export interface GameState {
  config: GameConfig;
  status: GameStatus;
  startedAt: number | null;
  players: Map<string, Player>;
}

export interface RankedPlayer {
  nickname: string;
  solveCount: number;
  lastSolveAt: number | null;
  board: number[];
  solves: Map<number, SolveInfo>;
  hasBingo: boolean;
  bingoAt: number | null;
}

function shuffle(arr: number[]): number[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

class GameStore {
  private state: GameState = {
    config: { n: 3, mode: "leaderboard", timeLimit: 10, questions: [] },
    status: "setup",
    startedAt: null,
    players: new Map(),
  };

  reset() {
    this.state = {
      config: { n: 3, mode: "leaderboard", timeLimit: 10, questions: [] },
      status: "setup",
      startedAt: null,
      players: new Map(),
    };
  }

  setup(config: {
    n: number;
    mode: GameMode;
    timeLimit: number;
    questions: string[];
  }) {
    const needed = config.n * config.n;
    if (config.questions.length < needed) {
      throw new Error(`Need at least ${needed} questions`);
    }
    this.state.config = {
      ...config,
      questions: config.questions.slice(0, needed),
    };
    this.state.status = "setup";
    this.state.startedAt = null;
    this.state.players = new Map();
  }

  start() {
    this.state.status = "active";
    this.state.startedAt = Date.now();
  }

  join(nickname: string): { board: number[]; questions: string[] } {
    if (this.state.players.has(nickname)) {
      throw new Error("Nickname already taken");
    }
    const n = this.state.config.n;
    const indices = Array.from({ length: n * n }, (_, i) => i);
    const board = shuffle(indices);
    const player: Player = {
      nickname,
      joinedAt: Date.now(),
      board,
      solves: new Map(),
      hasBingo: false,
      bingoAt: null,
    };
    this.state.players.set(nickname, player);
    return { board, questions: this.state.config.questions };
  }

  solve(nickname: string, cellIndex: number, answeredBy: string) {
    const player = this.state.players.get(nickname);
    if (!player) throw new Error("Player not found");
    if (player.solves.has(cellIndex)) throw new Error("Cell already solved");
    player.solves.set(cellIndex, { answeredBy, solvedAt: Date.now() });
    // Bingo detection is handled separately (see bingo.ts)
    // but we check it here after each solve
    if (!player.hasBingo) {
      const solvedCells = new Set(player.solves.keys());
      if (checkBingo(this.state.config.n, solvedCells)) {
        player.hasBingo = true;
        player.bingoAt = Date.now();
      }
    }
  }

  end() {
    this.state.status = "ended";
  }

  getState(): GameState {
    return this.state;
  }

  getRankings(): RankedPlayer[] {
    const players = Array.from(this.state.players.values());
    return players
      .map((p) => ({
        nickname: p.nickname,
        solveCount: p.solves.size,
        lastSolveAt:
          p.solves.size > 0
            ? Math.max(...Array.from(p.solves.values()).map((s) => s.solvedAt))
            : null,
        board: p.board,
        solves: p.solves,
        hasBingo: p.hasBingo,
        bingoAt: p.bingoAt,
      }))
      .sort((a, b) => {
        if (this.state.config.mode === "bingo") {
          // Bingo achievers first, sorted by bingo time
          if (a.hasBingo && !b.hasBingo) return -1;
          if (!a.hasBingo && b.hasBingo) return 1;
          if (a.hasBingo && b.hasBingo) return a.bingoAt! - b.bingoAt!;
        }
        // Then by solve count desc
        if (b.solveCount !== a.solveCount) return b.solveCount - a.solveCount;
        // Then by last solve time asc (earlier is better)
        if (a.lastSolveAt === null) return 1;
        if (b.lastSolveAt === null) return -1;
        return a.lastSolveAt - b.lastSolveAt;
      });
  }
}

// Inline bingo check — also exported from bingo.ts for testing
function checkBingo(n: number, solvedCells: Set<number>): boolean {
  // Check rows
  for (let i = 0; i < n; i++) {
    let complete = true;
    for (let j = 0; j < n; j++) {
      if (!solvedCells.has(i * n + j)) {
        complete = false;
        break;
      }
    }
    if (complete) return true;
  }
  // Check columns
  for (let j = 0; j < n; j++) {
    let complete = true;
    for (let i = 0; i < n; i++) {
      if (!solvedCells.has(i * n + j)) {
        complete = false;
        break;
      }
    }
    if (complete) return true;
  }
  // Check main diagonal
  let complete = true;
  for (let i = 0; i < n; i++) {
    if (!solvedCells.has(i * n + i)) {
      complete = false;
      break;
    }
  }
  if (complete) return true;
  // Check anti-diagonal
  complete = true;
  for (let i = 0; i < n; i++) {
    if (!solvedCells.has(i * n + (n - 1 - i))) {
      complete = false;
      break;
    }
  }
  if (complete) return true;

  return false;
}

export { checkBingo };
export const gameStore = new GameStore();
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/lib/game-store.ts src/lib/__tests__/game-store.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add in-memory game store with tests"
```

---

### Task 3: Bingo Detection — Dedicated Module & Tests

**Files:**
- Create: `src/lib/bingo.ts`
- Create: `src/lib/__tests__/bingo.test.ts`
- Modify: `src/lib/game-store.ts` (import from bingo.ts instead of inline)

**Step 1: Write failing tests for bingo detection**

```typescript
// src/lib/__tests__/bingo.test.ts
import { describe, it, expect } from "vitest";
import { checkBingo } from "@/lib/bingo";

describe("checkBingo", () => {
  const n = 3;

  it("returns false for empty board", () => {
    expect(checkBingo(n, new Set())).toBe(false);
  });

  it("detects completed row", () => {
    // Row 0: cells 0, 1, 2
    expect(checkBingo(n, new Set([0, 1, 2]))).toBe(true);
    // Row 1: cells 3, 4, 5
    expect(checkBingo(n, new Set([3, 4, 5]))).toBe(true);
    // Row 2: cells 6, 7, 8
    expect(checkBingo(n, new Set([6, 7, 8]))).toBe(true);
  });

  it("detects completed column", () => {
    // Col 0: cells 0, 3, 6
    expect(checkBingo(n, new Set([0, 3, 6]))).toBe(true);
    // Col 2: cells 2, 5, 8
    expect(checkBingo(n, new Set([2, 5, 8]))).toBe(true);
  });

  it("detects main diagonal", () => {
    // Cells 0, 4, 8
    expect(checkBingo(n, new Set([0, 4, 8]))).toBe(true);
  });

  it("detects anti-diagonal", () => {
    // Cells 2, 4, 6
    expect(checkBingo(n, new Set([2, 4, 6]))).toBe(true);
  });

  it("returns false for partial line", () => {
    expect(checkBingo(n, new Set([0, 1]))).toBe(false);
    expect(checkBingo(n, new Set([0, 4]))).toBe(false);
  });

  it("works with n=4", () => {
    expect(checkBingo(4, new Set([0, 1, 2, 3]))).toBe(true);
    expect(checkBingo(4, new Set([0, 5, 10, 15]))).toBe(true);
    expect(checkBingo(4, new Set([3, 6, 9, 12]))).toBe(true);
    expect(checkBingo(4, new Set([0, 1, 2]))).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/bingo.test.ts`
Expected: FAIL (module not found)

**Step 3: Extract bingo detection to its own module**

```typescript
// src/lib/bingo.ts
export function checkBingo(n: number, solvedCells: Set<number>): boolean {
  // Check rows
  for (let i = 0; i < n; i++) {
    let complete = true;
    for (let j = 0; j < n; j++) {
      if (!solvedCells.has(i * n + j)) {
        complete = false;
        break;
      }
    }
    if (complete) return true;
  }
  // Check columns
  for (let j = 0; j < n; j++) {
    let complete = true;
    for (let i = 0; i < n; i++) {
      if (!solvedCells.has(i * n + j)) {
        complete = false;
        break;
      }
    }
    if (complete) return true;
  }
  // Main diagonal
  let complete = true;
  for (let i = 0; i < n; i++) {
    if (!solvedCells.has(i * n + i)) {
      complete = false;
      break;
    }
  }
  if (complete) return true;
  // Anti-diagonal
  complete = true;
  for (let i = 0; i < n; i++) {
    if (!solvedCells.has(i * n + (n - 1 - i))) {
      complete = false;
      break;
    }
  }
  return complete;
}
```

**Step 4: Update game-store.ts to import from bingo.ts**

Replace the inline `checkBingo` function in `game-store.ts` with:

```typescript
import { checkBingo } from "./bingo";
```

Remove the inline `checkBingo` function and the `export { checkBingo }` line.

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS (both game-store and bingo tests)

**Step 6: Commit**

```bash
git add src/lib/bingo.ts src/lib/__tests__/bingo.test.ts src/lib/game-store.ts
git commit -m "refactor: extract bingo detection to dedicated module with tests"
```

---

### Task 4: API Routes

**Files:**
- Create: `src/app/api/setup/route.ts`
- Create: `src/app/api/start/route.ts`
- Create: `src/app/api/join/route.ts`
- Create: `src/app/api/solve/route.ts`
- Create: `src/app/api/end/route.ts`
- Create: `src/app/api/state/route.ts`

**Step 1: Create all six API route files**

```typescript
// src/app/api/setup/route.ts
import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { n, mode, timeLimit, questions } = body;
    gameStore.setup({ n, mode, timeLimit, questions });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

```typescript
// src/app/api/start/route.ts
import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST() {
  try {
    gameStore.start();
    return NextResponse.json({
      success: true,
      startedAt: gameStore.getState().startedAt,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

```typescript
// src/app/api/join/route.ts
import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST(request: Request) {
  try {
    const { nickname } = await request.json();
    const result = gameStore.join(nickname);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

```typescript
// src/app/api/solve/route.ts
import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST(request: Request) {
  try {
    const { nickname, cellIndex, answeredBy } = await request.json();
    gameStore.solve(nickname, cellIndex, answeredBy);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

```typescript
// src/app/api/end/route.ts
import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST() {
  try {
    gameStore.end();
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

```typescript
// src/app/api/state/route.ts
import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function GET() {
  const state = gameStore.getState();
  const rankings = gameStore.getRankings();

  // Serialize Map structures for JSON response
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
```

**Step 2: Manually test with curl**

Start dev server: `npm run dev`

```bash
# Setup
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{"n":3,"mode":"leaderboard","timeLimit":10,"questions":["Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8","Q9"]}'

# Start
curl -X POST http://localhost:3000/api/start

# Join
curl -X POST http://localhost:3000/api/join \
  -H "Content-Type: application/json" \
  -d '{"nickname":"Alice"}'

# Solve
curl -X POST http://localhost:3000/api/solve \
  -H "Content-Type: application/json" \
  -d '{"nickname":"Alice","cellIndex":0,"answeredBy":"Bob"}'

# State
curl http://localhost:3000/api/state

# End
curl -X POST http://localhost:3000/api/end
```

Expected: All return valid JSON with expected structures.

**Step 3: Commit**

```bash
git add src/app/api/
git commit -m "feat: add all API routes for game lifecycle"
```

---

### Task 5: Player Join Screen

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/play/page.tsx` (placeholder for now)

**Step 1: Build the join screen**

```tsx
// src/app/page.tsx
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
      // Store player data in sessionStorage for the play page
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
```

**Step 2: Create placeholder play page**

```tsx
// src/app/play/page.tsx
export default function PlayPage() {
  return <div>Play page — coming next</div>;
}
```

**Step 3: Verify manually**

Run `npm run dev`, open `http://localhost:3000`. Should see the join form. Submitting (after setting up a game via curl) should redirect to `/play`.

**Step 4: Commit**

```bash
git add src/app/page.tsx src/app/play/page.tsx
git commit -m "feat: add player join screen"
```

---

### Task 6: Player Board Screen

**Files:**
- Modify: `src/app/play/page.tsx`

**Step 1: Build the board with question popup**

```tsx
// src/app/play/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PlayerData {
  nickname: string;
  board: number[];
  questions: string[];
}

interface SolveData {
  [cellIndex: number]: string; // cellIndex -> answeredBy
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

      {/* Grid */}
      <div
        className="grid gap-2 w-full max-w-sm"
        style={{
          gridTemplateColumns: `repeat(${n}, 1fr)`,
        }}
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

      {/* Full-screen popup */}
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
```

**Step 2: Verify manually**

Setup a game via curl, join via the UI, check the board renders, tap a cell, solve it, verify green checkmark appears.

**Step 3: Commit**

```bash
git add src/app/play/page.tsx
git commit -m "feat: add player board with question popup"
```

---

### Task 7: Admin Setup Screen

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/dashboard/page.tsx` (placeholder)

**Step 1: Build the admin setup form**

```tsx
// src/app/admin/page.tsx
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
      if (!Array.isArray(questions) || !questions.every((q) => typeof q === "string")) {
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
      // Setup
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

      // Start
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

        {/* Grid size */}
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

        {/* Game mode */}
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

        {/* Time limit */}
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

        {/* Questions */}
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
```

**Step 2: Create placeholder dashboard**

```tsx
// src/app/admin/dashboard/page.tsx
export default function DashboardPage() {
  return <div>Dashboard — coming next</div>;
}
```

**Step 3: Verify manually**

Navigate to `http://localhost:3000/admin`, fill in settings, upload/paste questions JSON, click "Start Game", verify redirect to dashboard.

**Step 4: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/dashboard/page.tsx
git commit -m "feat: add admin setup screen"
```

---

### Task 8: Admin Dashboard

**Files:**
- Modify: `src/app/admin/dashboard/page.tsx`

**Step 1: Build the dashboard with polling**

```tsx
// src/app/admin/dashboard/page.tsx
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

  // Compute remaining time
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
            {/* Rank */}
            <span className="text-2xl font-bold text-gray-400 w-8 text-right">
              {index + 1}
            </span>

            {/* Player info */}
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

            {/* Mini grid */}
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
```

**Step 2: Verify manually**

1. Go to `/admin`, set up and start a game
2. Open `/` in another tab, join as a player
3. Dashboard at `/admin/dashboard` should show the player
4. Solve some cells as the player, dashboard updates within 2-3 seconds
5. Verify ranking order, mini-grid, and bingo badge (if applicable)

**Step 3: Commit**

```bash
git add src/app/admin/dashboard/page.tsx
git commit -m "feat: add admin dashboard with polling and leaderboard"
```

---

### Task 9: Layout & Global Styles

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Clean up layout**

Ensure `src/app/layout.tsx` has a clean, minimal layout:

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relationship Bingo",
  description: "A social icebreaker bingo game for meetups",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Step 2: Ensure globals.css has Tailwind directives**

```css
/* src/app/globals.css */
@import "tailwindcss";
```

Remove any default Next.js boilerplate styles.

**Step 3: Verify the full flow end-to-end**

1. `npm run dev`
2. Go to `/admin` — setup game with 3x3, leaderboard mode, 10 minutes, paste 9 questions
3. Click "Start Game" — redirects to dashboard
4. Open phone/another tab at `/` — enter nickname — redirects to board
5. Tap cells, solve questions — see green checkmarks
6. Dashboard updates with player progress
7. Click "End Game" on dashboard

**Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "chore: clean up layout and global styles"
```

---

### Task 10: Final Polish & Edge Cases

**Files:**
- Modify: `src/lib/game-store.ts` (add guards)
- Modify: `src/app/page.tsx` (handle game-not-active state)

**Step 1: Add game status guards to API operations**

In `game-store.ts`, add validation:
- `join()`: throw if `status !== "active"`
- `solve()`: throw if `status !== "active"`

```typescript
// Add at start of join():
if (this.state.status !== "active") throw new Error("Game is not active");

// Add at start of solve():
if (this.state.status !== "active") throw new Error("Game is not active");
```

**Step 2: Handle "game not started" on join page**

Update the join page error handling — if the API returns "Game is not active", show a friendly message like "Game hasn't started yet. Please wait for the host."

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests still pass (update game-store tests to start the game before join/solve where needed — already done in existing tests).

**Step 4: Commit**

```bash
git add src/lib/game-store.ts src/app/page.tsx
git commit -m "feat: add game status guards and edge case handling"
```
