import { Link, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_45%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-cyan-400/20 text-lg font-black text-cyan-200">
              CP
            </span>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/80">CrowdPlay</div>
              <div className="text-xs text-slate-300">Live hosted multiplayer games</div>
            </div>
          </Link>

          <nav className="flex items-center gap-2 text-sm text-slate-300">
            <Link className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white" to="/join">
              Join Game
            </Link>
            {import.meta.env.DEV ? (
              <Link className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white" to="/dev/screens">
                UI Preview
              </Link>
            ) : null}
          </nav>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
