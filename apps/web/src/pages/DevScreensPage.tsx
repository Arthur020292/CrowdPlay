import { FormEvent, useState } from "react";

import { PLAYER_COLOR_PRESETS, getPlayerColorHex, type PlayerColorId, type SnapshotEvent } from "@crowdplay/protocol";

import { HostLobbyStage } from "../components/HostLobbyStage";
import { JoinCodePanel } from "../components/JoinCodePanel";
import { Leaderboard } from "../components/Leaderboard";
import { LobbyRosterGrid } from "../components/LobbyRosterGrid";
import { PlayerIdentityPanel } from "../components/PlayerIdentityPanel";
import { RaceCanvas } from "../components/RaceCanvas";
import {
  previewCountdownSnapshot,
  previewFinishedEvent,
  previewLivePreviousSnapshot,
  previewLiveSnapshot,
  previewMatchResult,
  previewRoster,
  previewSprintSnapshot
} from "../dev/fixtures";
import { formatRemainingLabel } from "../lib/time";

function DevSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="cp-dev-text text-sm uppercase tracking-[0.35em]">{title}</p>
        <p className="cp-dev-subtext mt-2 text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

function LandingPreview() {
  return (
    <div className="flex min-h-[32rem] items-center justify-center">
      <section className="cp-card-dark w-full max-w-4xl overflow-hidden px-8 py-12 text-center sm:px-12 sm:py-16">
        <span className="cp-eyebrow">TapDash</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">Choose how you want to play.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
          Host a game on the big screen or join one from your phone. That&apos;s it.
        </p>

        <div className="mt-10 grid gap-4 sm:mx-auto sm:max-w-2xl sm:grid-cols-2">
          <button className="cp-button-primary min-h-[4.75rem] text-lg font-black">Host a Game</button>
          <button className="cp-button-secondary min-h-[4.75rem] bg-white/[0.14] text-lg font-black text-white">Join a Game</button>
        </div>
      </section>
    </div>
  );
}

function HostRacePreview({
  code,
  phase,
  remainingMs,
  players,
  snapshot,
  previousSnapshot,
  podiumNames
}: {
  code: string;
  phase: string;
  remainingMs: number;
  players: Parameters<typeof Leaderboard>[0]["players"];
  snapshot: SnapshotEvent | null;
  previousSnapshot: SnapshotEvent | null;
  podiumNames?: string[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="cp-card-dark p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Host Screen</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">{code}</h1>
            <p className="mt-2 text-sm text-slate-400">Socket open • Phase {phase}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm text-slate-300">
              Remaining {formatRemainingLabel(phase, remainingMs)}
            </div>
            <button className="cp-button-primary px-5 py-3 text-sm">Start race</button>
            <button className="cp-button-secondary px-5 py-3 text-sm">Stop</button>
          </div>
        </div>

        {snapshot ? (
          <RaceCanvas snapshot={snapshot} previousSnapshot={previousSnapshot} />
        ) : (
          <div className="flex h-[360px] items-center justify-center rounded-[2rem] border border-dashed border-white/15 bg-slate-950/60 text-center text-slate-400">
            Race view arms on countdown. Use the lobby preview to review pre-game layout.
          </div>
        )}

        {podiumNames ? (
          <div className="mt-6 rounded-[1.75rem] border border-amber-300/20 bg-amber-400/10 p-5">
            <div className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Podium</div>
            <div className="mt-3 text-2xl font-black text-white">{podiumNames.join(" • ")}</div>
            <button className="cp-button-secondary mt-4 px-4 py-2 text-sm">Open results</button>
          </div>
        ) : null}
      </div>

      <Leaderboard players={players} title={phase === "finished" ? "Final standings" : "Live standings"} />
    </div>
  );
}

function PlayerLivePreview({ snapshot, phase, remainingMs }: { snapshot: SnapshotEvent; phase: string; remainingMs: number }) {
  const me = snapshot.players[0];
  const leaderDistance = snapshot.players[0]?.d ?? 1;
  const progress = Math.min((me.d / Math.max(leaderDistance, 1)) * 100, 100);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <section className="cp-card-dark p-6 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Phone Controller</p>
        <h1 className="mt-3 text-4xl font-black text-white">{me.name}</h1>
        <p className="mt-2 text-sm text-slate-400">Session DEMO5 • Socket open • Phase {phase}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-slate-200">
          <span className="inline-block size-3 rounded-full" style={{ backgroundColor: getPlayerColorHex(me.color) }} />
          {PLAYER_COLOR_PRESETS.find((preset) => preset.id === me.color)?.label ?? "Color"}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Rank</span>
            <span className="text-lg font-semibold text-white">{me.r}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
            <span>Distance</span>
            <span className="text-lg font-semibold text-cyan-200">{me.d.toFixed(1)}m</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
            <span>Remaining</span>
            <span className="text-lg font-semibold text-white">{formatRemainingLabel(phase, remainingMs)}</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <button className="mt-6 inline-flex min-h-56 w-full items-center justify-center rounded-[2.4rem] bg-gradient-to-br from-cyan-200 via-sky-300 to-blue-500 px-4 py-10 text-4xl font-black uppercase tracking-[0.2em] text-slate-950 shadow-2xl shadow-cyan-500/30">
          {phase === "live" ? "Tap" : phase === "countdown" ? "Ready" : "Finished"}
        </button>
      </section>
    </div>
  );
}

function PlayerResultsPreview() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PlayerLivePreview snapshot={previewSprintSnapshot} phase="finished" remainingMs={0} />

      <section className="cp-card-dark border-amber-300/20 bg-[linear-gradient(180deg,rgba(120,53,15,0.28),rgba(8,18,37,0.84))] p-6">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Match complete</p>
        <h2 className="mt-2 text-2xl font-black text-white">Top finishers</h2>
        <div className="mt-4 space-y-2">
          {previewFinishedEvent.standings.slice(0, 5).map((standing) => (
            <div key={standing.playerId} className="flex items-center justify-between rounded-2xl bg-slate-950/50 px-4 py-3">
              <span className="font-semibold text-white">
                {standing.rank}. {standing.name}
              </span>
              <span className="text-sm text-cyan-200">{standing.distance.toFixed(1)}m</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ResultsPreviewCard() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="cp-card-dark p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Match result</p>
        <h1 className="mt-3 text-4xl font-black text-white">Session {previewMatchResult.code}</h1>
        <p className="mt-4 text-slate-300">
          {previewMatchResult.playerCount} players • {Math.round(previewMatchResult.durationMs / 1000)} second race • Winning distance{" "}
          {previewMatchResult.stats.winningDistance.toFixed(1)}m
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Winners</div>
            <div className="mt-2 text-2xl font-black text-white">{previewMatchResult.winners.length}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Total taps</div>
            <div className="mt-2 text-2xl font-black text-white">{previewMatchResult.stats.totalTaps}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Average taps</div>
            <div className="mt-2 text-2xl font-black text-white">{previewMatchResult.stats.averageTapsPerPlayer.toFixed(1)}</div>
          </div>
        </div>
      </section>

      <Leaderboard players={previewMatchResult.standings} title="Final standings" />
    </div>
  );
}

export function DevScreensPage() {
  const [joinCode, setJoinCode] = useState("DEMO5");
  const [name, setName] = useState("Ava");
  const [color, setColor] = useState<PlayerColorId>("cyan");

  const noopSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <div className="space-y-12">
      <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-400/10 p-6">
        <p className="cp-dev-text text-sm uppercase tracking-[0.35em]">Dev Preview</p>
        <h1 className="cp-dev-text mt-3 text-4xl font-black">TapDash screen gallery</h1>
        <p className="cp-dev-subtext mt-3 max-w-3xl">
          Review the redesigned onboarding and host screens without creating a live session. These are fixture-driven snapshots for visual iteration.
        </p>
      </section>

      <DevSection title="Landing" description="Decision-first home screen with separate host and join paths.">
        <LandingPreview />
      </DevSection>

      <DevSection title="Join code" description="Single-purpose code entry before name and color.">
        <JoinCodePanel code={joinCode} onCodeChange={setJoinCode} onSubmit={noopSubmit} />
      </DevSection>

      <DevSection title="Player identity" description="Friendly name-and-color step after the code is entered.">
        <PlayerIdentityPanel
          code="DEMO5"
          name={name}
          color={color}
          onNameChange={setName}
          onColorChange={setColor}
          onSubmit={noopSubmit}
          ctaLabel="Enter game"
        />
      </DevSection>

      <DevSection title="Host lobby" description="Game code hero, readiness state, and friendlier roster cards before the race begins.">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <HostLobbyStage
            code="DEMO5"
            playerCount={previewRoster.length}
            playerLimit={30}
            minimumPlayers={2}
            canStart
            joiningLabel="localhost:4177/join"
            statusText="Socket open. Start as soon as at least 2 players are ready."
          />
          <LobbyRosterGrid players={previewRoster} />
        </div>
      </DevSection>

      <DevSection title="Host countdown" description="Shared screen during the final countdown before input starts counting.">
        <HostRacePreview
          code="DEMO5"
          phase="countdown"
          remainingMs={previewCountdownSnapshot.remainingMs}
          players={previewCountdownSnapshot.players}
          snapshot={previewCountdownSnapshot}
          previousSnapshot={previewCountdownSnapshot}
        />
      </DevSection>

      <DevSection title="Host live race" description="Mid-race state with active standings, motion interpolation, and leaderboard updates.">
        <HostRacePreview
          code="DEMO5"
          phase="live"
          remainingMs={previewLiveSnapshot.remainingMs}
          players={previewLiveSnapshot.players}
          snapshot={previewLiveSnapshot}
          previousSnapshot={previewLivePreviousSnapshot}
        />
      </DevSection>

      <DevSection title="Host podium" description="End-of-match state with the podium callout and final standings.">
        <HostRacePreview
          code="DEMO5"
          phase="finished"
          remainingMs={0}
          players={previewFinishedEvent.standings}
          snapshot={previewSprintSnapshot}
          previousSnapshot={previewLiveSnapshot}
          podiumNames={previewFinishedEvent.standings.slice(0, 3).map((standing) => standing.name)}
        />
      </DevSection>

      <DevSection title="Player live controller" description="Tap surface, player rank card, and controller chrome during the race.">
        <PlayerLivePreview snapshot={previewLiveSnapshot} phase="live" remainingMs={previewLiveSnapshot.remainingMs} />
      </DevSection>

      <DevSection title="Player post-match" description="Controller end state with final standings and the disabled tap button.">
        <PlayerResultsPreview />
      </DevSection>

      <DevSection title="Results page" description="Standalone match summary screen after the host opens results.">
        <ResultsPreviewCard />
      </DevSection>
    </div>
  );
}
