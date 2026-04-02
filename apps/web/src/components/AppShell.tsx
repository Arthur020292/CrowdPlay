import { Link, Outlet, useLocation } from "react-router-dom";

export function AppShell() {
  const location = useLocation();
  const isHostRoute = location.pathname.startsWith("/host/");

  if (isHostRoute) {
    return (
      <div className="min-h-screen text-slate-100">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between rounded-full border border-white/[0.12] bg-white/[0.08] px-4 py-3 shadow-[0_18px_40px_rgba(2,6,23,0.18)] backdrop-blur">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-sky-500 text-lg font-black text-slate-950 shadow-[0_10px_24px_rgba(56,189,248,0.28)]">
              CP
            </span>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100">CrowdPlay</div>
              <div className="text-xs text-slate-300">Fast party games for shared screens</div>
            </div>
          </Link>

          <nav className="flex items-center gap-2 text-sm text-slate-300">
            <Link className="rounded-full px-4 py-2 font-semibold transition hover:bg-white/10 hover:text-white" to="/join">
              Join Game
            </Link>
            {import.meta.env.DEV ? (
              <Link className="rounded-full px-4 py-2 font-semibold transition hover:bg-white/10 hover:text-white" to="/dev/screens">
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
