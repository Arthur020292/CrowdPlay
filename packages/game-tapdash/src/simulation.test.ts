import { describe, expect, it } from "vitest";

import type { SessionPlayer } from "@crowdplay/protocol";

import { DISTANCE_PER_TAP, MAX_TAPS_PER_SECOND, acceptTapBatch, buildStandings, stepRace } from "./index";

function createPlayer(playerId: string, name: string): SessionPlayer {
  return {
    playerId,
    name,
    joinedAt: Date.now(),
    connected: true,
    lastSeenAt: Date.now(),
    inputSeq: 0,
    totalTaps: 0,
    pendingTaps: 0,
    distance: 0,
    rank: 0,
    status: "connected"
  };
}

describe("TapDash simulation", () => {
  it("caps tap batches by taps per second", () => {
    const player = createPlayer("p1", "Ada");
    const accepted = acceptTapBatch(player, 99, 1000);

    expect(accepted).toBe(MAX_TAPS_PER_SECOND);
    expect(player.totalTaps).toBe(MAX_TAPS_PER_SECOND);
  });

  it("converts accepted taps into distance on tick", () => {
    const player = createPlayer("p1", "Ada");
    acceptTapBatch(player, 4, 1000);

    stepRace([player]);

    expect(player.distance).toBe(4 * DISTANCE_PER_TAP);
    expect(player.pendingTaps).toBe(0);
  });

  it("builds standings by distance and taps", () => {
    const ada = createPlayer("p1", "Ada");
    const ben = createPlayer("p2", "Ben");

    ada.distance = 20;
    ben.distance = 20;
    ada.totalTaps = 30;
    ben.totalTaps = 35;

    const standings = buildStandings([ada, ben]);

    expect(standings[0]?.playerId).toBe("p2");
    expect(standings[1]?.playerId).toBe("p1");
  });
});
