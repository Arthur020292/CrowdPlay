import type { MatchStanding, SessionPlayer } from "@crowdplay/protocol";

export const MAX_TAPS_PER_SECOND = 12;
export const DISTANCE_PER_TAP = 1.75;

export interface TickResult {
  changed: boolean;
  standings: MatchStanding[];
}

export function acceptTapBatch(player: SessionPlayer, tapCount: number, windowMs: number): number {
  const safeWindowMs = Math.max(windowMs, 50);
  const maxAllowed = Math.ceil((MAX_TAPS_PER_SECOND * safeWindowMs) / 1000);
  const accepted = Math.max(0, Math.min(tapCount, maxAllowed));

  player.pendingTaps += accepted;
  player.totalTaps += accepted;

  return accepted;
}

export function stepRace(players: SessionPlayer[]): TickResult {
  let changed = false;

  for (const player of players) {
    if (player.pendingTaps > 0) {
      player.distance += player.pendingTaps * DISTANCE_PER_TAP;
      player.pendingTaps = 0;
      changed = true;
    }
  }

  const standings = buildStandings(players);
  standings.forEach((standing, index) => {
    const player = players.find((candidate) => candidate.playerId === standing.playerId);
    if (player && player.rank !== index + 1) {
      player.rank = index + 1;
      changed = true;
    }
  });

  return { changed, standings };
}

export function buildStandings(players: SessionPlayer[]): MatchStanding[] {
  return [...players]
    .sort((left, right) => {
      if (right.distance === left.distance) {
        return right.totalTaps - left.totalTaps;
      }
      return right.distance - left.distance;
    })
    .map((player, index) => ({
      playerId: player.playerId,
      name: player.name,
      color: player.color,
      rank: index + 1,
      distance: roundNumber(player.distance),
      totalTaps: player.totalTaps
    }));
}

export function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}
