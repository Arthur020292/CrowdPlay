import { FormEvent, useState } from "react";

import { getPlayerAccentHex, getPlayerAvatarPreset, type PlayerAvatarId, type PlayerStateEvent, type SnapshotEvent } from "@crowdplay/protocol";

import { AvatarBadge } from "../components/AvatarBadge";
import { HostLobbyStage } from "../components/HostLobbyStage";
import { HostPodium } from "../components/HostPodium";
import { JoinCodePanel } from "../components/JoinCodePanel";
import { Leaderboard } from "../components/Leaderboard";
import { LobbyRosterGrid } from "../components/LobbyRosterGrid";
import { PlayerIdentityPanel } from "../components/PlayerIdentityPanel";
import { RaceCanvas } from "../components/RaceCanvas";
import {
  previewCountdownSnapshot,
  previewCrowdedFinishedEvent,
  previewCrowdedRoster,
  previewFinishedEvent,
  previewLiveCrowdedPreviousSnapshot,
  previewLiveCrowdedSnapshot,
  previewMatchResult,
  previewPlayerEffectState,
  previewPlayerLockoutState,
  previewPlayerQuestionState,
  previewPlayerRewardState,
  previewRoster
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
      <section className="w-full max-w-4xl px-8 py-12 text-center sm:px-12 sm:py-16">
        <h1 className="mx-auto max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">Choose how you want to play.</h1>
        <div className="mt-8 grid gap-4 sm:mx-auto sm:max-w-2xl sm:grid-cols-2">
          <button className="cp-button-primary min-h-[4.75rem] text-lg font-black">Host a Game</button>
          <button className="cp-button-secondary min-h-[4.75rem] text-lg font-black">Join a Game</button>
        </div>
      </section>
    </div>
  );
}

function HostGamesPreview() {
  return (
    <div>
      <span className="cp-eyebrow cp-eyebrow-light">Choose a game</span>
      <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Pick what the room will play.</h1>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => {
          const isLive = index === 0;
          return (
            <div key={index} className={`rounded-[1.9rem] border p-5 text-left ${isLive ? "border-sky-200/90 bg-white/[0.76] shadow-[0_20px_40px_rgba(56,189,248,0.10)] backdrop-blur-[10px]" : "border-slate-200/80 bg-white/[0.54] backdrop-blur-[10px]"}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.26em] ${isLive ? "bg-cyan-100/90 text-cyan-700" : "bg-slate-200/90 text-slate-500"}`}>
                  {isLive ? "Live" : "Coming soon"}
                </span>
                <span className={`inline-flex size-11 items-center justify-center rounded-[1rem] border-4 text-lg font-black ${isLive ? "border-sky-300 bg-gradient-to-b from-cyan-200 to-sky-400 text-sky-900" : "border-slate-300 bg-white/[0.78] text-slate-400"}`}>
                  {isLive ? "QD" : "?"}
                </span>
              </div>
              <div className="mt-5 text-2xl font-black text-slate-950">{isLive ? "QuizDash" : "Coming soon"}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{isLive ? "Answer fast, pick rewards, and survive the chaos." : "More CrowdPlay party games are on the way."}</p>
              <div className="mt-5">
                <span className={isLive ? "cp-button-primary min-h-[3.8rem] min-w-[10rem] text-base font-black" : "inline-flex min-h-[3.8rem] min-w-[10rem] items-center justify-center rounded-[1.3rem] border border-slate-200/80 bg-white/[0.58] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400"}>
                  {isLive ? "Play QuizDash" : "Soon"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HostRacePreview({
  phase,
  remainingMs,
  players,
  snapshot,
  previousSnapshot,
  lanePlayerIds,
  podiumStandings
}: {
  phase: string;
  remainingMs: number;
  players: Parameters<typeof Leaderboard>[0]["players"];
  snapshot: SnapshotEvent | null;
  previousSnapshot: SnapshotEvent | null;
  lanePlayerIds?: string[];
  podiumStandings?: typeof previewFinishedEvent.standings;
}) {
  return (
    <div className="grid gap-6 xl:min-h-[calc(100vh-3rem)] xl:grid-cols-[1.4fr_0.6fr]">
      <div className="flex min-h-0 flex-col">
        {podiumStandings ? (
          <HostPodium
            standings={podiumStandings}
            action={<button className="cp-button-secondary px-4 py-2 text-sm">Open results</button>}
          />
        ) : snapshot ? (
          <RaceCanvas
            snapshot={snapshot}
            previousSnapshot={previousSnapshot}
            className="min-h-[420px] flex-1"
            lanePlayerIds={lanePlayerIds}
          />
        ) : null}
      </div>

      <Leaderboard
        players={players}
        title={phase === "finished" ? "Final standings" : "Live standings"}
        scrollable={phase === "live" || phase === "finished"}
        headerActions={
          phase === "live" ? (
            <>
              <div className="rounded-full border border-slate-200 bg-white/[0.84] px-4 py-2 text-sm font-medium text-slate-600">
                Remaining {formatRemainingLabel(phase, remainingMs)}
              </div>
              <button className="cp-button-secondary px-5 py-3 text-sm">Stop</button>
            </>
          ) : null
        }
      />
    </div>
  );
}

function PlayerGamePreview({
  playerState,
  snapshot,
  phase,
  remainingMs
}: {
  playerState: PlayerStateEvent;
  snapshot: SnapshotEvent | null;
  phase: string;
  remainingMs: number;
}) {
  const me = snapshot?.players.find((player) => player.id === playerState.playerId);
  const leaderDistance = snapshot?.players[0]?.d ?? 1;
  const progress = Math.min((playerState.distance / Math.max(leaderDistance, 1)) * 100, 100);
  const accentAvatarId = me?.avatarId ?? "fox";
  const lockoutRemainingMs = playerState.lockoutEndsAt ? Math.max(0, playerState.lockoutEndsAt - Date.now()) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="cp-card-dark p-6 text-center">
        <h1 className="text-4xl font-black text-white">Ava</h1>
        <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-slate-200">
          <AvatarBadge avatarId={accentAvatarId} size={40} />
          {getPlayerAvatarPreset(accentAvatarId).label}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-[1.25rem] bg-slate-950/50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Rank</div>
              <div className="mt-2 text-2xl font-black text-white">{playerState.rank}</div>
            </div>
            <div className="rounded-[1.25rem] bg-slate-950/50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Distance</div>
              <div className="mt-2 text-2xl font-black" style={{ color: getPlayerAccentHex(accentAvatarId) }}>
                {playerState.distance.toFixed(1)}m
              </div>
            </div>
            <div className="rounded-[1.25rem] bg-slate-950/50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Correct</div>
              <div className="mt-2 text-2xl font-black text-white">{playerState.correctAnswers}</div>
            </div>
            <div className="rounded-[1.25rem] bg-slate-950/50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Remaining</div>
              <div className="mt-2 text-2xl font-black text-white">{formatRemainingLabel(phase, remainingMs)}</div>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: getPlayerAccentHex(accentAvatarId) }} />
          </div>
        </div>

        {playerState.recentOutcome ? (
          <div className="mt-6 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/10 px-5 py-4 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">{playerState.recentOutcome.title}</div>
            <div className="mt-2 text-sm text-slate-200">{playerState.recentOutcome.detail}</div>
          </div>
        ) : null}

        {phase === "finished" ? (
          <div className="mt-6 rounded-[1.75rem] border border-amber-300/20 bg-[linear-gradient(180deg,rgba(120,53,15,0.28),rgba(8,18,37,0.84))] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-200/80">Match complete</div>
            <h2 className="mt-3 text-2xl font-black text-white">The race is over.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Check the host screen for the podium or scroll down here for the final standings.</p>
          </div>
        ) : playerState.pendingRewardChoice ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-sky-200">Choose your reward</div>
            <h2 className="mt-3 text-2xl font-black text-white">Play it safe or open chaos.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button className="cp-button-primary min-h-[4.5rem] text-base font-black">Move forward</button>
              <button className="cp-button-secondary min-h-[4.5rem] text-base font-black">Random effect</button>
            </div>
          </div>
        ) : playerState.lockoutEndsAt ? (
          <div className="mt-6 rounded-[1.75rem] border border-rose-300/20 bg-rose-400/10 p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-rose-200">Locked out</div>
            <h2 className="mt-3 text-2xl font-black text-white">Next question unlocks in {Math.max(1, Math.ceil(lockoutRemainingMs / 1000))}s.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Wrong answers trigger a short freeze before the next question goes live.</p>
          </div>
        ) : playerState.currentQuestion ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">
              {playerState.currentQuestion.format === "boolean" ? "True or false" : "Multiple choice"}
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">{playerState.currentQuestion.prompt}</h2>
            <div className="mt-6 grid gap-3">
              {playerState.currentQuestion.options.map((option) => (
                <div key={option.id} className="rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-5 py-4 text-base font-semibold text-white">
                  {option.label}
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
          {previewMatchResult.playerCount} players • {Math.round(previewMatchResult.durationMs / 1000)} second race • Winning distance {previewMatchResult.stats.winningDistance.toFixed(1)}m
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Winners</div>
            <div className="mt-2 text-2xl font-black text-white">{previewMatchResult.winners.length}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Correct answers</div>
            <div className="mt-2 text-2xl font-black text-white">{previewMatchResult.stats.totalCorrectAnswers}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Chaos effects</div>
            <div className="mt-2 text-2xl font-black text-white">{previewMatchResult.stats.totalEffectsTriggered}</div>
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
  const [avatarId, setAvatarId] = useState<PlayerAvatarId>("fox");
  const noopSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <div className="space-y-12">
      <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-400/10 p-6">
        <p className="cp-dev-text text-sm uppercase tracking-[0.35em]">Dev Preview</p>
        <h1 className="cp-dev-text mt-3 text-4xl font-black">QuizDash screen gallery</h1>
        <p className="cp-dev-subtext mt-3 max-w-3xl">
          Review the quiz-race onboarding, host states, player question flow, and podium/results screens without creating a live session.
        </p>
      </section>

      <DevSection title="Landing" description="Decision-first home screen with separate host and join paths.">
        <LandingPreview />
      </DevSection>

      <DevSection title="Host game picker" description="QuizDash leads the host flow, with the rest reserved for future games.">
        <HostGamesPreview />
      </DevSection>

      <DevSection title="Join code" description="Single-purpose code entry before name and avatar selection.">
        <JoinCodePanel code={joinCode} onCodeChange={setJoinCode} onSubmit={noopSubmit} />
      </DevSection>

      <DevSection title="Player name" description="Focused first step for choosing a display name.">
        <PlayerIdentityPanel
          code="DEMO5"
          name={name}
          avatarId={avatarId}
          step="name"
          onNameChange={setName}
          onAvatarChange={setAvatarId}
          onContinue={() => undefined}
          onBack={() => undefined}
          onSubmit={noopSubmit}
          ctaLabel="Continue"
        />
      </DevSection>

      <DevSection title="Player avatar" description="Second step for choosing an avatar before entering the match.">
        <PlayerIdentityPanel
          code="DEMO5"
          name={name}
          avatarId={avatarId}
          step="avatar"
          onNameChange={setName}
          onAvatarChange={setAvatarId}
          onContinue={() => undefined}
          onBack={() => undefined}
          onSubmit={noopSubmit}
          ctaLabel="Enter game"
        />
      </DevSection>

      <DevSection title="Host lobby" description="Game code hero and roster before the quiz race begins.">
        <div className="space-y-6">
          <HostLobbyStage code="DEMO5" gameLabel="QuizDash" />
          <LobbyRosterGrid players={previewRoster} />
        </div>
      </DevSection>

      <DevSection title="Host countdown" description="Countdown stays in the lobby, then players begin answering on their own devices.">
        <div className="space-y-6">
          <HostLobbyStage
            code="DEMO5"
            gameLabel="QuizDash"
            phase="countdown"
            remainingMs={previewCountdownSnapshot.remainingMs}
            playerCount={previewRoster.length}
          />
          <LobbyRosterGrid players={previewRoster} />
        </div>
      </DevSection>

      <DevSection title="Host live race" description="Mid-race state with stable lanes, live standings, and a larger simulated field.">
        <HostRacePreview
          phase="live"
          remainingMs={previewLiveCrowdedSnapshot.remainingMs}
          players={previewLiveCrowdedSnapshot.players}
          snapshot={previewLiveCrowdedSnapshot}
          previousSnapshot={previewLiveCrowdedPreviousSnapshot}
          lanePlayerIds={previewCrowdedRoster.map((player) => player.id)}
        />
      </DevSection>

      <DevSection title="Host podium" description="End-of-match state with podium treatment and scrollable final standings.">
        <HostRacePreview
          phase="finished"
          remainingMs={0}
          players={previewCrowdedFinishedEvent.standings}
          snapshot={null}
          previousSnapshot={null}
          podiumStandings={previewCrowdedFinishedEvent.standings}
        />
      </DevSection>

      <DevSection title="Player question" description="Primary answering state for multiple choice and true/false prompts.">
        <PlayerGamePreview playerState={previewPlayerQuestionState} snapshot={previewLiveCrowdedSnapshot} phase="live" remainingMs={previewLiveCrowdedSnapshot.remainingMs} />
      </DevSection>

      <DevSection title="Player reward choice" description="Correct answers lead to a choice between safe progress and random chaos.">
        <PlayerGamePreview playerState={previewPlayerRewardState} snapshot={previewLiveCrowdedSnapshot} phase="live" remainingMs={previewLiveCrowdedSnapshot.remainingMs} />
      </DevSection>

      <DevSection title="Player lockout" description="Wrong answers trigger a temporary freeze before the next question unlocks.">
        <PlayerGamePreview playerState={previewPlayerLockoutState} snapshot={previewLiveCrowdedSnapshot} phase="live" remainingMs={previewLiveCrowdedSnapshot.remainingMs} />
      </DevSection>

      <DevSection title="Player chaos outcome" description="Random effects can steal, swap, trap, or launch a player forward.">
        <PlayerGamePreview playerState={previewPlayerEffectState} snapshot={previewLiveCrowdedSnapshot} phase="live" remainingMs={previewLiveCrowdedSnapshot.remainingMs} />
      </DevSection>

      <DevSection title="Player post-match" description="Controller end state after time runs out.">
        <PlayerGamePreview playerState={previewPlayerEffectState} snapshot={previewLiveCrowdedSnapshot} phase="finished" remainingMs={0} />
      </DevSection>

      <DevSection title="Results page" description="Standalone match summary screen after the host opens results.">
        <ResultsPreviewCard />
      </DevSection>
    </div>
  );
}
