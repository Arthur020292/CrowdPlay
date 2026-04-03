import { formatRemainingLabel } from "../lib/time";

interface HostLobbyStageProps {
  code: string;
  gameLabel: string;
  phase?: "lobby" | "countdown";
  remainingMs?: number;
  playerCount?: number;
  onStart?: () => void;
  startDisabled?: boolean;
}

export function HostLobbyStage({
  code,
  gameLabel,
  phase = "lobby",
  remainingMs = 0,
  playerCount = 0,
  onStart,
  startDisabled
}: HostLobbyStageProps) {
  const isCountdown = phase === "countdown";

  return (
    <section>
      <div className="cp-card-glass p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1.2fr)_minmax(0,1fr)] lg:items-center">
          <div className="lg:self-start">
            <span className="cp-eyebrow cp-eyebrow-light">Game</span>
            <div className="mt-3 text-3xl font-black text-slate-950">{gameLabel}</div>
            <p className="mt-2 text-sm text-slate-500">{playerCount} player{playerCount === 1 ? "" : "s"} ready</p>
          </div>

          <div className="lg:col-start-2 lg:justify-self-center lg:w-full">
            <div className="cp-code-showcase w-full">{code}</div>
          </div>

          <div className="lg:col-start-3 lg:justify-self-end">
            {isCountdown ? (
              <div className="rounded-[1.8rem] border border-sky-200 bg-white/[0.84] px-6 py-5 text-center shadow-[0_16px_30px_rgba(56,189,248,0.12)]">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-sky-700/75">Starting in</div>
                <div className="mt-2 text-5xl font-black tracking-tight text-slate-950">{formatRemainingLabel("countdown", remainingMs)}</div>
              </div>
            ) : (
              <button onClick={onStart} disabled={startDisabled} className="cp-button-primary min-w-[13rem] text-base">
                Start game
              </button>
            )}
          </div>
        </div>

        {isCountdown ? (
          <div className="mt-6 rounded-[1.6rem] border border-sky-100 bg-sky-50/80 px-5 py-4 text-center text-sm font-medium text-sky-900">
            Locking in the lobby and getting everyone ready. The race begins as soon as the countdown ends.
          </div>
        ) : null}
      </div>
    </section>
  );
}
