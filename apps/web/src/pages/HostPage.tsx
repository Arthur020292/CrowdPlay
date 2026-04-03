import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { QUESTION_BANK, type QuestionDefinition } from "@crowdplay/game-goldrush";
import {
  getDefaultPlayerAvatar,
  safeParseServerEvent,
  type ChaosEvent,
  type GameType,
  type MatchFinishedEvent,
  type QuizDashSnapshotEvent,
  type RosterPlayer,
  type SnapshotEvent
} from "@crowdplay/protocol";

import { ChaosFeed } from "../components/ChaosFeed";
import { HostLobbyStage } from "../components/HostLobbyStage";
import { HostPodium } from "../components/HostPodium";
import { Leaderboard } from "../components/Leaderboard";
import { LobbyRosterGrid } from "../components/LobbyRosterGrid";
import { RaceCanvas } from "../components/RaceCanvas";
import { useSessionSocket } from "../hooks/useSessionSocket";
import { buildSessionSocketUrl, endSession, joinSession, startSession } from "../lib/api";
import { getHostToken, saveHostToken } from "../lib/storage";
import { formatRemainingLabel } from "../lib/time";

const LOCAL_BOT_BASE_NAMES = [
  "Nova",
  "Milo",
  "Skye",
  "Juno",
  "Theo",
  "Iris",
  "Luca",
  "Zara",
  "Orion",
  "Niko",
  "Ruby",
  "Sage",
  "Jade",
  "Felix",
  "Luna",
  "Kai",
  "Piper",
  "Atlas",
  "Maya",
  "Ezra"
] as const;

interface LocalBotClient {
  socket: WebSocket | null;
  actionTimer: number | null;
}

const questionBankById = new Map<string, QuestionDefinition>(QUESTION_BANK.map((question) => [question.id, question]));

function getLocalBotName(index: number): string {
  const baseName = LOCAL_BOT_BASE_NAMES[index % LOCAL_BOT_BASE_NAMES.length];
  const cycle = Math.floor(index / LOCAL_BOT_BASE_NAMES.length);
  return cycle === 0 ? baseName : `${baseName} ${cycle + 1}`;
}

function pickBotAnswer(questionId: string): string {
  const question = questionBankById.get(questionId);
  if (!question) {
    return "true";
  }

  if (Math.random() < 0.72) {
    return question.correctAnswerId;
  }

  const fallbackOption = question.options.find((option) => option.id !== question.correctAnswerId);
  return fallbackOption?.id ?? question.correctAnswerId;
}

function getGameLabel(gameType: GameType | null): string {
  if (gameType === "goldrush") {
    return "Gold Rush";
  }

  if (gameType === "quizdash") {
    return "QuizDash";
  }

  return "CrowdPlay";
}

function isQuizDashSnapshot(snapshot: SnapshotEvent | null): snapshot is QuizDashSnapshotEvent {
  return snapshot?.gameType === "quizdash";
}

function clearBotTimer(botClient: LocalBotClient) {
  if (botClient.actionTimer) {
    window.clearTimeout(botClient.actionTimer);
    botClient.actionTimer = null;
  }
}

export function HostPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const code = params.code?.toUpperCase() ?? "";
  const queryToken = searchParams.get("token");
  const hostToken = queryToken ?? getHostToken(code);
  const localBotCount = Number.parseInt(searchParams.get("bots") ?? "0", 10);
  const shouldSeedLocalBots =
    import.meta.env.DEV &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    Number.isFinite(localBotCount) &&
    localBotCount > 0;

  if (queryToken) {
    saveHostToken(code, queryToken);
  }

  const [gameType, setGameType] = useState<GameType | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [snapshot, setSnapshot] = useState<SnapshotEvent | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<SnapshotEvent | null>(null);
  const [phase, setPhase] = useState("lobby");
  const [remainingMs, setRemainingMs] = useState(0);
  const [result, setResult] = useState<MatchFinishedEvent | null>(null);
  const [chaosEvents, setChaosEvents] = useState<ChaosEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const localBotsRef = useRef<LocalBotClient[]>([]);
  const seedingBotsRef = useRef(false);

  const socketUrl = useMemo(() => (hostToken ? buildSessionSocketUrl(code, hostToken) : null), [code, hostToken]);
  useSessionSocket({
    enabled: Boolean(hostToken),
    url: socketUrl,
    onEvent(event) {
      switch (event.type) {
        case "join_ack":
          setGameType(event.summary.config.gameType);
          setPhase(event.phase);
          break;
        case "roster_update":
          setGameType(event.gameType);
          setRoster(event.players);
          break;
        case "phase_changed":
          setPhase(event.phase);
          setRemainingMs(event.remainingMs ?? event.countdownMs ?? 0);
          break;
        case "snapshot":
          setGameType(event.gameType);
          setPreviousSnapshot(snapshot?.gameType === "quizdash" ? snapshot : null);
          setSnapshot(event);
          setPhase(event.phase);
          setRemainingMs(event.remainingMs);
          break;
        case "chaos_event":
          setChaosEvents((current) => [event, ...current].slice(0, 8));
          break;
        case "match_finished":
          setGameType(event.gameType);
          setResult(event);
          setPhase("finished");
          setRemainingMs(0);
          break;
        case "error":
          setError(event.message);
          break;
        default:
          break;
      }
    }
  });

  useEffect(() => {
    return () => {
      localBotsRef.current.forEach((bot) => {
        clearBotTimer(bot);
        bot.socket?.close(1000, "Host page unmounted");
      });
      localBotsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!shouldSeedLocalBots || !code || phase !== "lobby" || localBotsRef.current.length >= localBotCount || seedingBotsRef.current) {
      return;
    }

    seedingBotsRef.current = true;

    const seedBots = async () => {
      try {
        const targetCount = Math.min(localBotCount, 49);
        for (let index = localBotsRef.current.length; index < targetCount; index += 1) {
          const joined = await joinSession(code, getLocalBotName(index), getDefaultPlayerAvatar(index));
          const socket = new WebSocket(buildSessionSocketUrl(code, joined.playerToken));
          const botClient: LocalBotClient = { socket, actionTimer: null };

          socket.addEventListener("message", (messageEvent) => {
            const payload = JSON.parse(String(messageEvent.data));
            const event = safeParseServerEvent(payload);
            if (!event || socket.readyState !== WebSocket.OPEN) {
              return;
            }

            if (event.type === "join_ack" || event.type === "phase_changed" || event.type === "snapshot") {
              return;
            }

            if (event.type !== "player_state" || event.playerId !== joined.playerId) {
              return;
            }

            clearBotTimer(botClient);

            if (event.phase !== "live") {
              return;
            }

            if (event.pendingTargetPick && event.availableTargets.length > 0) {
              const target = event.availableTargets[Math.floor(Math.random() * event.availableTargets.length)];
              botClient.actionTimer = window.setTimeout(() => {
                socket.send(JSON.stringify({
                  v: 1,
                  type: "target_pick",
                  targetPlayerId: target.playerId
                }));
              }, 240 + Math.floor(Math.random() * 360));
              return;
            }

            if (event.pendingChestPick) {
              botClient.actionTimer = window.setTimeout(() => {
                socket.send(JSON.stringify({
                  v: 1,
                  type: "chest_pick",
                  chestIndex: Math.floor(Math.random() * 3)
                }));
              }, 240 + Math.floor(Math.random() * 360));
              return;
            }

            if (event.gameType === "goldrush" && event.lockoutEndsAt) {
              return;
            }

            if (!event.currentQuestion) {
              return;
            }

            botClient.actionTimer = window.setTimeout(() => {
              socket.send(JSON.stringify({
                v: 1,
                type: "answer",
                questionId: event.currentQuestion!.id,
                answerId: pickBotAnswer(event.currentQuestion!.id)
              }));
            }, 500 + Math.floor(Math.random() * 800));
          });

          socket.addEventListener("close", () => clearBotTimer(botClient));
          localBotsRef.current.push(botClient);
        }
      } catch (seedError) {
        setError(seedError instanceof Error ? seedError.message : "Unable to create local bot players.");
      } finally {
        seedingBotsRef.current = false;
      }
    };

    void seedBots();
  }, [code, localBotCount, phase, shouldSeedLocalBots]);

  if (!hostToken) {
    return (
      <div className="cp-page-background cp-page-background--ambient min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-rose-400/20 bg-rose-400/10 p-8 text-rose-100">
          Host token missing for session <strong>{code}</strong>. Create a new session from the home page.
        </div>
      </div>
    );
  }

  const currentGameType = result?.gameType ?? snapshot?.gameType ?? roster[0]?.gameType ?? gameType;
  const goldRushSnapshot = snapshot?.gameType === "goldrush" ? snapshot : null;
  const quizDashSnapshot = isQuizDashSnapshot(snapshot) ? snapshot : null;
  const quizDashPreviousSnapshot = isQuizDashSnapshot(previousSnapshot) ? previousSnapshot : null;
  const gameLabel = getGameLabel(currentGameType);

  if (phase === "lobby" || phase === "countdown") {
    return (
      <div className="cp-page-background cp-page-background--ambient min-h-screen space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <HostLobbyStage
          code={code}
          gameLabel={gameLabel}
          phase={phase === "countdown" ? "countdown" : "lobby"}
          remainingMs={remainingMs}
          playerCount={roster.length}
          onStart={() => startSession(code, hostToken).catch((startError) => setError(startError instanceof Error ? startError.message : "Unable to start match."))}
          startDisabled={roster.length < 2 || phase !== "lobby"}
        />
        <LobbyRosterGrid players={roster} />
        {error ? <p className="px-6 text-sm text-rose-600">{error}</p> : null}
      </div>
    );
  }

  if (currentGameType === "quizdash") {
    const livePlayers =
      quizDashSnapshot?.players ??
      roster
        .filter((player) => player.gameType === "quizdash")
        .map((player) => ({
          gameType: "quizdash" as const,
          id: player.id,
          name: player.name,
          avatarId: player.avatarId,
          distance: player.distance,
          rank: player.rank,
          correctAnswers: 0,
          wrongAnswers: 0,
          status: player.connected ? "connected" : "disconnected"
        }));

    return (
      <div className="cp-page-background cp-page-background--static min-h-screen space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-6 xl:min-h-[calc(100vh-3rem)] xl:grid-cols-[1.4fr_0.6fr]">
          <div className="flex min-h-0 flex-col">
            {result?.gameType === "quizdash" ? (
              <HostPodium
                standings={result.standings}
                action={
                  <button
                    onClick={() => navigate(`/results/${result.matchId}`)}
                    className="cp-button-secondary px-4 py-2 text-sm"
                  >
                    Open results
                  </button>
                }
              />
            ) : (
              <RaceCanvas
                snapshot={quizDashSnapshot}
                previousSnapshot={quizDashPreviousSnapshot}
                className="min-h-[420px] flex-1"
                lanePlayerIds={roster.map((player) => player.id)}
              />
            )}

            {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          </div>

          <Leaderboard
            players={result?.gameType === "quizdash" ? result.standings : livePlayers}
            title={phase === "finished" ? "Final standings" : "Live standings"}
            scrollable={phase === "live" || phase === "finished"}
            headerActions={
              phase === "live" ? (
                <>
                  <div className="rounded-full border border-slate-200 bg-white/[0.84] px-4 py-2 text-sm font-medium text-slate-600">
                    Remaining {formatRemainingLabel(phase, remainingMs)}
                  </div>
                  <button
                    onClick={() => endSession(code, hostToken).catch((endError) => setError(endError instanceof Error ? endError.message : "Unable to end match."))}
                    disabled={phase !== "live" && phase !== "countdown"}
                    className="cp-button-secondary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Stop
                  </button>
                </>
              ) : null
            }
          />
        </section>
      </div>
    );
  }

  const goldPlayers =
    goldRushSnapshot?.players ??
    roster
      .filter((player) => player.gameType === "goldrush")
      .map((player) => ({
        gameType: "goldrush" as const,
        id: player.id,
        name: player.name,
        avatarId: player.avatarId,
        gold: player.gold,
        rank: player.rank,
        correctAnswers: 0,
        wrongAnswers: 0,
        status: player.connected ? "connected" : "disconnected"
      }));

  return (
    <div className="cp-page-background cp-page-background--static min-h-screen space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:min-h-[calc(100vh-3rem)] xl:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-h-0 flex-col gap-6">
          {result?.gameType === "goldrush" ? (
            <HostPodium
              standings={result.standings}
              action={
                <button
                  onClick={() => navigate(`/results/${result.matchId}`)}
                  className="cp-button-secondary px-4 py-2 text-sm"
                >
                  Open results
                </button>
              }
            />
          ) : null}

          <ChaosFeed events={chaosEvents} className="flex-1" headerBadge={`Remaining ${formatRemainingLabel(phase, remainingMs)}`} />

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>

        <Leaderboard
          players={result?.gameType === "goldrush" ? result.standings : goldPlayers}
          title={phase === "finished" ? "Final standings" : "Live standings"}
          scrollable={phase === "live" || phase === "finished"}
          showSecondaryText={phase === "finished"}
          showMetricRank={phase === "finished"}
          headerActions={
            phase === "live" ? (
              <button
                onClick={() => endSession(code, hostToken).catch((endError) => setError(endError instanceof Error ? endError.message : "Unable to end match."))}
                disabled={phase !== "live" && phase !== "countdown"}
                className="cp-button-secondary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                Stop
              </button>
            ) : null
          }
        />
      </section>
    </div>
  );
}
