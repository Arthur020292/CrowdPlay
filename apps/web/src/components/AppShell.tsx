import { Outlet, useLocation } from "react-router-dom";

export function AppShell() {
  const location = useLocation();
  const isHostRoute = location.pathname.startsWith("/host/");
  const isDevScreensRoute = location.pathname === "/dev/screens";

  if (isHostRoute) {
    return (
      <div className="min-h-screen text-slate-100">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    );
  }

  if (isDevScreensRoute) {
    return (
      <div className="min-h-screen text-slate-100">
        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
