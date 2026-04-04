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
import { GoldRushPlayerView } from "../games/goldrush/GoldRushPlayerView";
import { QuizDashPlayerView } from "../games/quizdash/QuizDashPlayerView";
import { QuestionChestStage } from "../games/shared/QuestionChestStage";
import { PlayerIdentityPanel } from "../components/PlayerIdentityPanel";
import { useSessionSocket } from "../hooks/useSessionSocket";
import { buildSessionSocketUrl, joinSession } from "../lib/api";
import { getPlayerSession, savePlayerSession } from "../lib/storage";

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
          {goldRushPlayerState ? (
            <GoldRushPlayerView
              phase={phase}
              playerState={goldRushPlayerState}
              actionPending={actionPending}
              lockoutRemainingMs={lockoutRemainingMs}
              onAnswer={handleAnswer}
              onChestPick={handleChestPick}
              onTargetPick={handleTargetPick}
            />
          ) : quizDashPlayerState ? (
            <QuizDashPlayerView
              phase={phase}
              playerState={quizDashPlayerState}
              actionPending={actionPending}
              onAnswer={handleAnswer}
              onChestPick={handleChestPick}
              onTargetPick={handleTargetPick}
            />
          ) : (
            <QuestionChestStage
              gameLabel={currentGameType === "goldrush" ? "Gold Rush" : "QuizDash"}
              phase={phase}
              currentQuestion={currentQuestion}
              recentOutcomeTitle={recentOutcome?.title}
              recentOutcomeDetail={recentOutcome?.detail}
              pendingChestPick={false}
              pendingTargetPick={false}
              availableTargets={[]}
              actionPending={actionPending}
              onAnswer={handleAnswer}
              onChestPick={handleChestPick}
              onTargetPick={handleTargetPick}
            />
          )}

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}
