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
