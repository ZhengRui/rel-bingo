import { countBingoLines } from "./bingo";

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
  bingoCount: number;
  firstBingoAt: number | null;
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
  bingoCount: number;
  firstBingoAt: number | null;
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
    if (this.state.status === "setup") {
      throw new Error("Game hasn't started yet. Please wait for the host.");
    }
    if (this.state.status === "ended") {
      throw new Error("Game is already over.");
    }
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
      bingoCount: 0,
      firstBingoAt: null,
    };
    this.state.players.set(nickname, player);
    return { board, questions: this.state.config.questions };
  }

  solve(nickname: string, cellIndex: number, answeredBy: string) {
    if (this.state.status === "setup") {
      throw new Error("Game hasn't started yet.");
    }
    if (this.state.status === "ended") {
      throw new Error("Game is already over.");
    }
    const player = this.state.players.get(nickname);
    if (!player) throw new Error("Player not found");
    if (player.solves.has(cellIndex)) throw new Error("Cell already solved");
    player.solves.set(cellIndex, { answeredBy, solvedAt: Date.now() });
    const solvedCells = new Set(player.solves.keys());
    const newCount = countBingoLines(this.state.config.n, solvedCells);
    if (newCount > 0 && player.firstBingoAt === null) {
      player.firstBingoAt = Date.now();
    }
    player.bingoCount = newCount;
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
        bingoCount: p.bingoCount,
        firstBingoAt: p.firstBingoAt,
      }))
      .sort((a, b) => {
        // Sort by bingo count desc
        if (b.bingoCount !== a.bingoCount) return b.bingoCount - a.bingoCount;
        // Then by solve count desc
        if (b.solveCount !== a.solveCount) return b.solveCount - a.solveCount;
        // Then by last solve time asc (earlier is better)
        if (a.lastSolveAt === null) return 1;
        if (b.lastSolveAt === null) return -1;
        return a.lastSolveAt - b.lastSolveAt;
      });
  }
}

export const gameStore = new GameStore();
