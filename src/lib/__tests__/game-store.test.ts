import { describe, it, expect, beforeEach } from "vitest";
import { gameStore } from "@/lib/game-store";

const makeQuestions = (count: number) =>
  Array.from({ length: count }, (_, i) => `Q${i}`);

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
        questions: makeQuestions(9),
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
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: makeQuestions(15),
      });
      expect(gameStore.getState().config.questions).toHaveLength(9);
    });
  });

  describe("start", () => {
    it("sets status to active and records startedAt", () => {
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: makeQuestions(9),
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
        questions: makeQuestions(9),
      });
      gameStore.start();
    });

    it("adds a player with a shuffled board", () => {
      const result = gameStore.join("Alice");
      expect(result.board).toHaveLength(9);
      expect([...result.board].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("rejects duplicate nicknames", () => {
      gameStore.join("Alice");
      expect(() => gameStore.join("Alice")).toThrow("Nickname already taken");
    });

    it("rejects join when game is not active", () => {
      gameStore.end();
      expect(() => gameStore.join("Bob")).toThrow("Game is not active");
    });
  });

  describe("solve", () => {
    beforeEach(() => {
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: makeQuestions(9),
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

    it("rejects solve when game is not active", () => {
      gameStore.end();
      expect(() => gameStore.solve("Alice", 0, "Bob")).toThrow(
        "Game is not active"
      );
    });

    it("detects bingo on solve", () => {
      // Solve an entire row — cells 0, 1, 2
      gameStore.solve("Alice", 0, "X");
      gameStore.solve("Alice", 1, "Y");
      gameStore.solve("Alice", 2, "Z");
      const alice = gameStore.getState().players.get("Alice")!;
      expect(alice.hasBingo).toBe(true);
      expect(alice.bingoAt).toBeDefined();
    });
  });

  describe("end", () => {
    it("sets status to ended", () => {
      gameStore.setup({
        n: 3,
        mode: "leaderboard",
        timeLimit: 10,
        questions: makeQuestions(9),
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
        questions: makeQuestions(9),
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
      const rankings = gameStore.getRankings();
      expect(rankings[0].nickname).toBe("Alice");
    });
  });
});
