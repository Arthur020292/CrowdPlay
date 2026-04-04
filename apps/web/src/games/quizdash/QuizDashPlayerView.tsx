import type { QuizDashPlayerStateEvent } from "@crowdplay/protocol";

import { QuestionChestStage } from "../shared/QuestionChestStage";

interface QuizDashPlayerViewProps {
  phase: string;
  playerState: QuizDashPlayerStateEvent;
  actionPending: boolean;
  onAnswer: (questionId: string, answerId: string) => void;
  onChestPick: (chestIndex: 0 | 1 | 2) => void;
  onTargetPick: (targetPlayerId: string) => void;
}

export function QuizDashPlayerView({
  phase,
  playerState,
  actionPending,
  onAnswer,
  onChestPick,
  onTargetPick
}: QuizDashPlayerViewProps) {
  return (
    <QuestionChestStage
      gameLabel="QuizDash"
      phase={phase}
      currentQuestion={playerState.currentQuestion}
      recentOutcomeTitle={playerState.recentOutcome?.title}
      recentOutcomeDetail={playerState.recentOutcome?.detail}
      pendingChestPick={playerState.pendingChestPick}
      pendingTargetPick={playerState.pendingTargetPick}
      availableTargets={playerState.availableTargets}
      actionPending={actionPending}
      onAnswer={onAnswer}
      onChestPick={onChestPick}
      onTargetPick={onTargetPick}
    />
  );
}
