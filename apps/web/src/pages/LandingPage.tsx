import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createSession } from "../lib/api";
import { saveHostToken } from "../lib/storage";

export function LandingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
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
    <div className="flex min-h-[calc(100vh-11rem)] items-center justify-center">
      <section className="cp-card-dark w-full max-w-4xl overflow-hidden px-8 py-12 text-center sm:px-12 sm:py-16">
        <span className="cp-eyebrow">TapDash</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">Choose how you want to play.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
          Host a game on the big screen or join one from your phone. That&apos;s it.
        </p>

        <div className="mt-10 grid gap-4 sm:mx-auto sm:max-w-2xl sm:grid-cols-2">
          <button type="button" onClick={handleCreate} disabled={busy} className="cp-button-primary min-h-[4.75rem] text-lg font-black">
            {busy ? "Creating..." : "Host a Game"}
          </button>
          <button type="button" onClick={() => navigate("/join")} className="cp-button-secondary min-h-[4.75rem] bg-white/[0.14] text-lg font-black text-white">
            Join a Game
          </button>
        </div>

        {error ? <p className="mx-auto mt-6 max-w-xl rounded-[1rem] bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      </section>
    </div>
  );
}
