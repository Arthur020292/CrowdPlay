import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createSession } from "../lib/api";
import { saveHostToken } from "../lib/storage";

const GAME_TILES = [
  {
    id: "tapdash",
    title: "TapDash",
    status: "Live",
    description: "Rapid tapping race for a shared screen."
  },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `coming-soon-${index + 1}`,
    title: "Coming Soon",
    status: "Soon",
    description: "More CrowdPlay party games are on the way."
  }))
] as const;

export function HostGamesPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickTapDash = async () => {
    setBusy(true);
    setError(null);

    try {
      const session = await createSession({
        playerLimit: 30,
        raceDurationMs: 120_000,
        countdownMs: 3_000
      });
      saveHostToken(session.code, session.hostToken);
      navigate(`/host/${session.code}?token=${encodeURIComponent(session.hostToken)}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="cp-card-panel p-8 sm:p-10">
        <span className="cp-eyebrow cp-eyebrow-light">Choose a game</span>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Pick what the room will play.</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
          TapDash is ready to host now. More party games will appear here as CrowdPlay grows.
        </p>

        {error ? <p className="mt-5 max-w-xl rounded-[1rem] bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {GAME_TILES.map((tile) => {
            const isLive = tile.id === "tapdash";

            return (
              <button
                key={tile.id}
                type="button"
                disabled={!isLive || busy}
                onClick={isLive ? handlePickTapDash : undefined}
                className={`rounded-[1.7rem] border p-5 text-left transition ${
                  isLive
                    ? "border-sky-200 bg-white/[0.94] shadow-[0_18px_34px_rgba(56,189,248,0.12)] hover:-translate-y-1"
                    : "cursor-not-allowed border-slate-200 bg-white/[0.68] opacity-80"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.26em] ${isLive ? "bg-cyan-100 text-cyan-700" : "bg-slate-200 text-slate-500"}`}>
                    {isLive ? "Live" : "Coming soon"}
                  </span>
                  <span className={`inline-flex size-11 items-center justify-center rounded-[1rem] border-4 text-lg font-black ${isLive ? "border-sky-300 bg-gradient-to-b from-cyan-200 to-sky-400 text-sky-900" : "border-slate-300 bg-slate-100 text-slate-400"}`}>
                    {isLive ? "TD" : "?"}
                  </span>
                </div>

                <div className="mt-5 text-2xl font-black text-slate-950">{isLive ? tile.title : "Coming soon"}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tile.description}</p>

                <div className="mt-5">
                  {isLive ? (
                    <span className="cp-button-primary min-h-[3.8rem] min-w-[10rem] text-base font-black">{busy ? "Creating..." : "Play TapDash"}</span>
                  ) : (
                    <span className="inline-flex min-h-[3.8rem] min-w-[10rem] items-center justify-center rounded-[1.3rem] border border-slate-200 bg-white/[0.7] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                      Soon
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
