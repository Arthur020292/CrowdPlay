import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { HostPage } from "../pages/HostPage";
import { DevScreensPage } from "../pages/DevScreensPage";
import { JoinPage } from "../pages/JoinPage";
import { LandingPage } from "../pages/LandingPage";
import { PlayPage } from "../pages/PlayPage";
import { ResultsPage } from "../pages/ResultsPage";

const children = [
  { index: true, element: <LandingPage /> },
  { path: "/join", element: <JoinPage /> },
  { path: "/host/:code", element: <HostPage /> },
  { path: "/play/:code", element: <PlayPage /> },
  { path: "/results/:matchId", element: <ResultsPage /> }
];

if (import.meta.env.DEV) {
  children.push({ path: "/dev/screens", element: <DevScreensPage /> });
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children
  }
]);
