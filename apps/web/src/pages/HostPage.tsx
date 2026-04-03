import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  QUESTION_BANK,
  type QuestionDefinition
} from "@crowdplay/game-quizdash";
import {
  getDefaultPlayerAvatar,
  safeParseServerEvent,
  type MatchFinishedEvent,
  type RosterPlayer,
  type SnapshotEvent
} from "@crowdplay/protocol";

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

  const correctChance = Math.random();
  if (correctChance < 0.72) {
    return question.correctAnswerId;
  }

  const fallbackOption = question.options.find((option) => option.id !== question.correctAnswerId);
  return fallbackOption?.id ?? question.correctAnswerId;
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

  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [snapshot, setSnapshot] = useState<SnapshotEvent | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<SnapshotEvent | null>(null);
  const [phase, setPhase] = useState("lobby");
  const [remainingMs, setRemainingMs] = useState(0);
  const [result, setResult] = useState<MatchFinishedEvent | null>(null);
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
          setPhase(event.phase);
          break;
        case "roster_update":
          setRoster(event.players);
          break;
        case "phase_changed":
          setPhase(event.phase);
          setRemainingMs(event.remainingMs ?? event.countdownMs ?? 0);
          break;
        case "snapshot":
          setPreviousSnapshot(snapshot ? { ...snapshot } : null);
          setSnapshot(event);
          setPhase(event.phase);
          setRemainingMs(event.remainingMs);
          break;
        case "match_finished":
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
        if (bot.actionTimer) {
          window.clearTimeout(bot.actionTimer);
        }
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

          const clearTimer = () => {
            if (botClient.actionTimer) {
              window.clearTimeout(botClient.actionTimer);
              botClient.actionTimer = null;
            }
          };

          socket.addEventListener("message", (messageEvent) => {
            const payload = JSON.parse(String(messageEvent.data));
            const event = safeParseServerEvent(payload);
            if (!event || event.type !== "player_state" || event.playerId !== joined.playerId || socket.readyState !== WebSocket.OPEN) {
              return;
            }

            clearTimer();

            if (event.phase !== "live") {
              return;
            }

            if (event.pendingRewardChoice) {
              botClient.actionTimer = window.setTimeout(() => {
                socket.send(JSON.stringify({
                  v: 1,
                  type: "reward_choice",
                  choice: Math.random() < 0.55 ? "move" : "effect"
                }));
              }, 250 + Math.floor(Math.random() * 450));
              return;
            }

            if (event.lockoutEndsAt) {
              return;
            }

            if (event.currentQuestion) {
              const currentQuestion = event.currentQuestion;
              botClient.actionTimer = window.setTimeout(() => {
                socket.send(JSON.stringify({
                  v: 1,
                  type: "answer",
                  questionId: currentQuestion.id,
                  answerId: pickBotAnswer(currentQuestion.id)
                }));
              }, 500 + Math.floor(Math.random() * 800));
            }
          });

          socket.addEventListener("close", clearTimer);
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
      <div className="mx-auto max-w-xl rounded-[2rem] border border-rose-400/20 bg-rose-400/10 p-8 text-rose-100">
        Host token missing for session <strong>{code}</strong>. Create a new session from the home page.
      </div>
    );
  }

  const livePlayers =
    snapshot?.players ??
    roster.map((player) => ({
      ...player,
      correctAnswers: 0,
      wrongAnswers: 0,
      status: player.connected ? "connected" : "disconnected",
      id: player.id,
      d: player.distance,
      r: player.rank
    }));

  if (phase === "lobby" || phase === "countdown") {
    return (
      <div className="min-h-screen space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <HostLobbyStage
          code={code}
          gameLabel="QuizDash"
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

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:min-h-[calc(100vh-3rem)] xl:grid-cols-[1.4fr_0.6fr]">
        <div className="flex min-h-0 flex-col">
          {result ? (
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
              snapshot={snapshot}
              previousSnapshot={previousSnapshot}
              className="min-h-[420px] flex-1"
              lanePlayerIds={roster.map((player) => player.id)}
            />
          )}

          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </div>

        <Leaderboard
          players={livePlayers}
          title={phase === "finished" ? "Final standings" : phase === "lobby" ? "Lobby roster" : "Live standings"}
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
