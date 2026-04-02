import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createSession } from "../lib/api";
import { saveHostToken } from "../lib/storage";

export function LandingPage() {
  const navigate = useNavigate();
  const [playerLimit, setPlayerLimit] = useState(30);
  const [raceDurationSec, setRaceDurationSec] = useState(120);
  const [countdownSec, setCountdownSec] = useState(3);
  const [advancedOpen, setAdvancedOpen] = useState(false);
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

  return (
    <div className="space-y-8">
      <section className="cp-card-dark overflow-hidden p-8 sm:p-10">
        <span className="cp-eyebrow">TapDash</span>
        <div className="mt-6 max-w-4xl">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Start a game in seconds. Join from any phone.</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            CrowdPlay turns company events into instant live races. One shared screen, one join code, and everyone is in.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <span className="cp-stat-chip-dark">Fast room setup</span>
          <span className="cp-stat-chip-dark">Phones as controllers</span>
          <span className="cp-stat-chip-dark">Made for shared screens</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleCreate} className="cp-card-light p-8">
          <span className="cp-eyebrow cp-eyebrow-light">For hosts</span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Host a game</h2>
          <p className="mt-3 text-base text-slate-600">Create a room, show the code, and start when everyone is in.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="cp-stat-chip">{playerLimit} players</span>
            <span className="cp-stat-chip">{Math.round(raceDurationSec / 60)} min race</span>
            <span className="cp-stat-chip">{countdownSec}s countdown</span>
          </div>

          {advancedOpen ? (
            <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-white/[0.72] p-4">
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Advanced settings</div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-600">Players</span>
                  <input className="cp-input" type="number" min={2} max={50} value={playerLimit} onChange={(event) => setPlayerLimit(Number(event.target.value))} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-600">Race (sec)</span>
                  <input
                    className="cp-input"
                    type="number"
                    min={30}
                    max={300}
                    value={raceDurationSec}
                    onChange={(event) => setRaceDurationSec(Number(event.target.value))}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-600">Countdown</span>
                  <input
                    className="cp-input"
                    type="number"
                    min={1}
                    max={10}
                    value={countdownSec}
                    onChange={(event) => setCountdownSec(Number(event.target.value))}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-4 rounded-[1rem] bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={busy} className="cp-button-primary min-w-[13rem] text-base">
              {busy ? "Creating..." : "Host Game"}
            </button>
            <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="cp-button-link text-sm">
              {advancedOpen ? "Hide advanced settings" : "Customize settings"}
            </button>
          </div>
        </form>

        <section className="cp-card-light p-8">
          <span className="cp-eyebrow cp-eyebrow-light">For players</span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Join a game</h2>
          <p className="mt-3 text-base text-slate-600">Enter the code from the big screen, pick your name and color, then get ready to tap.</p>

          <div className="mt-8 space-y-4">
            {[
              "1. Enter the room code",
              "2. Pick your name and color",
              "3. Watch the host screen and race"
            ].map((step) => (
              <div key={step} className="rounded-[1.4rem] bg-sky-100/70 px-4 py-4 text-sm font-semibold text-sky-950">
                {step}
              </div>
            ))}
          </div>

          <button type="button" onClick={() => navigate("/join")} className="cp-button-secondary mt-7 w-full justify-center bg-slate-950 text-white">
            Join Game
          </button>
        </section>
      </div>
    </div>
  );
}
