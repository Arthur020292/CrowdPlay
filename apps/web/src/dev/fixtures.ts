import { QUESTION_BANK } from "@crowdplay/game-content";
import {
  PLAYER_AVATAR_PRESETS,
  PROTOCOL_VERSION,
  type ChaosEvent,
  type GoldRushMatchResult,
  type GoldRushPlayerStateEvent,
  type GoldRushSnapshotEvent,
  type MatchFinishedEvent,
  type PlayerAvatarId,
  type PlayerOutcome,
  type QuizDashMatchResult,
  type QuizDashPlayerStateEvent,
  type QuizDashSnapshotEvent,
  type RosterPlayer,
  type TargetCandidate
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

function makeOutcome(partial: Omit<PlayerOutcome, "at">): PlayerOutcome {
  return {
    ...partial,
    at: FIXTURE_TIME
  };
}

function makeTargetCandidate(seed: PlayerSeed): TargetCandidate {
  return {
    playerId: seed.id,
    name: seed.name,
    avatarId: seed.avatarId
  };
}

export const previewGoldRushRoster: RosterPlayer[] = playerSeeds.map((seed, index) => ({
  gameType: "goldrush",
  id: seed.id,
  name: seed.name,
  avatarId: seed.avatarId,
  connected: index !== 4,
  rank: index + 1,
  gold: Math.max(0, 520 - index * 55)
}));

export const previewQuizDashRoster: RosterPlayer[] = playerSeeds.map((seed, index) => ({
  gameType: "quizdash",
  id: seed.id,
  name: seed.name,
  avatarId: seed.avatarId,
  connected: index !== 4,
  rank: index + 1,
  distance: Math.max(0, 118 - index * 12.5)
}));

export const previewGoldRushCountdownSnapshot: GoldRushSnapshotEvent = {
  v: PROTOCOL_VERSION,
  type: "snapshot",
  gameType: "goldrush",
  phase: "countdown",
  tick: 5,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 2_100,
  players: playerSeeds.map((seed, index) => ({
    gameType: "goldrush",
    id: seed.id,
    name: seed.name,
    avatarId: seed.avatarId,
    gold: 0,
    rank: index + 1,
    correctAnswers: 0,
    wrongAnswers: 0,
    status: index === 4 ? "disconnected" : "connected"
  }))
};

export const previewGoldRushLiveSnapshot: GoldRushSnapshotEvent = {
  v: PROTOCOL_VERSION,
  type: "snapshot",
  gameType: "goldrush",
  phase: "live",
  tick: 119,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 47_920,
  players: [
    { gameType: "goldrush", id: playerSeeds[1].id, name: playerSeeds[1].name, avatarId: playerSeeds[1].avatarId, gold: 545, rank: 1, correctAnswers: 9, wrongAnswers: 1, status: "connected" },
    { gameType: "goldrush", id: playerSeeds[0].id, name: playerSeeds[0].name, avatarId: playerSeeds[0].avatarId, gold: 510, rank: 2, correctAnswers: 8, wrongAnswers: 1, status: "connected" },
    { gameType: "goldrush", id: playerSeeds[5].id, name: playerSeeds[5].name, avatarId: playerSeeds[5].avatarId, gold: 480, rank: 3, correctAnswers: 8, wrongAnswers: 2, status: "connected" },
    { gameType: "goldrush", id: playerSeeds[2].id, name: playerSeeds[2].name, avatarId: playerSeeds[2].avatarId, gold: 430, rank: 4, correctAnswers: 7, wrongAnswers: 2, status: "connected" },
    { gameType: "goldrush", id: playerSeeds[3].id, name: playerSeeds[3].name, avatarId: playerSeeds[3].avatarId, gold: 390, rank: 5, correctAnswers: 6, wrongAnswers: 3, status: "connected" },
    { gameType: "goldrush", id: playerSeeds[4].id, name: playerSeeds[4].name, avatarId: playerSeeds[4].avatarId, gold: 300, rank: 6, correctAnswers: 5, wrongAnswers: 4, status: "disconnected" }
  ]
};

export const previewQuizDashPreviousSnapshot: QuizDashSnapshotEvent = {
  v: PROTOCOL_VERSION,
  type: "snapshot",
  gameType: "quizdash",
  phase: "live",
  tick: 112,
  serverTimeMs: FIXTURE_TIME - 450,
  remainingMs: 48_300,
  players: [
    { gameType: "quizdash", id: playerSeeds[0].id, name: playerSeeds[0].name, avatarId: playerSeeds[0].avatarId, distance: 136.2, rank: 1, correctAnswers: 12, wrongAnswers: 2, status: "connected" },
    { gameType: "quizdash", id: playerSeeds[1].id, name: playerSeeds[1].name, avatarId: playerSeeds[1].avatarId, distance: 132.1, rank: 2, correctAnswers: 11, wrongAnswers: 3, status: "connected" },
    { gameType: "quizdash", id: playerSeeds[2].id, name: playerSeeds[2].name, avatarId: playerSeeds[2].avatarId, distance: 126.8, rank: 3, correctAnswers: 10, wrongAnswers: 4, status: "connected" },
    { gameType: "quizdash", id: playerSeeds[3].id, name: playerSeeds[3].name, avatarId: playerSeeds[3].avatarId, distance: 118.4, rank: 4, correctAnswers: 9, wrongAnswers: 5, status: "connected" },
    { gameType: "quizdash", id: playerSeeds[4].id, name: playerSeeds[4].name, avatarId: playerSeeds[4].avatarId, distance: 111.1, rank: 5, correctAnswers: 8, wrongAnswers: 6, status: "connected" },
    { gameType: "quizdash", id: playerSeeds[5].id, name: playerSeeds[5].name, avatarId: playerSeeds[5].avatarId, distance: 104.7, rank: 6, correctAnswers: 7, wrongAnswers: 7, status: "connected" }
  ]
};

export const previewQuizDashLiveSnapshot: QuizDashSnapshotEvent = {
  ...previewQuizDashPreviousSnapshot,
  tick: 119,
  serverTimeMs: FIXTURE_TIME,
  remainingMs: 47_920,
  players: [
    { gameType: "quizdash", id: playerSeeds[0].id, name: playerSeeds[0].name, avatarId: playerSeeds[0].avatarId, distance: 142.8, rank: 1, correctAnswers: 13, wrongAnswers: 2, status: "connected" },
    { gameType: "quizdash", id: playerSeeds[1].id, name: playerSeeds[1].name, avatarId: playerSeeds[1].avatarId, distance: 138.3, rank: 2, correctAnswers: 12, wrongAnswers: 3, status: "connected" },
    { gameType: "quizdash", id: playerSeeds[2].id, name: playerSeeds[2].name, avatarId: playerSeeds[2].avatarId, distance: 130.9, rank: 3, correctAnswers: 11, wrongAnswers: 4, status: "connected" },
    { gameType: "quizdash", id: playerSeeds[3].id, name: playerSeeds[3].name, avatarId: playerSeeds[3].avatarId, distance: 121.6, rank: 4, correctAnswers: 10, wrongAnswers: 5, status: "connected" },
    { gameType: "quizdash", id: playerSeeds[4].id, name: playerSeeds[4].name, avatarId: playerSeeds[4].avatarId, distance: 114.8, rank: 5, correctAnswers: 9, wrongAnswers: 6, status: "disconnected" },
    { gameType: "quizdash", id: playerSeeds[5].id, name: playerSeeds[5].name, avatarId: playerSeeds[5].avatarId, distance: 108.5, rank: 6, correctAnswers: 8, wrongAnswers: 7, status: "connected" }
  ]
};

export const previewChaosEvents: ChaosEvent[] = [
  {
    v: PROTOCOL_VERSION,
    type: "chaos_event",
    gameType: "goldrush",
    actor: { playerId: playerSeeds[0].id, name: playerSeeds[0].name, avatarId: playerSeeds[0].avatarId, rank: 2, gold: 510 },
    target: { playerId: playerSeeds[1].id, name: playerSeeds[1].name, avatarId: playerSeeds[1].avatarId, rank: 1, gold: 545 },
    outcome: makeOutcome({
      kind: "reward",
      title: "Heist chest",
      detail: "Ava stole 109 gold from Liam.",
      effectType: "gold_steal",
      goldDelta: 109
    }),
    at: FIXTURE_TIME
  },
  {
    v: PROTOCOL_VERSION,
    type: "chaos_event",
    gameType: "goldrush",
    actor: { playerId: playerSeeds[5].id, name: playerSeeds[5].name, avatarId: playerSeeds[5].avatarId, rank: 3, gold: 480 },
    outcome: makeOutcome({
      kind: "reward",
      title: "Multiplier chest",
      detail: "Leo multiplied his vault and gained 160 gold.",
      effectType: "gold_multiplier",
      goldDelta: 160
    }),
    at: FIXTURE_TIME - 1_000
  }
];

function makeGoldRushPlayerState(partial: Partial<GoldRushPlayerStateEvent>): GoldRushPlayerStateEvent {
  return {
    v: PROTOCOL_VERSION,
    type: "player_state",
    gameType: "goldrush",
    phase: "live",
    playerId: playerSeeds[0].id,
    gold: 510,
    rank: 2,
    correctAnswers: 8,
    wrongAnswers: 1,
    chaosTriggers: 2,
    lockoutEndsAt: null,
    pendingChestPick: false,
    pendingTargetPick: false,
    availableTargets: [],
    currentQuestion: QUESTION_BANK[2]
      ? {
          id: QUESTION_BANK[2].id,
          prompt: QUESTION_BANK[2].prompt,
          format: QUESTION_BANK[2].format,
          options: QUESTION_BANK[2].options
        }
      : null,
    recentOutcome: null,
    ...partial
  };
}

export const previewGoldRushPlayerQuestionState = makeGoldRushPlayerState({});

export const previewGoldRushPlayerChestState = makeGoldRushPlayerState({
  pendingChestPick: true,
  currentQuestion: null,
  recentOutcome: makeOutcome({
    kind: "correct",
    title: "Correct",
    detail: "Pick 1 of 3 hidden chests."
  })
});

export const previewGoldRushPlayerTargetState = makeGoldRushPlayerState({
  pendingTargetPick: true,
  currentQuestion: null,
  availableTargets: [
    makeTargetCandidate(playerSeeds[1]),
    makeTargetCandidate(playerSeeds[5]),
    makeTargetCandidate(playerSeeds[2])
  ],
  recentOutcome: makeOutcome({
    kind: "reward",
    title: "Heist chest",
    detail: "Pick 1 of the top vaults to rob.",
    effectType: "gold_steal"
  })
});

export const previewGoldRushPlayerLockoutState = makeGoldRushPlayerState({
  wrongAnswers: 2,
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

export const previewGoldRushPlayerEffectState = makeGoldRushPlayerState({
  gold: 619,
  rank: 1,
  correctAnswers: 10,
  chaosTriggers: 4,
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
    detail: "You stole 109 gold from Liam.",
    effectType: "gold_steal",
    goldDelta: 109
  })
});

function makeQuizDashPlayerState(partial: Partial<QuizDashPlayerStateEvent>): QuizDashPlayerStateEvent {
  return {
    v: PROTOCOL_VERSION,
    type: "player_state",
    gameType: "quizdash",
    phase: "live",
    playerId: playerSeeds[0].id,
    pendingChestPick: false,
    pendingTargetPick: false,
    availableTargets: [],
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

export const previewQuizDashPlayerQuestionState = makeQuizDashPlayerState({});

export const previewQuizDashPlayerChestState = makeQuizDashPlayerState({
  pendingChestPick: true,
  currentQuestion: null,
  recentOutcome: makeOutcome({
    kind: "correct",
    title: "Correct",
    detail: "Pick 1 of 3 hidden chests."
  })
});

export const previewQuizDashPlayerTargetState = makeQuizDashPlayerState({
  pendingTargetPick: true,
  currentQuestion: null,
  availableTargets: [
    makeTargetCandidate(playerSeeds[1]),
    makeTargetCandidate(playerSeeds[2]),
    makeTargetCandidate(playerSeeds[3])
  ],
  recentOutcome: makeOutcome({
    kind: "reward",
    title: "Heist chest",
    detail: "Pick 1 of the top racers to steal from.",
    effectType: "distance_steal"
  })
});

export const previewQuizDashPlayerEffectState = makeQuizDashPlayerState({
  currentQuestion: QUESTION_BANK[1]
    ? {
        id: QUESTION_BANK[1].id,
        prompt: QUESTION_BANK[1].prompt,
        format: QUESTION_BANK[1].format,
        options: QUESTION_BANK[1].options
      }
    : null,
  recentOutcome: makeOutcome({
    kind: "reward",
    title: "Heist chest",
    detail: "You stole 20.0m from Liam.",
    effectType: "distance_steal",
    distanceDelta: 20
  })
});

export const previewGoldRushFinishedEvent: MatchFinishedEvent = {
  v: PROTOCOL_VERSION,
  type: "match_finished",
  gameType: "goldrush",
  matchId: "match_goldrush_preview_001",
  winners: previewGoldRushLiveSnapshot.players.slice(0, 3).map((player) => player.id),
  standings: previewGoldRushLiveSnapshot.players.map((player) => ({
    gameType: "goldrush",
    playerId: player.id,
    name: player.name,
    avatarId: player.avatarId,
    rank: player.rank,
    gold: player.gold,
    correctAnswers: player.correctAnswers,
    wrongAnswers: player.wrongAnswers,
    chaosTriggers: Math.max(1, Math.floor(player.correctAnswers / 2))
  }))
};

export const previewQuizDashFinishedEvent: MatchFinishedEvent = {
  v: PROTOCOL_VERSION,
  type: "match_finished",
  gameType: "quizdash",
  matchId: "match_quizdash_preview_001",
  winners: previewQuizDashLiveSnapshot.players.slice(0, 3).map((player) => player.id),
  standings: previewQuizDashLiveSnapshot.players.map((player) => ({
    gameType: "quizdash",
    playerId: player.id,
    name: player.name,
    avatarId: player.avatarId,
    rank: player.rank,
    distance: player.distance,
    correctAnswers: player.correctAnswers,
    wrongAnswers: player.wrongAnswers
  }))
};

export const previewGoldRushMatchResult: GoldRushMatchResult = {
  matchId: "match_goldrush_preview_001",
  sessionId: "session_goldrush_preview_001",
  code: "GOLD5",
  gameType: "goldrush",
  startedAt: FIXTURE_TIME - 120_000,
  endedAt: FIXTURE_TIME,
  durationMs: 120_000,
  playerCount: previewGoldRushFinishedEvent.standings.length,
  winners: previewGoldRushFinishedEvent.winners,
  standings: previewGoldRushFinishedEvent.standings,
  stats: {
    totalCorrectAnswers: previewGoldRushFinishedEvent.standings.reduce((total, standing) => total + standing.correctAnswers, 0),
    totalWrongAnswers: previewGoldRushFinishedEvent.standings.reduce((total, standing) => total + standing.wrongAnswers, 0),
    totalChaosTriggers: previewGoldRushFinishedEvent.standings.reduce((total, standing) => total + standing.chaosTriggers, 0),
    totalGoldInPlay: previewGoldRushFinishedEvent.standings.reduce((total, standing) => total + standing.gold, 0),
    winningGold: previewGoldRushFinishedEvent.standings[0]?.gold ?? 0
  }
};

export const previewQuizDashMatchResult: QuizDashMatchResult = {
  matchId: "match_quizdash_preview_001",
  sessionId: "session_quizdash_preview_001",
  code: "QUIZ5",
  gameType: "quizdash",
  startedAt: FIXTURE_TIME - 120_000,
  endedAt: FIXTURE_TIME,
  durationMs: 120_000,
  playerCount: previewQuizDashFinishedEvent.standings.length,
  winners: previewQuizDashFinishedEvent.winners,
  standings: previewQuizDashFinishedEvent.standings,
  stats: {
    totalCorrectAnswers: previewQuizDashFinishedEvent.standings.reduce((total, standing) => total + standing.correctAnswers, 0),
    totalWrongAnswers: previewQuizDashFinishedEvent.standings.reduce((total, standing) => total + standing.wrongAnswers, 0),
    winningDistance: previewQuizDashFinishedEvent.standings[0]?.distance ?? 0
  }
};

export const previewAvatarChoices = PLAYER_AVATAR_PRESETS;
