import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import type { MatchFinishedEvent, RosterPlayer, SnapshotEvent } from "@crowdplay/protocol";

import { Leaderboard } from "../components/Leaderboard";
import { RaceCanvas } from "../components/RaceCanvas";
import { useSessionSocket } from "../hooks/useSessionSocket";
import { buildSessionSocketUrl, endSession, startSession } from "../lib/api";
import { getHostToken, saveHostToken } from "../lib/storage";
import { formatRemainingLabel } from "../lib/time";

export function HostPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const code = params.code?.toUpperCase() ?? "";
  const queryToken = searchParams.get("token");
  const hostToken = queryToken ?? getHostToken(code);

  if (queryToken) {
    saveHostToken(code, queryToken);
  }

  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [snapshot, setSnapshot] = useState<SnapshotEvent | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<SnapshotEvent | null>(null);
  const [phase, setPhase] = useState("lobby");
  const [remainingMs, setRemainingMs] = useState(0);
  const [result, setResult] = useState<MatchFinishedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketUrl = useMemo(() => (hostToken ? buildSessionSocketUrl(code, hostToken) : null), [code, hostToken]);
  const { status } = useSessionSocket({
    enabled: Boolean(hostToken),
    url: socketUrl,
    onEvent(event) {
      switch (event.type) {
        case "join_ack":
          setPhase(event.phase);
          break;
        case "roster_update":
          setRoster(event.players);
          break;
        case "phase_changed":
          setPhase(event.phase);
          setRemainingMs(event.remainingMs ?? event.countdownMs ?? 0);
          break;
        case "snapshot":
          setPreviousSnapshot(snapshot ? { ...snapshot } : null);
          setSnapshot(event);
          setPhase(event.phase);
          setRemainingMs(event.remainingMs);
          break;
        case "match_finished":
          setResult(event);
          break;
        case "error":
          setError(event.message);
          break;
        default:
          break;
      }
    }
  });

  if (!hostToken) {
    return (
      <div className="mx-auto max-w-xl rounded-[2rem] border border-rose-400/20 bg-rose-400/10 p-8 text-rose-100">
        Host token missing for session <strong>{code}</strong>. Create a new session from the home page.
      </div>
    );
  }

  const livePlayers = snapshot?.players ?? roster.map((player) => ({ ...player, t: 0, status: player.connected ? "connected" : "disconnected" as const, id: player.id, d: player.distance, r: player.rank }));

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Host Screen</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-white">{code}</h1>
              <p className="mt-2 text-sm text-slate-400">Socket {status} • Phase {phase}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-300">
                Remaining {formatRemainingLabel(phase, remainingMs)}
              </div>
              <button
                onClick={() => startSession(code, hostToken).catch((startError) => setError(startError instanceof Error ? startError.message : "Unable to start match."))}
                disabled={phase !== "lobby" || roster.length < 2}
                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start race
              </button>
              <button
                onClick={() => endSession(code, hostToken).catch((endError) => setError(endError instanceof Error ? endError.message : "Unable to end match."))}
                disabled={phase !== "live" && phase !== "countdown"}
                className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Stop
              </button>
            </div>
          </div>

          <RaceCanvas snapshot={snapshot} previousSnapshot={previousSnapshot} />

          {result ? (
            <div className="mt-6 rounded-[1.75rem] border border-amber-300/20 bg-amber-400/10 p-5">
              <div className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Podium</div>
              <div className="mt-3 text-2xl font-black text-white">
                {result.standings.slice(0, 3).map((standing) => standing.name).join(" • ")}
              </div>
              <button
                onClick={() => navigate(`/results/${result.matchId}`)}
                className="mt-4 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
              >
                Open results
              </button>
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </div>

        <Leaderboard players={livePlayers} title={phase === "lobby" ? "Lobby roster" : "Live standings"} />
      </section>
    </div>
  );
}
