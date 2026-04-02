import type { GamePhase } from "@crowdplay/protocol";

export function formatRemainingLabel(phase: GamePhase | string, remainingMs: number): string {
  const safeRemainingMs = Math.max(0, remainingMs);

  if (phase === "countdown") {
    return `${Math.ceil(safeRemainingMs / 1000)}s`;
  }

  if (phase === "live") {
    if (safeRemainingMs < 10_000) {
      return `${(safeRemainingMs / 1000).toFixed(1)}s`;
    }

    return `${Math.floor(safeRemainingMs / 1000)}s`;
  }

  return `${Math.round(safeRemainingMs / 1000)}s`;
}
