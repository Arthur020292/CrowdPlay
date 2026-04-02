import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { HostPage } from "../pages/HostPage";
import { JoinPage } from "../pages/JoinPage";
import { LandingPage } from "../pages/LandingPage";
import { PlayPage } from "../pages/PlayPage";
import { ResultsPage } from "../pages/ResultsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "/join", element: <JoinPage /> },
      { path: "/host/:code", element: <HostPage /> },
      { path: "/play/:code", element: <PlayPage /> },
      { path: "/results/:matchId", element: <ResultsPage /> }
    ]
  }
]);
