import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import type { MatchFinishedEvent, RosterPlayer, SnapshotEvent } from "@crowdplay/protocol";

import { HostLobbyStage } from "../components/HostLobbyStage";
import { HostPodium } from "../components/HostPodium";
import { Leaderboard } from "../components/Leaderboard";
import { LobbyRosterGrid } from "../components/LobbyRosterGrid";
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
          setPhase("finished");
          setRemainingMs(0);
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

  const livePlayers =
    snapshot?.players ??
    roster.map((player) => ({
      ...player,
      t: 0,
      status: player.connected ? "connected" : "disconnected",
      id: player.id,
      d: player.distance,
      r: player.rank
    }));

  if (phase === "lobby" || phase === "countdown") {
    return (
      <div className="min-h-screen space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <HostLobbyStage
          code={code}
          gameLabel="TapDash"
          phase={phase === "countdown" ? "countdown" : "lobby"}
          remainingMs={remainingMs}
          playerCount={roster.length}
          onStart={() => startSession(code, hostToken).catch((startError) => setError(startError instanceof Error ? startError.message : "Unable to start match."))}
          startDisabled={roster.length < 2 || phase !== "lobby"}
        />
        <LobbyRosterGrid players={roster} />
        {error ? <p className="px-6 text-sm text-rose-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:min-h-[calc(100vh-3rem)] xl:grid-cols-[1.4fr_0.6fr]">
        <div className="flex min-h-0 flex-col">
          {result ? (
            <HostPodium
              standings={result.standings}
              action={
                <button
                  onClick={() => navigate(`/results/${result.matchId}`)}
                  className="cp-button-secondary px-4 py-2 text-sm"
                >
                  Open results
                </button>
              }
            />
          ) : (
            <RaceCanvas
              snapshot={snapshot}
              previousSnapshot={previousSnapshot}
              className="min-h-[420px] flex-1"
              lanePlayerIds={roster.map((player) => player.id)}
            />
          )}

          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </div>

        <Leaderboard
          players={livePlayers}
          title={phase === "finished" ? "Final standings" : phase === "lobby" ? "Lobby roster" : "Live standings"}
          scrollable={phase === "live" || phase === "finished"}
          headerActions={
            phase === "live" ? (
              <>
                <div className="rounded-full border border-slate-200 bg-white/[0.84] px-4 py-2 text-sm font-medium text-slate-600">
                  Remaining {formatRemainingLabel(phase, remainingMs)}
                </div>
                <button
                  onClick={() => endSession(code, hostToken).catch((endError) => setError(endError instanceof Error ? endError.message : "Unable to end match."))}
                  disabled={phase !== "live" && phase !== "countdown"}
                  className="cp-button-secondary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Stop
                </button>
              </>
            ) : null
          }
        />
      </section>
    </div>
  );
}
