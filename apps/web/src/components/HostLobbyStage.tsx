interface HostLobbyStageProps {
  code: string;
  gameLabel: string;
  playerCount: number;
  playerLimit?: number;
  minimumPlayers: number;
  canStart: boolean;
  joiningLabel: string;
  onStart?: () => void;
  error?: string | null;
  statusText?: string;
  startDisabled?: boolean;
}

export function HostLobbyStage({
  code,
  gameLabel,
  playerCount,
  playerLimit,
  minimumPlayers,
  canStart,
  joiningLabel,
  onStart,
  error,
  statusText,
  startDisabled
}: HostLobbyStageProps) {
  const playerSummary = playerLimit ? `${playerCount}/${playerLimit} players` : `${playerCount} players`;

  return (
    <section className="grid gap-4 xl:grid-cols-[1.35fr_0.7fr_0.95fr]">
      <div className="cp-card-panel p-6 sm:p-7">
        <span className="cp-eyebrow cp-eyebrow-light">Host lobby</span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Get everyone in, then hit start.</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600">
          Show the room code on the big screen. Players join in seconds, then the race can begin.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="cp-stat-chip">{playerSummary}</span>
          <span className="cp-stat-chip">{canStart ? "Ready to start" : `Need ${minimumPlayers} players`}</span>
          <span className="cp-stat-chip">Join at {joiningLabel}</span>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button onClick={onStart} disabled={startDisabled} className="cp-button-primary min-w-[13rem] text-base">
            Start game
          </button>
          <div className="text-sm font-medium text-slate-500">The host screen is the show. Phones stay focused on input.</div>
        </div>

        {error ? <p className="mt-5 rounded-[1rem] bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        {statusText ? <p className="mt-4 text-sm font-medium text-slate-500">{statusText}</p> : null}
      </div>

      <div className="cp-card-panel p-6 sm:p-7">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Game type</div>
        <div className="mt-4 text-3xl font-black text-slate-950">{gameLabel}</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">Live skill-based race built for a shared screen and fast phone controls.</p>
      </div>

      <div className="cp-card-panel p-6 sm:p-7">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Room code</div>
        <div className="mt-5">
          <div className="cp-code-showcase w-full">{code}</div>
        </div>
      </div>
    </section>
  );
}
