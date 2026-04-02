import { useState } from "react";

import {
  PLAYER_COLOR_PRESETS,
  getPlayerColorHex,
  type PlayerColorId,
  type SnapshotEvent
} from "@crowdplay/protocol";

import { ColorPresetPicker } from "../components/ColorPresetPicker";
import { Leaderboard } from "../components/Leaderboard";
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
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">{title}</p>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  );
}

function HostPreviewCard({
  code,
  phase,
  remainingMs,
  rosterTitle,
  rosterPlayers,
  snapshot,
  previousSnapshot,
  podiumNames
}: {
  code: string;
  phase: string;
  remainingMs: number;
  rosterTitle: string;
  rosterPlayers: Parameters<typeof Leaderboard>[0]["players"];
  snapshot: SnapshotEvent | null;
  previousSnapshot: SnapshotEvent | null;
  podiumNames?: string[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Host Screen</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">{code}</h1>
            <p className="mt-2 text-sm text-slate-400">Socket open • Phase {phase}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-300">
              Remaining {formatRemainingLabel(phase, remainingMs)}
            </div>
            <button className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">
              Start race
            </button>
            <button className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white">
              Stop
            </button>
          </div>
        </div>

        {snapshot ? (
          <RaceCanvas snapshot={snapshot} previousSnapshot={previousSnapshot} />
        ) : (
          <div className="flex h-[360px] items-center justify-center rounded-[2rem] border border-dashed border-white/15 bg-slate-950/60 text-center text-slate-400">
            Race view arms on countdown. Use the roster panel to review the lobby layout.
          </div>
        )}

        {podiumNames ? (
          <div className="mt-6 rounded-[1.75rem] border border-amber-300/20 bg-amber-400/10 p-5">
            <div className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Podium</div>
            <div className="mt-3 text-2xl font-black text-white">{podiumNames.join(" • ")}</div>
            <button className="mt-4 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              Open results
            </button>
          </div>
        ) : null}
      </div>

      <Leaderboard players={rosterPlayers} title={rosterTitle} />
    </div>
  );
}

function PlayerJoinPreview() {
  const [name, setName] = useState("Ava");
  const [color, setColor] = useState<PlayerColorId>("cyan");

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Join TapDash</p>
      <h1 className="mt-3 text-3xl font-black text-white">Session DEMO5</h1>
      <p className="mt-3 text-slate-300">Enter your display name and get ready to tap on the host&apos;s countdown.</p>

      <form className="mt-6 space-y-4">
        <input
          className="w-full rounded-[1.5rem] border border-white/10 bg-slate-950/80 px-4 py-4 text-lg text-white outline-none"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          maxLength={24}
        />
        <ColorPresetPicker selectedColor={color} onChange={setColor} />
        <button className="inline-flex w-full items-center justify-center rounded-[1.5rem] bg-cyan-400 px-4 py-4 font-semibold text-slate-950">
          Join game
        </button>
      </form>
    </div>
  );
}

function PlayerLivePreview({ snapshot, phase, remainingMs }: { snapshot: SnapshotEvent; phase: string; remainingMs: number }) {
  const me = snapshot.players[0];
  const leaderDistance = snapshot.players[0]?.d ?? 1;
  const progress = Math.min((me.d / Math.max(leaderDistance, 1)) * 100, 100);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Phone Controller</p>
        <h1 className="mt-3 text-4xl font-black text-white">{me.name}</h1>
        <p className="mt-2 text-sm text-slate-400">Session DEMO5 • Socket open • Phase {phase}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
          <span className="inline-block size-3 rounded-full" style={{ backgroundColor: getPlayerColorHex(me.color) }} />
          {PLAYER_COLOR_PRESETS.find((preset) => preset.id === me.color)?.label ?? "Color"}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4">
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

        <button
          className="mt-6 inline-flex min-h-56 w-full items-center justify-center rounded-[2rem] bg-gradient-to-br from-cyan-300 to-blue-500 px-4 py-10 text-4xl font-black uppercase tracking-[0.2em] text-slate-950 shadow-2xl shadow-cyan-500/30"
        >
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

      <section className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-6">
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
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
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
  return (
    <div className="space-y-12">
      <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-400/10 p-6">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-100">Dev Preview</p>
        <h1 className="mt-3 text-4xl font-black text-white">TapDash screen gallery</h1>
        <p className="mt-3 max-w-3xl text-slate-200">
          Use this page to iterate on host, player, and results UI without creating a live session. Everything here is fixture-driven and only
          available in local development builds.
        </p>
      </section>

      <DevSection title="Host lobby" description="Lobby roster and host controls before the race begins.">
        <HostPreviewCard code="DEMO5" phase="lobby" remainingMs={0} rosterTitle="Lobby roster" rosterPlayers={previewRoster} snapshot={null} previousSnapshot={null} />
      </DevSection>

      <DevSection title="Host countdown" description="Shared screen during the final countdown before input starts counting.">
        <HostPreviewCard
          code="DEMO5"
          phase="countdown"
          remainingMs={previewCountdownSnapshot.remainingMs}
          rosterTitle="Live standings"
          rosterPlayers={previewCountdownSnapshot.players}
          snapshot={previewCountdownSnapshot}
          previousSnapshot={previewCountdownSnapshot}
        />
      </DevSection>

      <DevSection title="Host live race" description="Mid-race state with active standings, motion interpolation, and leaderboard updates.">
        <HostPreviewCard
          code="DEMO5"
          phase="live"
          remainingMs={previewLiveSnapshot.remainingMs}
          rosterTitle="Live standings"
          rosterPlayers={previewLiveSnapshot.players}
          snapshot={previewLiveSnapshot}
          previousSnapshot={previewLivePreviousSnapshot}
        />
      </DevSection>

      <DevSection title="Host podium" description="End-of-match state with the podium callout and final standings.">
        <HostPreviewCard
          code="DEMO5"
          phase="finished"
          remainingMs={0}
          rosterTitle="Final standings"
          rosterPlayers={previewFinishedEvent.standings}
          snapshot={previewSprintSnapshot}
          previousSnapshot={previewLiveSnapshot}
          podiumNames={previewFinishedEvent.standings.slice(0, 3).map((standing) => standing.name)}
        />
      </DevSection>

      <DevSection title="Player join" description="Phone controller join form with preset color selection.">
        <PlayerJoinPreview />
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
