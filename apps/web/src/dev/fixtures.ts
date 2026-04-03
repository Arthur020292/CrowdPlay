import { QUESTION_BANK } from "@crowdplay/game-quizdash";
import {
  PLAYER_AVATAR_PRESETS,
  type MatchFinishedEvent,
  type MatchResult,
  type MatchStanding,
  type PlayerAvatarId,
  type PlayerOutcome,
  type PlayerStateEvent,
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

const crowdedPlayerNames = [
  "Ava", "Liam", "Mia", "Noah", "Zoe", "Leo", "Emma", "Mason",
  "Chloe", "Lucas", "Nora", "Ethan", "Ivy", "Logan", "Ruby", "Owen",
  "Ella", "Aiden", "Luna", "Elijah", "Maya", "James", "Aria", "Benjamin",
  "Sage", "Henry", "Skye", "Jack", "Hazel", "Alexander", "Nova", "Daniel"
] as const;

const crowdedPlayerSeeds: PlayerSeed[] = crowdedPlayerNames.map((name, index) => ({
  id: `crowded_${index + 1}`,
  name,
  avatarId: PLAYER_AVATAR_PRESETS[index % PLAYER_AVATAR_PRESETS.length].id
}));

const crowdedStandingsOrder = [
  5, 1, 9, 0, 12, 3, 14, 7, 2, 10, 18, 4, 20, 8, 22, 6,
  16, 11, 24, 13, 26, 15, 28, 17, 30, 19, 21, 23, 25, 27, 29, 31
] as const;

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

function makeSnapshotPlayer(
  seed: PlayerSeed,
  index: number,
  distance: number,
  correctAnswers: number,
  wrongAnswers: number,
  overrides: Partial<SnapshotPlayer> = {}
): SnapshotPlayer {
  return {
    id: seed.id,
    name: seed.name,
    avatarId: seed.avatarId,
    d: distance,
    r: index + 1,
    correctAnswers,
    wrongAnswers,
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
    correctAnswers: player.correctAnswers,
    wrongAnswers: player.wrongAnswers,
    effectsTriggered: Math.max(1, Math.floor(player.correctAnswers / 2))
  }));
}

function makeOutcome(partial: Omit<PlayerOutcome, "at">): PlayerOutcome {
  return {
    ...partial,
    at: FIXTURE_TIME
  };
}

function makePlayerState(seed: PlayerSeed, partial: Partial<PlayerStateEvent>): PlayerStateEvent {
  return {
    v: PROTOCOL_VERSION,
    type: "player_state",
    phase: "live",
    playerId: seed.id,
    distance: 82,
    rank: 3,
    correctAnswers: 5,
    wrongAnswers: 1,
    effectsTriggered: 2,
    lockoutEndsAt: null,
    pendingRewardChoice: false,
    currentQuestion: QUESTION_BANK[0]
      ? {
          id: QUESTION_BANK[0].id,
          prompt: QUESTION_BANK[0].prompt,
          format: QUESTION_BANK[0].format,
          options: QUESTION_BANK[0].options
        }
      : null,
    recentOutcome: null,
    ...partial
  };
}

export const previewRoster: RosterPlayer[] = [
  makeRosterPlayer(playerSeeds[0], 0),
  makeRosterPlayer(playerSeeds[1], 1),
  makeRosterPlayer(playerSeeds[2], 2),
  makeRosterPlayer(playerSeeds[3], 3),
  makeRosterPlayer(playerSeeds[4], 4, { connected: false }),
  makeRosterPlayer(playerSeeds[5], 5)
];

export const previewCrowdedRoster: RosterPlayer[] = crowdedPlayerSeeds.map((seed, index) =>
  makeRosterPlayer(seed, index, { connected: index % 9 !== 0 })
);

export const previewCountdownSnapshot: SnapshotEvent = {
  v: PROTOCOL_VERSION,
  type: "snapshot",
  phase: "countdown",
  tick: 5,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 2_100,
  players: [
    makeSnapshotPlayer(playerSeeds[0], 0, 0, 0, 0),
    makeSnapshotPlayer(playerSeeds[1], 1, 0, 0, 0),
    makeSnapshotPlayer(playerSeeds[2], 2, 0, 0, 0),
    makeSnapshotPlayer(playerSeeds[3], 3, 0, 0, 0),
    makeSnapshotPlayer(playerSeeds[4], 4, 0, 0, 0, { status: "disconnected" }),
    makeSnapshotPlayer(playerSeeds[5], 5, 0, 0, 0)
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
    makeSnapshotPlayer(playerSeeds[1], 0, 96.4, 8, 1),
    makeSnapshotPlayer(playerSeeds[0], 1, 94.1, 7, 1),
    makeSnapshotPlayer(playerSeeds[5], 2, 92.7, 7, 2),
    makeSnapshotPlayer(playerSeeds[2], 3, 90.2, 6, 2),
    makeSnapshotPlayer(playerSeeds[3], 4, 86.4, 6, 3),
    makeSnapshotPlayer(playerSeeds[4], 5, 78.1, 4, 4, { status: "disconnected" })
  ]
};

export const previewLiveSnapshot: SnapshotEvent = {
  ...previewLivePreviousSnapshot,
  tick: 119,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 47_920,
  players: [
    makeSnapshotPlayer(playerSeeds[1], 0, 98.8, 9, 1),
    makeSnapshotPlayer(playerSeeds[0], 1, 96.7, 8, 1),
    makeSnapshotPlayer(playerSeeds[5], 2, 95.4, 8, 2),
    makeSnapshotPlayer(playerSeeds[2], 3, 92.9, 7, 2),
    makeSnapshotPlayer(playerSeeds[3], 4, 87.8, 6, 3),
    makeSnapshotPlayer(playerSeeds[4], 5, 81.1, 5, 4, { status: "disconnected" })
  ]
};

export const previewLiveCrowdedPreviousSnapshot: SnapshotEvent = {
  v: PROTOCOL_VERSION,
  type: "snapshot",
  phase: "live",
  tick: 118,
  serverTimeMs: FIXTURE_TIME - 80,
  remainingMs: 48_000,
  players: crowdedStandingsOrder.map((seedIndex, index) =>
    makeSnapshotPlayer(
      crowdedPlayerSeeds[seedIndex],
      index,
      Math.max(18, 126 - index * 2.35 + (index % 4) * 0.4),
      Math.max(3, 14 - Math.floor(index / 3)),
      Math.max(0, Math.floor(index / 5)),
      index % 9 === 0 ? { status: "disconnected" } : {}
    )
  )
};

export const previewLiveCrowdedSnapshot: SnapshotEvent = {
  ...previewLiveCrowdedPreviousSnapshot,
  tick: 119,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 47_920,
  players: crowdedStandingsOrder.map((seedIndex, index) =>
    makeSnapshotPlayer(
      crowdedPlayerSeeds[seedIndex],
      index,
      Math.max(20, 128 - index * 2.3 + (index % 4) * 0.45),
      Math.max(4, 15 - Math.floor(index / 3)),
      Math.max(0, Math.floor(index / 5)),
      index % 9 === 0 ? { status: "disconnected" } : {}
    )
  )
};

export const previewSprintSnapshot: SnapshotEvent = {
  v: PROTOCOL_VERSION,
  type: "snapshot",
  phase: "live",
  tick: 182,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 6_400,
  players: [
    makeSnapshotPlayer(playerSeeds[0], 0, 142.4, 12, 2),
    makeSnapshotPlayer(playerSeeds[1], 1, 141.8, 12, 2),
    makeSnapshotPlayer(playerSeeds[2], 2, 139.1, 11, 3),
    makeSnapshotPlayer(playerSeeds[5], 3, 137.5, 11, 3),
    makeSnapshotPlayer(playerSeeds[3], 4, 133.7, 10, 4),
    makeSnapshotPlayer(playerSeeds[4], 5, 127.2, 9, 5)
  ]
};

export const previewPlayerQuestionState = makePlayerState(playerSeeds[0], {
  distance: 96.7,
  rank: 2,
  correctAnswers: 8,
  wrongAnswers: 1,
  effectsTriggered: 2,
  currentQuestion: QUESTION_BANK[2]
    ? {
        id: QUESTION_BANK[2].id,
        prompt: QUESTION_BANK[2].prompt,
        format: QUESTION_BANK[2].format,
        options: QUESTION_BANK[2].options
      }
    : null
});

export const previewPlayerRewardState = makePlayerState(playerSeeds[0], {
  distance: 102.7,
  rank: 2,
  correctAnswers: 9,
  wrongAnswers: 1,
  effectsTriggered: 2,
  pendingRewardChoice: true,
  currentQuestion: null,
  recentOutcome: makeOutcome({
    kind: "correct",
    title: "Correct",
    detail: "Choose your reward: safe progress or a chaotic chest."
  })
});

export const previewPlayerLockoutState = makePlayerState(playerSeeds[0], {
  distance: 102.7,
  rank: 2,
  correctAnswers: 9,
  wrongAnswers: 2,
  effectsTriggered: 2,
  lockoutEndsAt: FIXTURE_TIME + 3_500,
  currentQuestion: QUESTION_BANK[3]
    ? {
        id: QUESTION_BANK[3].id,
        prompt: QUESTION_BANK[3].prompt,
        format: QUESTION_BANK[3].format,
        options: QUESTION_BANK[3].options
      }
    : null,
  recentOutcome: makeOutcome({
    kind: "wrong",
    title: "Locked out",
    detail: "Wrong answer. You're frozen for 4s."
  })
});

export const previewPlayerEffectState = makePlayerState(playerSeeds[0], {
  distance: 116.7,
  rank: 1,
  correctAnswers: 10,
  wrongAnswers: 2,
  effectsTriggered: 3,
  currentQuestion: QUESTION_BANK[5]
    ? {
        id: QUESTION_BANK[5].id,
        prompt: QUESTION_BANK[5].prompt,
        format: QUESTION_BANK[5].format,
        options: QUESTION_BANK[5].options
      }
    : null,
  recentOutcome: makeOutcome({
    kind: "reward",
    title: "Heist chest",
    detail: "You stole 8.0m from Liam.",
    effectType: "steal",
    distanceDelta: 8
  })
});

export const previewFinishedEvent: MatchFinishedEvent = {
  v: PROTOCOL_VERSION,
  type: "match_finished",
  matchId: "match_preview_001",
  winners: [playerSeeds[0].id, playerSeeds[1].id, playerSeeds[2].id],
  standings: toStandings(previewSprintSnapshot.players)
};

export const previewCrowdedFinishedEvent: MatchFinishedEvent = {
  v: PROTOCOL_VERSION,
  type: "match_finished",
  matchId: "match_preview_crowded_001",
  winners: previewLiveCrowdedSnapshot.players.slice(0, 3).map((player) => player.id),
  standings: toStandings(previewLiveCrowdedSnapshot.players)
};

export const previewMatchResult: MatchResult = {
  matchId: "match_preview_001",
  sessionId: "session_preview_001",
  code: "DEMO5",
  gameType: "quizdash",
  startedAt: FIXTURE_TIME - 120_000,
  endedAt: FIXTURE_TIME,
  durationMs: 120_000,
  playerCount: previewFinishedEvent.standings.length,
  winners: previewFinishedEvent.winners,
  standings: previewFinishedEvent.standings,
  stats: {
    totalCorrectAnswers: previewFinishedEvent.standings.reduce((total, standing) => total + standing.correctAnswers, 0),
    totalWrongAnswers: previewFinishedEvent.standings.reduce((total, standing) => total + standing.wrongAnswers, 0),
    totalEffectsTriggered: previewFinishedEvent.standings.reduce((total, standing) => total + standing.effectsTriggered, 0),
    winningDistance: previewFinishedEvent.standings[0]?.distance ?? 0
  }
};
