import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  PROTOCOL_VERSION,
  coercePlayerAvatarId,
  getDefaultPlayerAvatar,
  getPlayerAccentHex,
  getPlayerAvatarPreset,
  type MatchFinishedEvent,
  type PlayerAvatarId,
  type PlayerStateEvent,
  type SnapshotEvent
} from "@crowdplay/protocol";

import { AvatarBadge } from "../components/AvatarBadge";
import { PlayerIdentityPanel } from "../components/PlayerIdentityPanel";
import { useSessionSocket } from "../hooks/useSessionSocket";
import { buildSessionSocketUrl, joinSession } from "../lib/api";
import { getPlayerSession, savePlayerSession } from "../lib/storage";
import { formatRemainingLabel } from "../lib/time";

function formatLockoutLabel(remainingMs: number): string {
  return `${Math.max(1, Math.ceil(remainingMs / 1000))}s`;
}

export function PlayPage() {
  const params = useParams();
  const code = params.code?.toUpperCase() ?? "";
  const stored = getPlayerSession(code);
  const storedName = stored?.name ?? "";

  const [name, setName] = useState(storedName);
  const [avatarId, setAvatarId] = useState<PlayerAvatarId>(coercePlayerAvatarId(stored?.avatarId, 0) ?? getDefaultPlayerAvatar());
  const [identityStep, setIdentityStep] = useState<"name" | "avatar">(storedName.trim() ? "avatar" : "name");
  const [playerId, setPlayerId] = useState(stored?.playerId ?? "");
  const [playerToken, setPlayerToken] = useState(stored?.playerToken ?? "");
  const [phase, setPhase] = useState("lobby");
  const [remainingMs, setRemainingMs] = useState(0);
  const [snapshot, setSnapshot] = useState<SnapshotEvent | null>(null);
  const [playerState, setPlayerState] = useState<PlayerStateEvent | null>(null);
  const [result, setResult] = useState<MatchFinishedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const socketUrl = useMemo(() => (playerToken ? buildSessionSocketUrl(code, playerToken) : null), [code, playerToken]);
  const { send } = useSessionSocket({
    enabled: Boolean(playerToken),
    url: socketUrl,
    onEvent(event) {
      switch (event.type) {
        case "join_ack":
          setPhase(event.phase);
          if (event.playerId) {
            setPlayerId(event.playerId);
          }
          setActionPending(false);
          break;
        case "phase_changed":
          setPhase(event.phase);
          setRemainingMs(event.remainingMs ?? event.countdownMs ?? 0);
          setActionPending(false);
          break;
        case "snapshot":
          setSnapshot(event);
          setPhase(event.phase);
          setRemainingMs(event.remainingMs);
          break;
        case "player_state":
          setPlayerState(event);
          setActionPending(false);
          break;
        case "match_finished":
          setResult(event);
          setPhase("finished");
          setRemainingMs(0);
          setActionPending(false);
          break;
        case "error":
          setError(event.message);
          setActionPending(false);
          break;
        default:
          break;
      }
    }
  });

  useEffect(() => {
    if (!playerState?.lockoutEndsAt) {
      return;
    }

    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [playerState?.lockoutEndsAt]);

  const me = snapshot?.players.find((player) => player.id === playerId);
  const leaderDistance = snapshot?.players[0]?.d ?? 1;
  const myDistance = playerState?.distance ?? me?.d ?? 0;
  const progress = Math.min((myDistance / Math.max(leaderDistance, 1)) * 100, 100);
  const lockoutRemainingMs =
    playerState?.lockoutEndsAt && playerState.lockoutEndsAt > nowMs ? playerState.lockoutEndsAt - nowMs : 0;

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const joined = await joinSession(code, name, avatarId);
      setPlayerId(joined.playerId);
      setPlayerToken(joined.playerToken);
      savePlayerSession({
        code,
        avatarId,
        name,
        playerId: joined.playerId,
        playerToken: joined.playerToken
      });
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Unable to join session.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (questionId: string, answerId: string) => {
    if (actionPending) {
      return;
    }

    setActionPending(true);
    setError(null);
    send({
      v: PROTOCOL_VERSION,
      type: "answer",
      questionId,
      answerId
    });
  };

  const handleRewardChoice = (choice: "move" | "effect") => {
    if (actionPending) {
      return;
    }

    setActionPending(true);
    setError(null);
    send({
      v: PROTOCOL_VERSION,
      type: "reward_choice",
      choice
    });
  };

  if (!playerToken) {
    return (
      <div className="space-y-4 py-4 sm:py-10">
        <PlayerIdentityPanel
          code={code}
          name={name}
          avatarId={avatarId}
          step={identityStep}
          onNameChange={setName}
          onAvatarChange={setAvatarId}
          onContinue={() => {
            if (!name.trim()) {
              return;
            }
            setError(null);
            setIdentityStep("avatar");
          }}
          onBack={() => {
            setError(null);
            setIdentityStep("name");
          }}
          onSubmit={handleJoin}
          ctaLabel="Enter game"
          error={error}
          submitting={submitting}
        />
        <div className="text-center text-sm font-medium text-slate-300">
          Wrong room?{" "}
          <Link className="font-semibold text-cyan-200 underline decoration-cyan-400/50 underline-offset-4" to="/join">
            Enter a different code
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="cp-card-dark p-6 text-center">
        <h1 className="text-4xl font-black text-white">{name || "Player"}</h1>
        <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-slate-200">
          <AvatarBadge avatarId={me?.avatarId ?? avatarId} size={40} />
          {getPlayerAvatarPreset(me?.avatarId ?? avatarId).label}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-[1.25rem] bg-slate-950/50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Rank</div>
              <div className="mt-2 text-2xl font-black text-white">{playerState?.rank ?? me?.r ?? "-"}</div>
            </div>
            <div className="rounded-[1.25rem] bg-slate-950/50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Distance</div>
              <div className="mt-2 text-2xl font-black" style={{ color: getPlayerAccentHex(me?.avatarId ?? avatarId) }}>
                {myDistance.toFixed(1)}m
              </div>
            </div>
            <div className="rounded-[1.25rem] bg-slate-950/50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Correct</div>
              <div className="mt-2 text-2xl font-black text-white">{playerState?.correctAnswers ?? me?.correctAnswers ?? 0}</div>
            </div>
            <div className="rounded-[1.25rem] bg-slate-950/50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Remaining</div>
              <div className="mt-2 text-2xl font-black text-white">{formatRemainingLabel(phase, remainingMs)}</div>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: getPlayerAccentHex(me?.avatarId ?? avatarId) }} />
          </div>
        </div>

        {playerState?.recentOutcome ? (
          <div className="mt-6 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/10 px-5 py-4 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">{playerState.recentOutcome.title}</div>
            <div className="mt-2 text-sm text-slate-200">{playerState.recentOutcome.detail}</div>
          </div>
        ) : null}

        {phase === "lobby" || phase === "countdown" ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
              {phase === "countdown" ? "Get ready" : "Waiting room"}
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">
              {phase === "countdown" ? "Questions unlock when the countdown ends." : "The host is waiting to start the match."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Stay on this screen. Once the match goes live, your first question will appear automatically.
            </p>
          </div>
        ) : phase === "finished" ? (
          <div className="mt-6 rounded-[1.75rem] border border-amber-300/20 bg-[linear-gradient(180deg,rgba(120,53,15,0.28),rgba(8,18,37,0.84))] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-200/80">Match complete</div>
            <h2 className="mt-3 text-2xl font-black text-white">The race is over.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Check the host screen for the podium or scroll down here for the final standings.</p>
          </div>
        ) : playerState?.pendingRewardChoice ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-sky-200">Choose your reward</div>
            <h2 className="mt-3 text-2xl font-black text-white">Play it safe or open chaos.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              A safe move guarantees forward progress. The random effect can launch you ahead or cause trouble for you or somebody else.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => handleRewardChoice("move")}
                disabled={actionPending}
                className="cp-button-primary min-h-[4.5rem] text-base font-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                Move forward
              </button>
              <button
                type="button"
                onClick={() => handleRewardChoice("effect")}
                disabled={actionPending}
                className="cp-button-secondary min-h-[4.5rem] text-base font-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                Random effect
              </button>
            </div>
          </div>
        ) : lockoutRemainingMs > 0 ? (
          <div className="mt-6 rounded-[1.75rem] border border-rose-300/20 bg-rose-400/10 p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-rose-200">Locked out</div>
            <h2 className="mt-3 text-2xl font-black text-white">Next question unlocks in {formatLockoutLabel(lockoutRemainingMs)}.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Wrong answers cause a short freeze. Stay ready, because your next question will appear as soon as the timer ends.
            </p>
          </div>
        ) : playerState?.currentQuestion ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">
              {playerState.currentQuestion.format === "boolean" ? "True or false" : "Multiple choice"}
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">{playerState.currentQuestion.prompt}</h2>
            <div className="mt-6 grid gap-3">
              {playerState.currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleAnswer(playerState.currentQuestion!.id, option.id)}
                  disabled={actionPending}
                  className="rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-5 py-4 text-left text-base font-semibold text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Stand by</div>
            <h2 className="mt-3 text-2xl font-black text-white">Waiting for your next question.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Your progress is synced. The next prompt will appear automatically when your player state updates.
            </p>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>

      {result ? (
        <section className="cp-card-dark border-amber-300/20 bg-[linear-gradient(180deg,rgba(120,53,15,0.28),rgba(8,18,37,0.84))] p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Final standings</p>
          <h2 className="mt-2 text-2xl font-black text-white">Top finishers</h2>
          <div className="mt-4 space-y-2">
            {result.standings.slice(0, 5).map((standing) => (
              <div key={standing.playerId} className="flex items-center justify-between rounded-2xl bg-slate-950/50 px-4 py-3">
                <span className="font-semibold text-white">
                  {standing.rank}. {standing.name}
                </span>
                <span className="text-sm text-cyan-200">
                  {standing.distance.toFixed(1)}m • {standing.correctAnswers} correct
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
