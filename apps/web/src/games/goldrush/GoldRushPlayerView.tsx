import type { GoldRushPlayerStateEvent } from "@crowdplay/protocol";

import { QuestionChestStage } from "../shared/QuestionChestStage";

interface GoldRushPlayerViewProps {
  phase: string;
  playerState: GoldRushPlayerStateEvent;
  actionPending: boolean;
  lockoutRemainingMs: number;
  onAnswer: (questionId: string, answerId: string) => void;
  onChestPick: (chestIndex: 0 | 1 | 2) => void;
  onTargetPick: (targetPlayerId: string) => void;
}

export function GoldRushPlayerView({
  phase,
  playerState,
  actionPending,
  lockoutRemainingMs,
  onAnswer,
  onChestPick,
  onTargetPick
}: GoldRushPlayerViewProps) {
  return (
    <QuestionChestStage
      gameLabel="Gold Rush"
      phase={phase}
      currentQuestion={playerState.currentQuestion}
      recentOutcomeTitle={playerState.recentOutcome?.title}
      recentOutcomeDetail={playerState.recentOutcome?.detail}
      pendingChestPick={playerState.pendingChestPick}
      pendingTargetPick={playerState.pendingTargetPick}
      availableTargets={playerState.availableTargets}
      actionPending={actionPending}
      lockoutRemainingMs={lockoutRemainingMs}
      onAnswer={onAnswer}
      onChestPick={onChestPick}
      onTargetPick={onTargetPick}
    />
  );
}
