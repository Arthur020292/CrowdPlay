import {
  type MatchFinishedEvent,
  type MatchResult,
  type MatchStanding,
  type PlayerAvatarId,
  type RosterPlayer,
  type SnapshotEvent,
  type SnapshotPlayer,
  PROTOCOL_VERSION
} from "@crowdplay/protocol";

const FIXTURE_TIME = Date.UTC(2026, 3, 2, 7, 30, 0);

interface PlayerSeed {
  id: string;
  name: string;
  avatarId: PlayerAvatarId;
}

const playerSeeds: PlayerSeed[] = [
  { id: "p_ava", name: "Ava", avatarId: "fox" },
  { id: "p_liam", name: "Liam", avatarId: "panda" },
  { id: "p_mia", name: "Mia", avatarId: "tiger" },
  { id: "p_noah", name: "Noah", avatarId: "frog" },
  { id: "p_zoe", name: "Zoe", avatarId: "owl" },
  { id: "p_leo", name: "Leo", avatarId: "shark" }
];

function makeRosterPlayer(seed: PlayerSeed, index: number, overrides: Partial<RosterPlayer> = {}): RosterPlayer {
  return {
    id: seed.id,
    name: seed.name,
    avatarId: seed.avatarId,
    connected: true,
    rank: index + 1,
    distance: 0,
    ...overrides
  };
}

function makeSnapshotPlayer(seed: PlayerSeed, index: number, distance: number, taps: number, overrides: Partial<SnapshotPlayer> = {}): SnapshotPlayer {
  return {
    id: seed.id,
    name: seed.name,
    avatarId: seed.avatarId,
    d: distance,
    r: index + 1,
    t: taps,
    status: "connected",
    ...overrides
  };
}

function toStandings(players: SnapshotPlayer[]): MatchStanding[] {
  return players.map((player, index) => ({
    playerId: player.id,
    name: player.name,
    avatarId: player.avatarId,
    rank: index + 1,
    distance: player.d,
    totalTaps: player.t
  }));
}

export const previewRoster: RosterPlayer[] = [
  makeRosterPlayer(playerSeeds[0], 0),
  makeRosterPlayer(playerSeeds[1], 1),
  makeRosterPlayer(playerSeeds[2], 2),
  makeRosterPlayer(playerSeeds[3], 3),
  makeRosterPlayer(playerSeeds[4], 4, { connected: false }),
  makeRosterPlayer(playerSeeds[5], 5)
];

export const previewCountdownSnapshot: SnapshotEvent = {
  v: PROTOCOL_VERSION,
  type: "snapshot",
  phase: "countdown",
  tick: 5,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 2_100,
  players: [
    makeSnapshotPlayer(playerSeeds[0], 0, 0, 0),
    makeSnapshotPlayer(playerSeeds[1], 1, 0, 0),
    makeSnapshotPlayer(playerSeeds[2], 2, 0, 0),
    makeSnapshotPlayer(playerSeeds[3], 3, 0, 0),
    makeSnapshotPlayer(playerSeeds[4], 4, 0, 0, { status: "disconnected" }),
    makeSnapshotPlayer(playerSeeds[5], 5, 0, 0)
  ]
};

export const previewLivePreviousSnapshot: SnapshotEvent = {
  v: PROTOCOL_VERSION,
  type: "snapshot",
  phase: "live",
  tick: 118,
  serverTimeMs: FIXTURE_TIME - 80,
  remainingMs: 48_000,
  players: [
    makeSnapshotPlayer(playerSeeds[1], 0, 94.8, 152),
    makeSnapshotPlayer(playerSeeds[0], 1, 93.6, 149),
    makeSnapshotPlayer(playerSeeds[5], 2, 92.7, 147),
    makeSnapshotPlayer(playerSeeds[2], 3, 88.9, 141),
    makeSnapshotPlayer(playerSeeds[3], 4, 84.1, 133),
    makeSnapshotPlayer(playerSeeds[4], 5, 79.4, 128, { status: "disconnected" })
  ]
};

export const previewLiveSnapshot: SnapshotEvent = {
  ...previewLivePreviousSnapshot,
  tick: 119,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 47_920,
  players: [
    makeSnapshotPlayer(playerSeeds[1], 0, 96.1, 155),
    makeSnapshotPlayer(playerSeeds[0], 1, 95.7, 154),
    makeSnapshotPlayer(playerSeeds[5], 2, 94.2, 150),
    makeSnapshotPlayer(playerSeeds[2], 3, 90.4, 145),
    makeSnapshotPlayer(playerSeeds[3], 4, 85.3, 136),
    makeSnapshotPlayer(playerSeeds[4], 5, 80.1, 129, { status: "disconnected" })
  ]
};

export const previewSprintSnapshot: SnapshotEvent = {
  v: PROTOCOL_VERSION,
  type: "snapshot",
  phase: "live",
  tick: 182,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 6_400,
  players: [
    makeSnapshotPlayer(playerSeeds[0], 0, 142.4, 232),
    makeSnapshotPlayer(playerSeeds[1], 1, 141.8, 230),
    makeSnapshotPlayer(playerSeeds[2], 2, 139.1, 222),
    makeSnapshotPlayer(playerSeeds[5], 3, 137.5, 218),
    makeSnapshotPlayer(playerSeeds[3], 4, 133.7, 209),
    makeSnapshotPlayer(playerSeeds[4], 5, 127.2, 201)
  ]
};

export const previewFinishedEvent: MatchFinishedEvent = {
  v: PROTOCOL_VERSION,
  type: "match_finished",
  matchId: "match_preview_001",
  winners: [playerSeeds[0].id, playerSeeds[1].id, playerSeeds[2].id],
  standings: toStandings(previewSprintSnapshot.players)
};

export const previewMatchResult: MatchResult = {
  matchId: "match_preview_001",
  sessionId: "session_preview_001",
  code: "DEMO5",
  gameType: "tapdash",
  startedAt: FIXTURE_TIME - 120_000,
  endedAt: FIXTURE_TIME,
  durationMs: 120_000,
  playerCount: previewFinishedEvent.standings.length,
  winners: previewFinishedEvent.winners,
  standings: previewFinishedEvent.standings,
  stats: {
    totalTaps: previewFinishedEvent.standings.reduce((total, standing) => total + standing.totalTaps, 0),
    averageTapsPerPlayer: previewFinishedEvent.standings.reduce((total, standing) => total + standing.totalTaps, 0) / previewFinishedEvent.standings.length,
    winningDistance: previewFinishedEvent.standings[0]?.distance ?? 0
  }
};
