import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createSession } from "../lib/api";
import { saveHostToken } from "../lib/storage";

export function LandingPage() {
  const navigate = useNavigate();
  const [playerLimit, setPlayerLimit] = useState(30);
  const [raceDurationSec, setRaceDurationSec] = useState(120);
  const [countdownSec, setCountdownSec] = useState(3);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const session = await createSession({
        playerLimit,
        raceDurationMs: raceDurationSec * 1000,
        countdownMs: countdownSec * 1000
      });
      saveHostToken(session.code, session.hostToken);
      navigate(`/host/${session.code}?token=${encodeURIComponent(session.hostToken)}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create session.");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickJoin = (event: FormEvent) => {
    event.preventDefault();
    if (joinCode.trim()) {
      navigate(`/play/${joinCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[2.5rem] border border-cyan-400/20 bg-slate-900/70 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur">
        <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
          TapDash MVP
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
          Run company game nights with one shared screen and fifty phones.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          CrowdPlay turns any event room into a live multiplayer race. The host shares the main display, everyone joins by code,
          and phones become instant controllers.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Fast setup", "Create a room, share a code, and start the countdown in seconds."],
            ["Server authoritative", "Durable Objects own state, rankings, timers, and final winners."],
            ["Designed for rooms", "The admin display is the show. Phones stay focused on tapping."]
          ].map(([title, body]) => (
            <div key={title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">{title}</div>
              <div className="mt-2 text-sm text-slate-400">{body}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        <form onSubmit={handleCreate} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Create TapDash session</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Player limit</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none ring-0"
                type="number"
                min={2}
                max={50}
                value={playerLimit}
                onChange={(event) => setPlayerLimit(Number(event.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Race duration (seconds)</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none ring-0"
                type="number"
                min={30}
                max={300}
                value={raceDurationSec}
                onChange={(event) => setRaceDurationSec(Number(event.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Countdown (seconds)</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none ring-0"
                type="number"
                min={1}
                max={10}
                value={countdownSec}
                onChange={(event) => setCountdownSec(Number(event.target.value))}
              />
            </label>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Creating session..." : "Create host screen"}
          </button>
        </form>

        <form onSubmit={handleQuickJoin} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Join with code</h2>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm text-slate-300">Session code</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 uppercase tracking-[0.35em] text-white outline-none"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
            />
          </label>

          <button className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
            Join as player
          </button>
        </form>
      </div>
    </div>
  );
}
