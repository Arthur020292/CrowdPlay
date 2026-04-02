interface HostLobbyStageProps {
  code: string;
  gameLabel: string;
  onStart?: () => void;
  startDisabled?: boolean;
}

export function HostLobbyStage({
  code,
  gameLabel,
  onStart,
  startDisabled
}: HostLobbyStageProps) {
  return (
    <section>
      <div className="cp-card-glass p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1.2fr)_minmax(0,1fr)] lg:items-center">
          <div className="lg:self-start">
            <span className="cp-eyebrow cp-eyebrow-light">Game</span>
            <div className="mt-3 text-3xl font-black text-slate-950">{gameLabel}</div>
          </div>

          <div className="lg:col-start-2 lg:justify-self-center lg:w-full">
            <div className="cp-code-showcase w-full">{code}</div>
          </div>

          <div className="lg:col-start-3 lg:justify-self-end">
            <button onClick={onStart} disabled={startDisabled} className="cp-button-primary min-w-[13rem] text-base">
              Start game
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
