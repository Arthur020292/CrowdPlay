import type { MatchStanding, RosterPlayer, SnapshotPlayer } from "@crowdplay/protocol";

import { AvatarBadge } from "./AvatarBadge";

type Row = MatchStanding | RosterPlayer | SnapshotPlayer;

interface LeaderboardProps {
  players: Row[];
  title: string;
}

export function Leaderboard({ players, title }: LeaderboardProps) {
  return (
    <section className="cp-card-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <span className="rounded-full border border-slate-200 bg-white/[0.8] px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-500">{players.length} players</span>
      </div>

      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={"playerId" in player ? player.playerId : player.id}
            className="flex items-center justify-between rounded-[1.4rem] border border-slate-200 bg-white/[0.84] px-4 py-3 shadow-[0_8px_20px_rgba(148,163,184,0.12)]"
          >
            <div className="flex items-center gap-3">
              <AvatarBadge avatarId={player.avatarId} size={40} />
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  {index + 1}. {player.name}
                </div>
                <div className="text-xs text-slate-500">
                  {"connected" in player ? (player.connected ? "Connected" : "Reconnecting") : `${"totalTaps" in player ? player.totalTaps : player.t} taps`}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold text-sky-700">
                {"distance" in player ? player.distance.toFixed(1) : player.d.toFixed(1)}m
              </div>
              <div className="text-xs text-slate-500">Rank {"rank" in player ? player.rank : player.r}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
