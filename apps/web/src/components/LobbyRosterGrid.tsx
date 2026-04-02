import { getPlayerColorHex, type RosterPlayer } from "@crowdplay/protocol";

interface LobbyRosterGridProps {
  players: RosterPlayer[];
}

export function LobbyRosterGrid({ players }: LobbyRosterGridProps) {
  return (
    <section className="cp-card-dark p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Players</p>
          <h2 className="mt-2 text-2xl font-black text-white">Lobby roster</h2>
        </div>
        <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">{players.length} joined</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {players.length ? (
          players.map((player) => (
            <div key={player.id} className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-block size-4 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.08)]" style={{ backgroundColor: getPlayerColorHex(player.color) }} />
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-white">{player.name}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {player.connected ? "Ready" : "Reconnecting"}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-[1.35rem] border border-dashed border-white/14 bg-white/4 px-5 py-10 text-center text-slate-400">
            Waiting for the first player to join.
          </div>
        )}
      </div>
    </section>
  );
}
