export function countBingoLines(n: number, solvedCells: Set<number>): number {
  let count = 0;
  // Check rows
  for (let i = 0; i < n; i++) {
    let complete = true;
    for (let j = 0; j < n; j++) {
      if (!solvedCells.has(i * n + j)) {
        complete = false;
        break;
      }
    }
    if (complete) count++;
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
    if (complete) count++;
  }
  // Main diagonal
  let complete = true;
  for (let i = 0; i < n; i++) {
    if (!solvedCells.has(i * n + i)) {
      complete = false;
      break;
    }
  }
  if (complete) count++;
  // Anti-diagonal
  complete = true;
  for (let i = 0; i < n; i++) {
    if (!solvedCells.has(i * n + (n - 1 - i))) {
      complete = false;
      break;
    }
  }
  if (complete) count++;
  return count;
}

export function checkBingo(n: number, solvedCells: Set<number>): boolean {
  return countBingoLines(n, solvedCells) > 0;
}
