import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { HostPage } from "../pages/HostPage";
import { DevScreensPage } from "../pages/DevScreensPage";
import { HostGamesPage } from "../pages/HostGamesPage";
import { JoinPage } from "../pages/JoinPage";
import { LandingPage } from "../pages/LandingPage";
import { PlayPage } from "../pages/PlayPage";
import { ResultsPage } from "../pages/ResultsPage";

const shellChildren = [
  { path: "/join", element: <JoinPage /> },
  { path: "/host/select", element: <HostGamesPage /> },
  { path: "/host/:code", element: <HostPage /> },
  { path: "/play/:code", element: <PlayPage /> },
  { path: "/results/:matchId", element: <ResultsPage /> }
];

if (import.meta.env.DEV) {
  shellChildren.push({ path: "/dev/screens", element: <DevScreensPage /> });
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />
  },
  {
    element: <AppShell />,
    children: shellChildren
  }
]);
