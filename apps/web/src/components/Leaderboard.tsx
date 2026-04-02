import { getPlayerColorHex } from "@crowdplay/protocol";

import type { MatchStanding, RosterPlayer, SnapshotPlayer } from "@crowdplay/protocol";

type Row = MatchStanding | RosterPlayer | SnapshotPlayer;

interface LeaderboardProps {
  players: Row[];
  title: string;
}

export function Leaderboard({ players, title }: LeaderboardProps) {
  return (
    <section className="cp-card-dark p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">{players.length} players</span>
      </div>

      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={"playerId" in player ? player.playerId : player.id}
            className="flex items-center justify-between rounded-[1.4rem] border border-white/[0.08] bg-white/[0.06] px-4 py-3"
          >
            <div>
              <div className="text-sm font-semibold text-white">
                <span
                  className="mr-2 inline-block size-3 rounded-full align-middle shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
                  style={{ backgroundColor: "color" in player ? getPlayerColorHex(player.color) : "#22d3ee" }}
                />
                {index + 1}. {player.name}
              </div>
              <div className="text-xs text-slate-400">
                {"connected" in player ? (player.connected ? "Connected" : "Reconnecting") : `${"totalTaps" in player ? player.totalTaps : player.t} taps`}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold text-cyan-200">
                {"distance" in player ? player.distance.toFixed(1) : player.d.toFixed(1)}m
              </div>
              <div className="text-xs text-slate-400">Rank {"rank" in player ? player.rank : player.r}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
