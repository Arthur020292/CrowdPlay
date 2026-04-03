import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  PROTOCOL_VERSION,
  coercePlayerAvatarId,
  getDefaultPlayerAvatar,
  type GameType,
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

function formatLockoutLabel(remainingMs: number): string {
  return `${Math.max(1, Math.ceil(remainingMs / 1000))}s`;
}

function WaitingPanel({
  eyebrow,
  title,
  detail
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
      <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
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
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [phase, setPhase] = useState("lobby");
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
          setGameType(event.summary.config.gameType);
          setPhase(event.phase);
          if (event.playerId) {
            setPlayerId(event.playerId);
          }
          setActionPending(false);
          break;
        case "phase_changed":
          setPhase(event.phase);
          setActionPending(false);
          break;
        case "snapshot":
          setGameType(event.gameType);
          setSnapshot(event);
          setPhase(event.phase);
          break;
        case "player_state":
          setGameType(event.gameType);
          setPlayerState(event);
          setActionPending(false);
          break;
        case "match_finished":
          setGameType(event.gameType);
          setResult(event);
          setPhase("finished");
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

  const goldRushPlayerState = playerState?.gameType === "goldrush" ? playerState : null;
  const quizDashPlayerState = playerState?.gameType === "quizdash" ? playerState : null;
  const supportsChestFlow = goldRushPlayerState ?? quizDashPlayerState;

  useEffect(() => {
    if (!goldRushPlayerState?.lockoutEndsAt) {
      return;
    }

    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [goldRushPlayerState?.lockoutEndsAt]);

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const joined = await joinSession(code, name, avatarId);
      setPlayerId(joined.playerId);
      setPlayerToken(joined.playerToken);
      setGameType(joined.summary.config.gameType);
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

  const handleChestPick = (chestIndex: 0 | 1 | 2) => {
    if (actionPending) {
      return;
    }

    setActionPending(true);
    setError(null);
    send({
      v: PROTOCOL_VERSION,
      type: "chest_pick",
      chestIndex
    });
  };

  const handleTargetPick = (targetPlayerId: string) => {
    if (actionPending) {
      return;
    }

    setActionPending(true);
    setError(null);
    send({
      v: PROTOCOL_VERSION,
      type: "target_pick",
      targetPlayerId
    });
  };

  if (!playerToken) {
    return (
      <div className="cp-page-background cp-page-background--ambient min-h-screen">
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
      </div>
    );
  }

  const currentGameType = result?.gameType ?? playerState?.gameType ?? snapshot?.gameType ?? gameType;
  const me = snapshot?.players.find((player) => player.id === playerId);
  const activeAvatarId = me?.avatarId ?? avatarId;
  const backgroundClass = phase === "lobby" || phase === "countdown"
    ? "cp-page-background cp-page-background--ambient"
    : "cp-page-background cp-page-background--static";
  const lockoutRemainingMs =
    goldRushPlayerState?.lockoutEndsAt && goldRushPlayerState.lockoutEndsAt > nowMs ? goldRushPlayerState.lockoutEndsAt - nowMs : 0;
  const recentOutcome = goldRushPlayerState?.recentOutcome ?? quizDashPlayerState?.recentOutcome ?? null;
  const currentQuestion = goldRushPlayerState?.currentQuestion ?? quizDashPlayerState?.currentQuestion ?? null;

  return (
    <div className={`${backgroundClass} min-h-screen`}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="cp-card-dark p-6 text-center">
          <div className="flex items-center justify-center gap-4">
            <AvatarBadge avatarId={activeAvatarId} size={40} />
            <h1 className="text-4xl font-black text-white">{name || "Player"}</h1>
          </div>

          {recentOutcome ? (
            <div className="mt-6 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/10 px-5 py-4 text-left">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">{recentOutcome.title}</div>
              <div className="mt-2 text-sm text-slate-200">{recentOutcome.detail}</div>
            </div>
          ) : null}

          {phase === "lobby" || phase === "countdown" ? (
            <WaitingPanel
              eyebrow={phase === "countdown" ? "Get ready" : "Waiting room"}
              title={phase === "countdown" ? "Your first question unlocks when the countdown ends." : "The host is waiting to start the match."}
              detail="Stay on this screen. The game will push your next prompt automatically."
            />
          ) : phase === "finished" ? (
            <WaitingPanel
              eyebrow="Match complete"
              title={currentGameType === "goldrush" ? "The vault race is over." : "The race is finished."}
              detail="The host screen has the live podium and final standings."
            />
          ) : supportsChestFlow?.pendingTargetPick ? (
            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-200">Pick a target</div>
              <h2 className="mt-3 text-2xl font-black text-white">
                {currentGameType === "goldrush" ? "Choose one of the top vaults." : "Choose one of the top racers."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{supportsChestFlow.recentOutcome?.detail ?? "Select who takes the hit."}</p>
              <div className="mt-6 grid gap-3">
                {supportsChestFlow.availableTargets.map((target) => (
                  <button
                    key={target.playerId}
                    type="button"
                    onClick={() => handleTargetPick(target.playerId)}
                    disabled={actionPending}
                    className="flex items-center justify-between rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-5 py-4 text-left transition hover:border-amber-300/40 hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex items-center gap-3">
                      <AvatarBadge avatarId={target.avatarId} size={34} />
                      <span>
                        <span className="block text-base font-semibold text-white">{target.name}</span>
                        <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Choose target</span>
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-amber-200">Pick</span>
                  </button>
                ))}
              </div>
            </div>
          ) : supportsChestFlow?.pendingChestPick ? (
            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-sky-200">Pick a chest</div>
              <h2 className="mt-3 text-2xl font-black text-white">Choose 1 of 3 hidden chests.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {currentGameType === "goldrush"
                  ? "Every chest can help you cash in or throw the leaderboard into chaos."
                  : "Every chest can boost your run or scramble the race order."}
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((chestIndex) => (
                  <button
                    key={chestIndex}
                    type="button"
                    onClick={() => handleChestPick(chestIndex as 0 | 1 | 2)}
                    disabled={actionPending}
                    className="rounded-[1.8rem] border border-amber-200/60 bg-[linear-gradient(180deg,rgba(254,243,199,0.96),rgba(253,230,138,0.82))] px-5 py-7 text-center text-lg font-black text-amber-950 shadow-[0_18px_30px_rgba(245,158,11,0.18)] transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Chest {chestIndex + 1}
                  </button>
                ))}
              </div>
            </div>
          ) : lockoutRemainingMs > 0 ? (
            <WaitingPanel
              eyebrow="Locked out"
              title={`Next question unlocks in ${formatLockoutLabel(lockoutRemainingMs)}.`}
              detail="Wrong answers freeze your controller for a few seconds."
            />
          ) : currentQuestion ? (
            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 text-left">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">
                {currentQuestion.format === "boolean" ? "True or false" : "Multiple choice"}
              </div>
              <h2 className="mt-3 text-2xl font-black text-white">{currentQuestion.prompt}</h2>
              <div className="mt-6 grid gap-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleAnswer(currentQuestion.id, option.id)}
                    disabled={actionPending}
                    className="rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-5 py-4 text-left text-base font-semibold text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <WaitingPanel
              eyebrow="Stand by"
              title="Waiting for your next question."
              detail="Your controller is synced. The next prompt will appear automatically."
            />
          )}

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}
