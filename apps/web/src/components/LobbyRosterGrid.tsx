import { getPlayerColorHex, type RosterPlayer } from "@crowdplay/protocol";

interface LobbyRosterGridProps {
  players: RosterPlayer[];
}

export function LobbyRosterGrid({ players }: LobbyRosterGridProps) {
  return (
    <section className="cp-card-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700/80">Players</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Joined players</h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-white/[0.8] px-4 py-2 text-sm font-semibold text-slate-600">{players.length} joined</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
        {players.length ? (
          players.map((player) => (
            <div key={player.id} className="rounded-[1.35rem] border border-slate-200 bg-white/[0.88] px-4 py-4 shadow-[0_8px_20px_rgba(148,163,184,0.12)]">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-block size-4 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.8)]" style={{ backgroundColor: getPlayerColorHex(player.color) }} />
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-950">{player.name}</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {player.connected ? "Ready" : "Reconnecting"}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-[1.35rem] border border-dashed border-slate-300 bg-white/[0.65] px-5 py-10 text-center text-slate-500">
            Waiting for the first player to join.
          </div>
        )}
      </div>
    </section>
  );
}
