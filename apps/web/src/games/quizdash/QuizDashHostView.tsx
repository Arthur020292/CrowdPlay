import type { QuizDashMatchFinishedEvent, QuizDashSnapshotEvent, RosterPlayer } from "@crowdplay/protocol";

import { HostPodium } from "../../components/HostPodium";
import { Leaderboard } from "../../components/Leaderboard";
import { RaceCanvas } from "../../components/RaceCanvas";
import { formatRemainingLabel } from "../../lib/time";

interface QuizDashHostViewProps {
  result: QuizDashMatchFinishedEvent | null;
  snapshot: QuizDashSnapshotEvent | null;
  previousSnapshot: QuizDashSnapshotEvent | null;
  roster: RosterPlayer[];
  phase: string;
  remainingMs: number;
  error: string | null;
  onOpenResults: (matchId: string) => void;
  onEnd: () => void;
}

export function QuizDashHostView({
  result,
  snapshot,
  previousSnapshot,
  roster,
  phase,
  remainingMs,
  error,
  onOpenResults,
  onEnd
}: QuizDashHostViewProps) {
  const livePlayers =
    snapshot?.players ??
    roster
      .filter((player) => player.gameType === "quizdash")
      .map((player) => ({
        gameType: "quizdash" as const,
        id: player.id,
        name: player.name,
        avatarId: player.avatarId,
        distance: player.distance,
        rank: player.rank,
        correctAnswers: 0,
        wrongAnswers: 0,
        status: player.connected ? "connected" : "disconnected"
      }));

  return (
    <div className="cp-page-background cp-page-background--static min-h-screen space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:min-h-[calc(100vh-3rem)] xl:grid-cols-[1.4fr_0.6fr]">
        <div className="flex min-h-0 flex-col">
          {result ? (
            <HostPodium
              standings={result.standings}
              action={
                <button onClick={() => onOpenResults(result.matchId)} className="cp-button-secondary px-4 py-2 text-sm">
                  Open results
                </button>
              }
            />
          ) : (
            <RaceCanvas snapshot={snapshot} previousSnapshot={previousSnapshot} className="min-h-[420px] flex-1" lanePlayerIds={roster.map((player) => player.id)} />
          )}

          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </div>

        <Leaderboard
          players={result ? result.standings : livePlayers}
          title={phase === "finished" ? "Final standings" : "Live standings"}
          scrollable={phase === "live" || phase === "finished"}
          headerActions={
            phase === "live" ? (
              <>
                <div className="rounded-full border border-slate-200 bg-white/[0.84] px-4 py-2 text-sm font-medium text-slate-600">
                  Remaining {formatRemainingLabel(phase, remainingMs)}
                </div>
                <button
                  onClick={onEnd}
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
