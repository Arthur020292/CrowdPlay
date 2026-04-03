import { useEffect, useMemo, useRef, useState } from "react";

import type { QuizDashSnapshotEvent } from "@crowdplay/protocol";

import { AvatarBadge } from "./AvatarBadge";

interface RaceCanvasProps {
  snapshot: QuizDashSnapshotEvent | null;
  previousSnapshot: QuizDashSnapshotEvent | null;
  className?: string;
  lanePlayerIds?: string[];
}

interface AvatarPosition {
  id: string;
  avatarId: QuizDashSnapshotEvent["players"][number]["avatarId"];
  name: string;
  distance: number;
  x: number;
  y: number;
  size: number;
}

export function RaceCanvas({ snapshot, previousSnapshot, className = "h-[360px]", lanePlayerIds }: RaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [avatarPositions, setAvatarPositions] = useState<AvatarPosition[]>([]);
  const [laneOrder, setLaneOrder] = useState<string[]>([]);

  const maxDistance = useMemo(() => {
    const current = snapshot?.players.reduce((best, player) => Math.max(best, player.distance), 0) ?? 0;
    return Math.max(150, current + 20);
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot) {
      setLaneOrder([]);
      return;
    }

    setLaneOrder((previousOrder) => {
      const snapshotIds = new Set(snapshot.players.map((player) => player.id));
      const nextOrder = previousOrder.filter((id) => snapshotIds.has(id));

      snapshot.players.forEach((player) => {
        if (!nextOrder.includes(player.id)) {
          nextOrder.push(player.id);
        }
      });

      if (nextOrder.length === previousOrder.length && nextOrder.every((id, index) => id === previousOrder[index])) {
        return previousOrder;
      }

      return nextOrder;
    });
  }, [snapshot]);

  const orderedPlayers = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const playerById = new Map(snapshot.players.map((player) => [player.id, player]));
    const preferredOrder = lanePlayerIds?.length ? lanePlayerIds : laneOrder;
    const ordered = preferredOrder.map((id) => playerById.get(id)).filter((player): player is QuizDashSnapshotEvent["players"][number] => Boolean(player));

    if (ordered.length === snapshot.players.length) {
      return ordered;
    }

    const orderedIds = new Set(ordered.map((player) => player.id));
    return [...ordered, ...snapshot.players.filter((player) => !orderedIds.has(player.id))];
  }, [laneOrder, lanePlayerIds, snapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) {
      setAvatarPositions([]);
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * devicePixelRatio;
    const height = canvas.clientHeight * devicePixelRatio;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const previousPlayers = new Map(previousSnapshot?.players.map((player) => [player.id, player]) ?? []);

    let animationFrame = 0;
    const render = () => {
      const widthPx = canvas.width;
      const heightPx = canvas.height;
      const playerCount = Math.max(orderedPlayers.length, 1);
      const preferredLaneHeightPx = 56 * devicePixelRatio;
      const safePaddingPx = 26 * devicePixelRatio;
      const availableHeightPx = Math.max(heightPx - safePaddingPx * 2, preferredLaneHeightPx);
      const laneHeight = Math.min(availableHeightPx / playerCount, preferredLaneHeightPx);
      const trackHeightPx = laneHeight * playerCount;
      const trackOffsetY = Math.max((heightPx - trackHeightPx) / 2, safePaddingPx);
      const laneHeightCss = laneHeight / devicePixelRatio;
      const trackOffsetYCss = trackOffsetY / devicePixelRatio;
      const avatarSizePx = Math.max(Math.min(laneHeight * 0.78, 40 * devicePixelRatio), 12 * devicePixelRatio);
      const avatarSizeCss = avatarSizePx / devicePixelRatio;
      const alpha = Math.min((Date.now() - snapshot.serverTimeMs) / 120, 1.2);

      context.clearRect(0, 0, widthPx, heightPx);
      context.fillStyle = "#020617";
      context.fillRect(0, 0, widthPx, heightPx);

      for (let i = 0; i < 10; i += 1) {
        const x = (i / 9) * widthPx;
        context.strokeStyle = "rgba(255,255,255,0.07)";
        context.setLineDash([10 * devicePixelRatio, 18 * devicePixelRatio]);
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, heightPx);
        context.stroke();
      }
      context.setLineDash([]);

      context.strokeStyle = "rgba(255,255,255,0.1)";
      context.lineWidth = 2 * devicePixelRatio;
      for (let index = 0; index <= playerCount; index += 1) {
        const y = trackOffsetY + laneHeight * index;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(widthPx, y);
        context.stroke();
      }

      const nextAvatarPositions: AvatarPosition[] = [];

      orderedPlayers.forEach((player, index) => {
        const previous = previousPlayers.get(player.id);
        const blendedDistance = previous ? previous.distance + (player.distance - previous.distance) * alpha : player.distance;
        const laneTop = trackOffsetY + laneHeight * index;
        const y = laneTop + laneHeight / 2;
        const x = 24 * devicePixelRatio + (blendedDistance / maxDistance) * (widthPx - 80 * devicePixelRatio);
        const xCss = 24 + (blendedDistance / maxDistance) * (canvas.clientWidth - 80);
        const yCss = trackOffsetYCss + laneHeightCss * index + laneHeightCss / 2;

        nextAvatarPositions.push({
          id: player.id,
          avatarId: player.avatarId,
          name: player.name,
          distance: blendedDistance,
          x: xCss,
          y: yCss,
          size: avatarSizeCss
        });
      });

      setAvatarPositions(nextAvatarPositions);

      animationFrame = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [maxDistance, orderedPlayers, previousSnapshot, snapshot]);

  return (
    <div className={`relative w-full ${className}`.trim()}>
      <canvas ref={canvasRef} className="h-full w-full border border-white/10 bg-slate-950/80 shadow-2xl shadow-cyan-500/10" />
      <div className="pointer-events-none absolute inset-0">
        {avatarPositions.map((player) => (
          <div
            key={player.id}
            className="absolute"
            style={{
              left: `${player.x}px`,
              top: `${player.y}px`,
              transform: "translateY(-50%)"
            }}
          >
            <div className="flex items-center gap-2">
              <AvatarBadge avatarId={player.avatarId} size={player.size} />
              <span className="whitespace-nowrap text-sm font-semibold text-slate-100">
                {player.name}: {player.distance.toFixed(1)}m
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
