import { gameStore } from "./game-store";

export function checkAndExpireGame() {
  const state = gameStore.getState();
  if (state.status === "active" && state.startedAt !== null) {
    const elapsed = Date.now() - state.startedAt;
    if (elapsed >= state.config.timeLimit * 60 * 1000) {
      gameStore.end();
    }
  }
}
