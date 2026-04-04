import { FormEvent, useState } from "react";

import {
  type GoldRushPlayerStateEvent,
  type GoldRushSnapshotEvent,
  type MatchResult,
  type PlayerAvatarId,
  type PlayerStateEvent,
  type QuizDashSnapshotEvent,
  type SnapshotEvent
} from "@crowdplay/protocol";

import { AvatarBadge } from "../components/AvatarBadge";
import { ChaosFeed } from "../components/ChaosFeed";
import { HostLobbyStage } from "../components/HostLobbyStage";
import { HostPodium } from "../components/HostPodium";
import { JoinCodePanel } from "../components/JoinCodePanel";
import { Leaderboard } from "../components/Leaderboard";
import { LobbyRosterGrid } from "../components/LobbyRosterGrid";
import { PlayerIdentityPanel } from "../components/PlayerIdentityPanel";
import { RaceCanvas } from "../components/RaceCanvas";
import {
  previewChaosEvents,
  previewGoldRushCountdownSnapshot,
  previewGoldRushFinishedEvent,
  previewGoldRushLiveSnapshot,
  previewGoldRushMatchResult,
  previewGoldRushPlayerChestState,
  previewGoldRushPlayerEffectState,
  previewGoldRushPlayerLockoutState,
  previewGoldRushPlayerQuestionState,
  previewGoldRushPlayerTargetState,
  previewGoldRushRoster,
  previewQuizDashPlayerChestState,
  previewQuizDashPlayerEffectState,
  previewQuizDashPlayerQuestionState,
  previewQuizDashPlayerTargetState,
  previewQuizDashFinishedEvent,
  previewQuizDashLiveSnapshot,
  previewQuizDashMatchResult,
  previewQuizDashPreviousSnapshot,
  previewQuizDashRoster
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
  const durationOptions = ["1 min", "2 min", "3 min"];

  return (
    <div className="cp-card-light mx-auto max-w-xl p-8 sm:p-10">
      <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Pick match length</h1>
      <p className="mt-3 text-base text-slate-600 sm:text-lg">Gold Rush is selected. Choose how long the room should run.</p>

      <div className="mt-8 space-y-3">
          {durationOptions.map((option, index) => (
            <div
              key={option}
              className={`rounded-[1.4rem] border px-5 py-4 text-center text-lg font-black uppercase tracking-[0.18em] ${
                index === 1
                  ? "border-sky-300 bg-sky-100 text-sky-800 shadow-[0_10px_24px_rgba(56,189,248,0.14)]"
                  : "border-slate-200 bg-white/[0.88] text-slate-600"
              }`}
            >
              {option}
            </div>
          ))}
      </div>

      <div className="mt-8 space-y-4">
        <button className="cp-button-primary w-full text-base font-black">Create room</button>
        <button className="cp-button-link w-full text-sm">Change game</button>
      </div>
    </div>
  );
}

function GoldRushHostPreview({ snapshot }: { snapshot: GoldRushSnapshotEvent }) {
  return (
    <div className="grid gap-6 xl:h-[calc(100vh-3rem)] xl:grid-cols-[1.15fr_0.85fr]">
      <div className="flex min-h-0 flex-col gap-6">
        <ChaosFeed events={previewChaosEvents} className="flex-1" headerBadge={`Remaining ${formatRemainingLabel(snapshot.phase, snapshot.remainingMs)}`} />
      </div>

      <Leaderboard players={snapshot.players} title="Live standings" scrollable showSecondaryText={false} showMetricRank={false} />
    </div>
  );
}

function QuizDashHostPreview({
  snapshot,
  previousSnapshot
}: {
  snapshot: QuizDashSnapshotEvent;
  previousSnapshot: QuizDashSnapshotEvent;
}) {
  return (
    <div className="grid gap-6 xl:min-h-[calc(100vh-3rem)] xl:grid-cols-[1.4fr_0.6fr]">
      <RaceCanvas snapshot={snapshot} previousSnapshot={previousSnapshot} className="min-h-[420px] flex-1" lanePlayerIds={snapshot.players.map((player) => player.id)} />
      <Leaderboard players={snapshot.players} title="Live standings" scrollable />
    </div>
  );
}

function PlayerControllerPreview({
  playerState,
  snapshot
}: {
  playerState: PlayerStateEvent;
  snapshot: SnapshotEvent;
}) {
  const me = snapshot.players.find((player) => player.id === playerState.playerId);
  const accentAvatarId = me?.avatarId ?? "fox";
  const goldRushState = playerState.gameType === "goldrush" ? (playerState as GoldRushPlayerStateEvent) : null;
  const chestState = goldRushState ?? playerState;
  const lockoutRemainingMs = goldRushState?.lockoutEndsAt ? Math.max(0, goldRushState.lockoutEndsAt - Date.now()) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="cp-card-dark p-6 text-center">
        <div className="flex items-center justify-center gap-4">
          <AvatarBadge avatarId={accentAvatarId} size={40} />
          <h1 className="text-4xl font-black text-white">Ava</h1>
        </div>

        {playerState.recentOutcome ? (
          <div className="mt-6 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/10 px-5 py-4 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">{playerState.recentOutcome.title}</div>
            <div className="mt-2 text-sm text-slate-200">{playerState.recentOutcome.detail}</div>
          </div>
        ) : null}

        {chestState.pendingTargetPick ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-200">Pick a target</div>
            <h2 className="mt-3 text-2xl font-black text-white">
              {playerState.gameType === "goldrush" ? "Choose one of the top vaults." : "Choose one of the top racers."}
            </h2>
            <div className="mt-6 grid gap-3">
              {chestState.availableTargets.map((target) => (
                <div key={target.playerId} className="flex items-center justify-between rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-5 py-4">
                  <span className="font-semibold text-white">{target.name}</span>
                  <span className="text-sm font-semibold text-amber-200">Pick</span>
                </div>
              ))}
            </div>
          </div>
        ) : chestState.pendingChestPick ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-sky-200">Pick a chest</div>
            <h2 className="mt-3 text-2xl font-black text-white">Choose 1 of 3 hidden chests.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="rounded-[1.8rem] border border-amber-200/60 bg-[linear-gradient(180deg,rgba(254,243,199,0.96),rgba(253,230,138,0.82))] px-5 py-7 text-center text-lg font-black text-amber-950">
                  Chest {index}
                </div>
              ))}
            </div>
          </div>
        ) : goldRushState?.lockoutEndsAt ? (
          <div className="mt-6 rounded-[1.75rem] border border-rose-300/20 bg-rose-400/10 p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-rose-200">Locked out</div>
            <h2 className="mt-3 text-2xl font-black text-white">Next question unlocks in {Math.max(1, Math.ceil(lockoutRemainingMs / 1000))}s.</h2>
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

function ResultsPreviewCard({ result }: { result: MatchResult }) {
  const isGoldRush = result.gameType === "goldrush";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="cp-card-dark p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Match result</p>
        <h1 className="mt-3 text-4xl font-black text-white">Session {result.code}</h1>
        <p className="mt-4 text-slate-300">
          {result.playerCount} players • {Math.round(result.durationMs / 1000)} second {isGoldRush ? "match" : "race"} •{" "}
          {isGoldRush ? `Winning vault ${result.stats.winningGold} gold` : `Winning distance ${result.stats.winningDistance.toFixed(1)}m`}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Winners</div>
            <div className="mt-2 text-2xl font-black text-white">{result.winners.length}</div>
          </div>
          {isGoldRush ? (
            <>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Correct answers</div>
                <div className="mt-2 text-2xl font-black text-white">{result.stats.totalCorrectAnswers}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Chaos chests</div>
                <div className="mt-2 text-2xl font-black text-white">{result.stats.totalChaosTriggers}</div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Correct answers</div>
                <div className="mt-2 text-2xl font-black text-white">{result.stats.totalCorrectAnswers}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Wrong answers</div>
                <div className="mt-2 text-2xl font-black text-white">{result.stats.totalWrongAnswers}</div>
              </div>
            </>
          )}
        </div>
      </section>

      <Leaderboard players={result.standings} title="Final standings" />
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
        <h1 className="cp-dev-text mt-3 text-4xl font-black">CrowdPlay screen gallery</h1>
        <p className="cp-dev-subtext mt-3 max-w-3xl">
          Review both live games, their host states, player controllers, and result screens without creating a session.
        </p>
      </section>

      <DevSection title="Landing" description="Decision-first home screen with separate host and join paths.">
        <LandingPreview />
      </DevSection>

      <DevSection title="Host game picker" description="Two real game tiles now lead to distinct modes.">
        <HostGamesPreview />
      </DevSection>

      <DevSection title="Join code" description="Single-purpose code entry before name and avatar selection.">
        <JoinCodePanel code={joinCode} onCodeChange={setJoinCode} onSubmit={noopSubmit} />
      </DevSection>

      <DevSection title="Player onboarding" description="Focused name and avatar flow before joining the room.">
        <div className="grid gap-6 lg:grid-cols-2">
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
        </div>
      </DevSection>

      <DevSection title="Gold Rush lobby" description="Countdown and roster before the vault chaos begins.">
        <div className="space-y-6">
          <HostLobbyStage code="GOLD5" gameLabel="Gold Rush" />
          <LobbyRosterGrid players={previewGoldRushRoster} />
          <HostLobbyStage
            code="GOLD5"
            gameLabel="Gold Rush"
            phase="countdown"
            remainingMs={previewGoldRushCountdownSnapshot.remainingMs}
            playerCount={previewGoldRushRoster.length}
          />
        </div>
      </DevSection>

      <DevSection title="Gold Rush live" description="Gold standings and a chaos feed replace the race track.">
        <GoldRushHostPreview snapshot={previewGoldRushLiveSnapshot} />
      </DevSection>

      <DevSection title="QuizDash live" description="The race canvas stays in place while question answers and chest swings move racers around.">
        <QuizDashHostPreview snapshot={previewQuizDashLiveSnapshot} previousSnapshot={previewQuizDashPreviousSnapshot} />
      </DevSection>

      <DevSection title="Podiums" description="Each game ends with its own scoring language but shares the same podium treatment.">
        <div className="grid gap-6 lg:grid-cols-2">
          <HostPodium standings={previewGoldRushFinishedEvent.standings} action={<button className="cp-button-secondary px-4 py-2 text-sm">Open results</button>} />
          <HostPodium standings={previewQuizDashFinishedEvent.standings} action={<button className="cp-button-secondary px-4 py-2 text-sm">Open results</button>} />
        </div>
      </DevSection>

      <DevSection title="Gold Rush player states" description="Question, chest, target, lockout, and recent-outcome flows.">
        <div className="space-y-8">
          <PlayerControllerPreview playerState={previewGoldRushPlayerQuestionState} snapshot={previewGoldRushLiveSnapshot} />
          <PlayerControllerPreview playerState={previewGoldRushPlayerChestState} snapshot={previewGoldRushLiveSnapshot} />
          <PlayerControllerPreview playerState={previewGoldRushPlayerTargetState} snapshot={previewGoldRushLiveSnapshot} />
          <PlayerControllerPreview playerState={previewGoldRushPlayerLockoutState} snapshot={previewGoldRushLiveSnapshot} />
          <PlayerControllerPreview playerState={previewGoldRushPlayerEffectState} snapshot={previewGoldRushLiveSnapshot} />
        </div>
      </DevSection>

      <DevSection title="QuizDash player states" description="Race mode now shares the same question, chest, target, and recent-outcome flow.">
        <div className="space-y-8">
          <PlayerControllerPreview playerState={previewQuizDashPlayerQuestionState} snapshot={previewQuizDashLiveSnapshot} />
          <PlayerControllerPreview playerState={previewQuizDashPlayerChestState} snapshot={previewQuizDashLiveSnapshot} />
          <PlayerControllerPreview playerState={previewQuizDashPlayerTargetState} snapshot={previewQuizDashLiveSnapshot} />
          <PlayerControllerPreview playerState={previewQuizDashPlayerEffectState} snapshot={previewQuizDashLiveSnapshot} />
        </div>
      </DevSection>

      <DevSection title="Results" description="Separate result summaries for both Gold Rush and QuizDash.">
        <div className="space-y-8">
          <ResultsPreviewCard result={previewGoldRushMatchResult} />
          <ResultsPreviewCard result={previewQuizDashMatchResult} />
        </div>
      </DevSection>
    </div>
  );
}
