import type { CreateSessionRequest, GameType } from "@crowdplay/protocol";

export type LiveGameType = Extract<GameType, "goldrush" | "quizdash">;

export interface LiveGameDefinition {
  id: LiveGameType;
  title: string;
  cta: string;
  description: string;
}

export const LIVE_GAME_DEFINITIONS: LiveGameDefinition[] = [
  {
    id: "goldrush",
    title: "Gold Rush",
    cta: "Play Gold Rush",
    description: "Answer questions, open hidden chests, and unleash chaos on the top vaults."
  },
  {
    id: "quizdash",
    title: "QuizDash",
    cta: "Play QuizDash",
    description: "Answer fast, open hidden chests, and build distance in a race to the finish."
  }
];

export function getGameLabel(gameType: GameType | null): string {
  return LIVE_GAME_DEFINITIONS.find((game) => game.id === gameType)?.title ?? "CrowdPlay";
}

export function buildCreateSessionRequest(gameType: LiveGameType, durationMs = 120_000): CreateSessionRequest {
  switch (gameType) {
    case "goldrush":
      return {
        gameType: "goldrush",
        playerLimit: 50,
        matchDurationMs: durationMs,
        countdownMs: 3_000,
        lockoutMs: 4_000
      };
    case "quizdash":
      return {
        gameType: "quizdash",
        playerLimit: 50,
        raceDurationMs: durationMs,
        countdownMs: 3_000
      };
  }
}
