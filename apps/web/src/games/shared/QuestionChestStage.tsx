import type { PublicQuestion, TargetCandidate } from "@crowdplay/protocol";

import { AvatarBadge } from "../../components/AvatarBadge";

function formatLockoutLabel(remainingMs: number): string {
  return `${Math.max(1, Math.ceil(remainingMs / 1000))}s`;
}

function WaitingPanel({
  eyebrow,
  title,
  detail
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
      <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}

interface QuestionChestStageProps {
  gameLabel: string;
  phase: string;
  currentQuestion: PublicQuestion | null;
  recentOutcomeTitle?: string;
  recentOutcomeDetail?: string;
  pendingChestPick: boolean;
  pendingTargetPick: boolean;
  availableTargets: TargetCandidate[];
  actionPending: boolean;
  lockoutRemainingMs?: number;
  onAnswer: (questionId: string, answerId: string) => void;
  onChestPick: (chestIndex: 0 | 1 | 2) => void;
  onTargetPick: (targetPlayerId: string) => void;
}

export function QuestionChestStage({
  gameLabel,
  phase,
  currentQuestion,
  recentOutcomeTitle,
  recentOutcomeDetail,
  pendingChestPick,
  pendingTargetPick,
  availableTargets,
  actionPending,
  lockoutRemainingMs = 0,
  onAnswer,
  onChestPick,
  onTargetPick
}: QuestionChestStageProps) {
  const isGoldRush = gameLabel === "Gold Rush";

  if (phase === "lobby" || phase === "countdown") {
    return (
      <WaitingPanel
        eyebrow={phase === "countdown" ? "Get ready" : "Waiting room"}
        title={phase === "countdown" ? "Your first question unlocks when the countdown ends." : "The host is waiting to start the match."}
        detail="Stay on this screen. The game will push your next prompt automatically."
      />
    );
  }

  if (phase === "finished") {
    return (
      <WaitingPanel
        eyebrow="Match complete"
        title={isGoldRush ? "The vault race is over." : "The race is finished."}
        detail="The host screen has the live podium and final standings."
      />
    );
  }

  if (pendingTargetPick) {
    return (
      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-200">Pick a target</div>
        <h2 className="mt-3 text-2xl font-black text-white">{isGoldRush ? "Choose one of the top vaults." : "Choose one of the top racers."}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{recentOutcomeDetail ?? "Select who takes the hit."}</p>
        <div className="mt-6 grid gap-3">
          {availableTargets.map((target) => (
            <button
              key={target.playerId}
              type="button"
              onClick={() => onTargetPick(target.playerId)}
              disabled={actionPending}
              className="flex items-center justify-between rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-5 py-4 text-left transition hover:border-amber-300/40 hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <AvatarBadge avatarId={target.avatarId} size={34} />
                <span>
                  <span className="block text-base font-semibold text-white">{target.name}</span>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Choose target</span>
                </span>
              </span>
              <span className="text-sm font-semibold text-amber-200">Pick</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (pendingChestPick) {
    return (
      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-sky-200">Pick a chest</div>
        <h2 className="mt-3 text-2xl font-black text-white">Choose 1 of 3 hidden chests.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {isGoldRush
            ? "Every chest can help you cash in or throw the leaderboard into chaos."
            : "Every chest can boost your run or scramble the race order."}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((chestIndex) => (
            <button
              key={chestIndex}
              type="button"
              onClick={() => onChestPick(chestIndex as 0 | 1 | 2)}
              disabled={actionPending}
              className="rounded-[1.8rem] border border-amber-200/60 bg-[linear-gradient(180deg,rgba(254,243,199,0.96),rgba(253,230,138,0.82))] px-5 py-7 text-center text-lg font-black text-amber-950 shadow-[0_18px_30px_rgba(245,158,11,0.18)] transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Chest {chestIndex + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (lockoutRemainingMs > 0) {
    return (
      <WaitingPanel
        eyebrow="Locked out"
        title={`Next question unlocks in ${formatLockoutLabel(lockoutRemainingMs)}.`}
        detail="Wrong answers freeze your controller for a few seconds."
      />
    );
  }

  if (currentQuestion) {
    return (
      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">
          {currentQuestion.format === "boolean" ? "True or false" : "Multiple choice"}
        </div>
        <h2 className="mt-3 text-2xl font-black text-white">{currentQuestion.prompt}</h2>
        <div className="mt-6 grid gap-3">
          {currentQuestion.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onAnswer(currentQuestion.id, option.id)}
              disabled={actionPending}
              className="rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-5 py-4 text-left text-base font-semibold text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <WaitingPanel
      eyebrow="Stand by"
      title="Waiting for your next question."
      detail="Your controller is synced. The next prompt will appear automatically."
    />
  );
}
