import type { ChaosEvent, GoldRushMatchFinishedEvent, GoldRushSnapshotEvent, RosterPlayer } from "@crowdplay/protocol";

import { ChaosFeed } from "../../components/ChaosFeed";
import { HostPodium } from "../../components/HostPodium";
import { Leaderboard } from "../../components/Leaderboard";
import { formatRemainingLabel } from "../../lib/time";

interface GoldRushHostViewProps {
  result: GoldRushMatchFinishedEvent | null;
  snapshot: GoldRushSnapshotEvent | null;
  roster: RosterPlayer[];
  phase: string;
  remainingMs: number;
  chaosEvents: ChaosEvent[];
  error: string | null;
  onOpenResults: (matchId: string) => void;
  onEnd: () => void;
}

export function GoldRushHostView({
  result,
  snapshot,
  roster,
  phase,
  remainingMs,
  chaosEvents,
  error,
  onOpenResults,
  onEnd
}: GoldRushHostViewProps) {
  const goldPlayers =
    snapshot?.players ??
    roster
      .filter((player) => player.gameType === "goldrush")
      .map((player) => ({
        gameType: "goldrush" as const,
        id: player.id,
        name: player.name,
        avatarId: player.avatarId,
        gold: player.gold,
        rank: player.rank,
        correctAnswers: 0,
        wrongAnswers: 0,
        status: player.connected ? "connected" : "disconnected"
      }));

  return (
    <div className="cp-page-background cp-page-background--static min-h-screen space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:h-[calc(100vh-3rem)] xl:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-h-0 flex-col gap-6">
          {result ? (
            <HostPodium
              standings={result.standings}
              action={
                <button onClick={() => onOpenResults(result.matchId)} className="cp-button-secondary px-4 py-2 text-sm">
                  Open results
                </button>
              }
            />
          ) : null}

          {result ? null : <ChaosFeed events={chaosEvents} className="flex-1" headerBadge={`Remaining ${formatRemainingLabel(phase, remainingMs)}`} />}

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>

        <Leaderboard
          players={result ? result.standings : goldPlayers}
          title={phase === "finished" ? "Final standings" : "Live standings"}
          scrollable={phase === "live" || phase === "finished"}
          showSecondaryText={phase === "finished"}
          showMetricRank={phase === "finished"}
          headerActions={
            phase === "live" ? (
              <button
                onClick={onEnd}
                disabled={phase !== "live" && phase !== "countdown"}
                className="cp-button-secondary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                Stop
              </button>
            ) : null
          }
        />
      </section>
    </div>
  );
}
