import type { ReactNode } from "react";

import type { MatchStanding } from "@crowdplay/protocol";

import { AvatarBadge } from "./AvatarBadge";

interface HostPodiumProps {
  standings: MatchStanding[];
  className?: string;
  action?: ReactNode;
}

const podiumConfig = [
  {
    rank: 2,
    label: "2nd",
    shellClassName: "from-slate-100 via-white to-slate-50 border-slate-200/90",
    blockClassName: "from-slate-300 to-slate-200 text-slate-700",
    heightClassName: "h-36"
  },
  {
    rank: 1,
    label: "1st",
    shellClassName: "from-amber-50 via-white to-yellow-50 border-amber-200/90",
    blockClassName: "from-amber-300 to-yellow-200 text-amber-800",
    heightClassName: "h-48"
  },
  {
    rank: 3,
    label: "3rd",
    shellClassName: "from-orange-50 via-white to-rose-50 border-orange-200/90",
    blockClassName: "from-orange-300 to-amber-200 text-orange-800",
    heightClassName: "h-28"
  }
] as const;

export function HostPodium({ standings, className = "min-h-[420px] flex-1", action }: HostPodiumProps) {
  const podiumPlayers = podiumConfig
    .map((config) => ({
      ...config,
      player: standings[config.rank - 1]
    }))
    .filter((entry): entry is typeof podiumConfig[number] & { player: MatchStanding } => Boolean(entry.player));

  return (
    <section className={`flex w-full flex-col justify-between overflow-hidden ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="cp-eyebrow cp-eyebrow-light">Podium</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Top finishers</h2>
        </div>
        {action}
      </div>

      <div className="mt-8 flex min-h-0 flex-1 items-end justify-center gap-4 sm:gap-6">
        {podiumPlayers.map((entry) => (
          <div
            key={entry.player.playerId}
            className={`flex min-w-0 flex-1 flex-col items-center rounded-[2rem] border bg-gradient-to-b p-4 text-center shadow-[0_18px_42px_rgba(148,163,184,0.14)] ${entry.shellClassName}`.trim()}
          >
            <div className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-slate-500">
              {entry.label}
            </div>
            <AvatarBadge avatarId={entry.player.avatarId} size={72} className="mt-4" />
            <div className="mt-4 text-xl font-black text-slate-950 sm:text-2xl">{entry.player.name}</div>
            <div className="mt-1 text-sm font-medium text-slate-500">{entry.player.distance.toFixed(1)}m</div>
            <div
              className={`mt-6 flex w-full items-start justify-center rounded-[1.6rem] bg-gradient-to-b px-3 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${entry.blockClassName} ${entry.heightClassName}`.trim()}
            >
              <span className="text-4xl font-black sm:text-5xl">{entry.rank}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
