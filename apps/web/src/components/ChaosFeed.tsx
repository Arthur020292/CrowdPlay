import type { ChaosEvent } from "@crowdplay/protocol";

import { AvatarBadge } from "./AvatarBadge";

interface ChaosFeedProps {
  events: ChaosEvent[];
  className?: string;
  headerBadge?: string;
}

function formatEventLabel(title: string): string {
  return title.toLowerCase();
}

function formatGold(amount: number | undefined): string {
  return `${Math.abs(amount ?? 0)} gold`;
}

function summarizeEvent(event: ChaosEvent): string {
  const actor = event.actor.name;
  const target = event.target?.name;
  const amount = event.outcome.goldDelta;

  switch (event.outcome.effectType) {
    case "gold_steal":
      return `${actor} stole ${formatGold(amount)} from ${target ?? "another player"}`;
    case "gold_swap":
      return `${actor} swapped vaults with ${target ?? "another player"}`;
    case "gold_multiplier":
      return `${actor} gained ${formatGold(amount)}`;
    case "gold_gain":
      return `${actor} banked ${formatGold(amount)}`;
    case "gold_loss":
      return `${actor} lost ${formatGold(amount)}`;
    default:
      return event.outcome.detail;
  }
}

export function ChaosFeed({ events, className = "", headerBadge }: ChaosFeedProps) {
  return (
    <section className={`cp-card-panel flex min-h-0 flex-col overflow-hidden p-5 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-slate-950">Latest chest swings</h2>
        {headerBadge ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
            {headerBadge}
          </span>
        ) : null}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {events.length ? (
          events.map((event) => (
            <div key={`${event.actor.playerId}:${event.at}`} className="rounded-[1.1rem] border border-slate-200 bg-white/[0.9] px-3 py-2.5 shadow-[0_6px_16px_rgba(148,163,184,0.08)]">
              <div className="flex items-center gap-2.5">
                <AvatarBadge avatarId={event.actor.avatarId} size={28} />
                <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                  {summarizeEvent(event)}
                </div>
                <div className="shrink-0 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                  {formatEventLabel(event.outcome.title)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/[0.78] px-5 py-10 text-center text-slate-500">
            Open chests to start the chaos.
          </div>
        )}
      </div>
    </section>
  );
}
