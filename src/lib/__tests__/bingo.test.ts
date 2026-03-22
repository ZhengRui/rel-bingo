import { describe, it, expect } from "vitest";
import { checkBingo } from "@/lib/bingo";

describe("checkBingo", () => {
  const n = 3;

  it("returns false for empty board", () => {
    expect(checkBingo(n, new Set())).toBe(false);
  });

  it("detects completed row", () => {
    expect(checkBingo(n, new Set([0, 1, 2]))).toBe(true);
    expect(checkBingo(n, new Set([3, 4, 5]))).toBe(true);
    expect(checkBingo(n, new Set([6, 7, 8]))).toBe(true);
  });

  it("detects completed column", () => {
    expect(checkBingo(n, new Set([0, 3, 6]))).toBe(true);
    expect(checkBingo(n, new Set([2, 5, 8]))).toBe(true);
  });

  it("detects main diagonal", () => {
    expect(checkBingo(n, new Set([0, 4, 8]))).toBe(true);
  });

  it("detects anti-diagonal", () => {
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
