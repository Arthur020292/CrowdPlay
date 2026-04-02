import { useEffect, useMemo, useRef } from "react";

import { getPlayerColorHex } from "@crowdplay/protocol";

import type { SnapshotEvent } from "@crowdplay/protocol";

interface RaceCanvasProps {
  snapshot: SnapshotEvent | null;
  previousSnapshot: SnapshotEvent | null;
}

export function RaceCanvas({ snapshot, previousSnapshot }: RaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const maxDistance = useMemo(() => {
    const current = snapshot?.players.reduce((best, player) => Math.max(best, player.d), 0) ?? 0;
    return Math.max(150, current + 20);
  }, [snapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) {
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
      const laneHeight = heightPx / Math.max(snapshot.players.length, 1);
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

      snapshot.players.forEach((player, index) => {
        const previous = previousPlayers.get(player.id);
        const blendedDistance = previous ? previous.d + (player.d - previous.d) * alpha : player.d;
        const y = laneHeight * index + laneHeight / 2;
        const x = 24 * devicePixelRatio + (blendedDistance / maxDistance) * (widthPx - 80 * devicePixelRatio);
        const color = getPlayerColorHex(player.color);

        context.strokeStyle = "rgba(255,255,255,0.1)";
        context.lineWidth = 2 * devicePixelRatio;
        context.beginPath();
        context.moveTo(0, laneHeight * index + laneHeight);
        context.lineTo(widthPx, laneHeight * index + laneHeight);
        context.stroke();

        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, 16 * devicePixelRatio, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = "#e2e8f0";
        context.font = `${Math.round(14 * devicePixelRatio)}px sans-serif`;
        context.fillText(`${player.r}. ${player.name}`, 18 * devicePixelRatio, y - 20 * devicePixelRatio);
        context.fillText(`${player.d.toFixed(1)}m`, x + 22 * devicePixelRatio, y + 5 * devicePixelRatio);
      });

      animationFrame = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [maxDistance, previousSnapshot, snapshot]);

  return <canvas ref={canvasRef} className="h-[360px] w-full rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-2xl shadow-cyan-500/10" />;
}
