import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { PLAYER_COLOR_PRESETS, PROTOCOL_VERSION, getDefaultPlayerColor, getPlayerColorHex, type MatchFinishedEvent, type PlayerColorId, type SnapshotEvent } from "@crowdplay/protocol";

import { ColorPresetPicker } from "../components/ColorPresetPicker";
import { useSessionSocket } from "../hooks/useSessionSocket";
import { buildSessionSocketUrl, joinSession } from "../lib/api";
import { getPlayerSession, savePlayerSession } from "../lib/storage";
import { formatRemainingLabel } from "../lib/time";

export function PlayPage() {
  const params = useParams();
  const code = params.code?.toUpperCase() ?? "";
  const stored = getPlayerSession(code);

  const [name, setName] = useState(stored?.name ?? "");
  const [color, setColor] = useState<PlayerColorId>((stored?.color as PlayerColorId | undefined) ?? getDefaultPlayerColor());
  const [playerId, setPlayerId] = useState(stored?.playerId ?? "");
  const [playerToken, setPlayerToken] = useState(stored?.playerToken ?? "");
  const [phase, setPhase] = useState("lobby");
  const [remainingMs, setRemainingMs] = useState(0);
  const [snapshot, setSnapshot] = useState<SnapshotEvent | null>(null);
  const [result, setResult] = useState<MatchFinishedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingTapsRef = useRef(0);
  const sequenceRef = useRef(0);

  const socketUrl = useMemo(() => (playerToken ? buildSessionSocketUrl(code, playerToken) : null), [code, playerToken]);
  const { status, send } = useSessionSocket({
    enabled: Boolean(playerToken),
    url: socketUrl,
    onEvent(event) {
      switch (event.type) {
        case "join_ack":
          setPhase(event.phase);
          if (event.playerId) {
            setPlayerId(event.playerId);
          }
          break;
        case "phase_changed":
          setPhase(event.phase);
          setRemainingMs(event.remainingMs ?? event.countdownMs ?? 0);
          break;
        case "snapshot":
          setSnapshot(event);
          setPhase(event.phase);
          setRemainingMs(event.remainingMs);
          break;
        case "match_finished":
          setResult(event);
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
    if (!playerToken) {
      return;
    }

    const interval = window.setInterval(() => {
      if (pendingTapsRef.current <= 0 || status !== "open") {
        return;
      }

      sequenceRef.current += 1;
      send({
        v: PROTOCOL_VERSION,
        type: "input",
        seq: sequenceRef.current,
        tapCount: pendingTapsRef.current,
        windowMs: 75
      });
      pendingTapsRef.current = 0;
    }, 75);

    return () => window.clearInterval(interval);
  }, [playerToken, send, status]);

  const me = snapshot?.players.find((player) => player.id === playerId);
  const leaderDistance = snapshot?.players[0]?.d ?? 1;
  const progress = me ? Math.min((me.d / Math.max(leaderDistance, 1)) * 100, 100) : 0;

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const joined = await joinSession(code, name, color);
      setPlayerId(joined.playerId);
      setPlayerToken(joined.playerToken);
      savePlayerSession({
        code,
        color,
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

  if (!playerToken) {
    return (
      <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Join TapDash</p>
        <h1 className="mt-3 text-3xl font-black text-white">Session {code}</h1>
        <p className="mt-3 text-slate-300">Enter your display name and get ready to tap on the host&apos;s countdown.</p>

        <form onSubmit={handleJoin} className="mt-6 space-y-4">
          <input
            className="w-full rounded-[1.5rem] border border-white/10 bg-slate-950/80 px-4 py-4 text-lg text-white outline-none"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            maxLength={24}
          />
          <ColorPresetPicker selectedColor={color} onChange={setColor} />
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            disabled={!name.trim() || submitting}
            className="inline-flex w-full items-center justify-center rounded-[1.5rem] bg-cyan-400 px-4 py-4 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Joining..." : "Join game"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Phone Controller</p>
        <h1 className="mt-3 text-4xl font-black text-white">{name || "Player"}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Session {code} • Socket {status} • Phase {phase}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
          <span className="inline-block size-3 rounded-full" style={{ backgroundColor: getPlayerColorHex(me?.color ?? color) }} />
          {PLAYER_COLOR_PRESETS.find((preset) => preset.id === color)?.label ?? "Color"}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Rank</span>
            <span className="text-lg font-semibold text-white">{me?.r ?? "-"}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
            <span>Distance</span>
            <span className="text-lg font-semibold text-cyan-200">{me?.d?.toFixed(1) ?? "0.0"}m</span>
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
          onPointerDown={() => {
            if (phase === "live") {
              pendingTapsRef.current += 1;
            }
          }}
          disabled={phase !== "live"}
          className="mt-6 inline-flex min-h-56 w-full items-center justify-center rounded-[2rem] bg-gradient-to-br from-cyan-300 to-blue-500 px-4 py-10 text-4xl font-black uppercase tracking-[0.2em] text-slate-950 shadow-2xl shadow-cyan-500/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-400 disabled:shadow-none"
        >
          {phase === "live" ? "Tap" : phase === "countdown" ? "Ready" : phase === "finished" ? "Finished" : "Waiting"}
        </button>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>

      {result ? (
        <section className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Match complete</p>
          <h2 className="mt-2 text-2xl font-black text-white">Top finishers</h2>
          <div className="mt-4 space-y-2">
            {result.standings.slice(0, 5).map((standing) => (
              <div key={standing.playerId} className="flex items-center justify-between rounded-2xl bg-slate-950/50 px-4 py-3">
                <span className="font-semibold text-white">
                  {standing.rank}. {standing.name}
                </span>
                <span className="text-sm text-cyan-200">{standing.distance.toFixed(1)}m</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
