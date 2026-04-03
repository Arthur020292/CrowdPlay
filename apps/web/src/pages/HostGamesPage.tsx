import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { CreateSessionRequest } from "@crowdplay/protocol";

import { createSession } from "../lib/api";
import { saveHostToken } from "../lib/storage";

const GAME_TILES = [
  {
    id: "goldrush",
    title: "Gold Rush",
    status: "Live",
    description: "Answer questions, open hidden chests, and unleash chaos on the top vaults."
  },
  {
    id: "quizdash",
    title: "QuizDash",
    status: "Live",
    description: "Answer fast and build distance in a straight-up race to the finish."
  },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `coming-soon-${index + 1}`,
    title: "Coming Soon",
    status: "Soon",
    description: "More CrowdPlay party games are on the way."
  }))
] as const;

function buildCreateRequest(gameId: "goldrush" | "quizdash"): CreateSessionRequest {
  if (gameId === "goldrush") {
    return {
      gameType: "goldrush",
      playerLimit: 50,
      matchDurationMs: 120_000,
      countdownMs: 3_000,
      lockoutMs: 4_000
    };
  }

  return {
    gameType: "quizdash",
    playerLimit: 50,
    raceDurationMs: 120_000,
    countdownMs: 3_000
  };
}

export function HostGamesPage() {
  const navigate = useNavigate();
  const [busyGameId, setBusyGameId] = useState<"goldrush" | "quizdash" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePickGame = async (gameId: "goldrush" | "quizdash") => {
    setBusyGameId(gameId);
    setError(null);

    try {
      const session = await createSession(buildCreateRequest(gameId));
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
        <span className="cp-eyebrow cp-eyebrow-light">Choose a game</span>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Pick what the room will play.</h1>

        {error ? <p className="mt-5 max-w-xl rounded-[1rem] bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {GAME_TILES.map((tile) => {
            const isLive = tile.id === "goldrush" || tile.id === "quizdash";
            const isBusy = busyGameId === tile.id;

            return (
              <button
                key={tile.id}
                type="button"
                disabled={!isLive || Boolean(busyGameId)}
                onClick={isLive ? () => handlePickGame(tile.id as "goldrush" | "quizdash") : undefined}
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
                      {isBusy ? "Creating..." : tile.id === "goldrush" ? "Play Gold Rush" : "Play QuizDash"}
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
      </section>
    </main>
  );
}
