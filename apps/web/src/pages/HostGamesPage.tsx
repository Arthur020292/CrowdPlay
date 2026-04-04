import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createSession } from "../lib/api";
import { saveHostToken } from "../lib/storage";
import { LIVE_GAME_DEFINITIONS, buildCreateSessionRequest, type LiveGameType } from "../games/registry";

const GAME_TILES = [
  ...LIVE_GAME_DEFINITIONS,
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `coming-soon-${index + 1}`,
    title: "Coming Soon",
    cta: "Soon",
    description: "More CrowdPlay party games are on the way."
  }))
] as const;

const DURATION_OPTIONS = [
  { label: "1 min", value: 60_000 },
  { label: "2 min", value: 120_000 },
  { label: "3 min", value: 180_000 }
] as const;

export function HostGamesPage() {
  const navigate = useNavigate();
  const [busyGameId, setBusyGameId] = useState<LiveGameType | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<LiveGameType | null>(null);
  const [selectedDurationMs, setSelectedDurationMs] = useState<number>(120_000);
  const [error, setError] = useState<string | null>(null);
  const selectedGame = LIVE_GAME_DEFINITIONS.find((game) => game.id === selectedGameId) ?? null;

  const handlePickGame = (gameId: LiveGameType) => {
    setSelectedGameId(gameId);
    setSelectedDurationMs(120_000);
    setError(null);
  };

  const handleCreateSession = async () => {
    if (!selectedGameId) {
      return;
    }

    const gameId = selectedGameId;
    setBusyGameId(gameId);
    setError(null);

    try {
      const session = await createSession(buildCreateSessionRequest(gameId, selectedDurationMs));
      saveHostToken(session.code, session.hostToken);
      const shouldSeedLocalBots =
        import.meta.env.DEV &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const query = new URLSearchParams({ token: session.hostToken });
      if (shouldSeedLocalBots) {
        query.set("bots", "35");
      }
      navigate(`/host/${session.code}?${query.toString()}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create session.");
    } finally {
      setBusyGameId(null);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section>
        {selectedGame ? null : <span className="cp-eyebrow cp-eyebrow-light">Choose a game</span>}
        {selectedGame ? null : <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Pick what the room will play.</h1>}

        {error ? <p className="mt-5 max-w-xl rounded-[1rem] bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

        {selectedGame ? (
          <section className="cp-card-light mx-auto mt-8 max-w-xl p-8 sm:p-10">
            <span className="cp-eyebrow cp-eyebrow-light">Choose duration</span>
            <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Pick match length</h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">{selectedGame.title} is selected. Choose how long the room should run.</p>

            <div className="mt-8 space-y-3">
              {DURATION_OPTIONS.map((option) => {
                const isActive = selectedDurationMs === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedDurationMs(option.value)}
                    className={`w-full rounded-[1.4rem] border px-5 py-4 text-center text-lg font-black uppercase tracking-[0.18em] transition ${
                      isActive
                        ? "border-sky-300 bg-sky-100 text-sky-800 shadow-[0_10px_24px_rgba(56,189,248,0.14)]"
                        : "border-slate-200 bg-white/[0.88] text-slate-600 hover:border-sky-200 hover:text-sky-700"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={handleCreateSession}
                disabled={Boolean(busyGameId)}
                className="cp-button-primary w-full text-base font-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyGameId ? "Creating..." : "Create room"}
              </button>

              <button
                type="button"
                onClick={() => setSelectedGameId(null)}
                disabled={Boolean(busyGameId)}
                className="cp-button-link w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                Change game
              </button>
            </div>
          </section>
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {GAME_TILES.map((tile) => {
              const isLive = LIVE_GAME_DEFINITIONS.some((game) => game.id === tile.id);
              const isBusy = busyGameId === tile.id;

              return (
                <button
                  key={tile.id}
                  type="button"
                  disabled={!isLive || Boolean(busyGameId)}
                  onClick={isLive ? () => handlePickGame(tile.id as LiveGameType) : undefined}
                  className={`rounded-[1.9rem] border p-5 text-left transition ${
                    isLive
                      ? "border-sky-200/90 bg-white/[0.76] shadow-[0_20px_40px_rgba(56,189,248,0.10)] backdrop-blur-[10px] hover:-translate-y-1 hover:shadow-[0_24px_44px_rgba(56,189,248,0.14)]"
                      : "cursor-not-allowed border-slate-200/80 bg-white/[0.54] backdrop-blur-[10px]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.26em] ${isLive ? "bg-cyan-100/90 text-cyan-700" : "bg-slate-200/90 text-slate-500"}`}>
                      {isLive ? "Live" : "Coming soon"}
                    </span>
                  </div>

                  <div className="mt-5 text-2xl font-black text-slate-950">{isLive ? tile.title : "Coming soon"}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tile.description}</p>

                  <div className="mt-5">
                    {isLive ? (
                      <span className="cp-button-primary min-h-[3.8rem] min-w-[10rem] text-base font-black">
                        {isBusy ? "Creating..." : tile.cta}
                      </span>
                    ) : (
                      <span className="inline-flex min-h-[3.8rem] min-w-[10rem] items-center justify-center rounded-[1.3rem] border border-slate-200/80 bg-white/[0.58] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                        Soon
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
