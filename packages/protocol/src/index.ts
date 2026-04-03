import { z } from "zod";

export const PROTOCOL_VERSION = 1;
export const GAME_TYPES = ["goldrush", "quizdash"] as const;
export const GAME_PHASES = ["lobby", "countdown", "live", "finished", "archived", "expired"] as const;
export const PLAYER_STATUSES = ["connected", "disconnected", "finished", "kicked"] as const;
export const QUESTION_FORMATS = ["mcq", "boolean"] as const;
export const CHEST_EFFECT_TYPES = [
  "gold_gain",
  "gold_multiplier",
  "gold_steal",
  "gold_swap",
  "gold_loss",
  "distance_gain",
  "distance_multiplier",
  "distance_steal",
  "distance_swap",
  "distance_loss"
] as const;

export const PLAYER_AVATAR_PRESETS = [
  { id: "fox", label: "Fox", accentHex: "#f59e0b", shadowHex: "#d97706" },
  { id: "panda", label: "Panda", accentHex: "#38bdf8", shadowHex: "#0284c7" },
  { id: "tiger", label: "Tiger", accentHex: "#fb7185", shadowHex: "#e11d48" },
  { id: "frog", label: "Frog", accentHex: "#a3e635", shadowHex: "#65a30d" },
  { id: "owl", label: "Owl", accentHex: "#818cf8", shadowHex: "#4f46e5" },
  { id: "shark", label: "Shark", accentHex: "#22d3ee", shadowHex: "#0891b2" }
] as const;

const LEGACY_COLOR_TO_AVATAR = {
  cyan: "shark",
  amber: "fox",
  rose: "tiger",
  lime: "frog",
  violet: "owl",
  pink: "panda"
} as const;

export type GameType = (typeof GAME_TYPES)[number];
export type GamePhase = (typeof GAME_PHASES)[number];
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];
export type PlayerAvatarId = (typeof PLAYER_AVATAR_PRESETS)[number]["id"];
export type QuestionFormat = (typeof QUESTION_FORMATS)[number];
export type ChestEffectType = (typeof CHEST_EFFECT_TYPES)[number];

export const playerAvatarIdSchema = z.enum(PLAYER_AVATAR_PRESETS.map((preset) => preset.id) as [PlayerAvatarId, ...PlayerAvatarId[]]);
export const questionFormatSchema = z.enum(QUESTION_FORMATS);
export const chestEffectTypeSchema = z.enum(CHEST_EFFECT_TYPES);

export const questionOptionSchema = z.object({
  id: z.string(),
  label: z.string()
});

export const publicQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  format: questionFormatSchema,
  options: z.array(questionOptionSchema).min(2).max(4)
});

export const targetCandidateSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  avatarId: playerAvatarIdSchema
});

export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type PublicQuestion = z.infer<typeof publicQuestionSchema>;
export type TargetCandidate = z.infer<typeof targetCandidateSchema>;

export const playerOutcomeSchema = z.object({
  kind: z.enum(["correct", "wrong", "reward"]),
  title: z.string(),
  detail: z.string(),
  effectType: chestEffectTypeSchema.optional(),
  goldDelta: z.number().optional(),
  distanceDelta: z.number().optional(),
  at: z.number().int()
});

export type PlayerOutcome = z.infer<typeof playerOutcomeSchema>;

export type PendingGoldRushChestOutcome =
  | { effectType: "gold_gain"; goldAmount: number }
  | { effectType: "gold_multiplier"; multiplier: number; minimumGain: number }
  | { effectType: "gold_steal"; percentage: number; minimumGold: number; maximumGold: number }
  | { effectType: "gold_swap" }
  | { effectType: "gold_loss"; percentage: number; minimumGold: number; maximumGold: number };

export type PendingQuizDashChestOutcome =
  | { effectType: "distance_gain"; distanceAmount: number }
  | { effectType: "distance_multiplier"; multiplier: number; minimumGain: number }
  | { effectType: "distance_steal"; percentage: number; minimumDistance: number; maximumDistance: number }
  | { effectType: "distance_swap" }
  | { effectType: "distance_loss"; percentage: number; minimumDistance: number; maximumDistance: number };

export const goldRushSessionConfigSchema = z.object({
  gameType: z.literal("goldrush"),
  playerLimit: z.number().int().min(2).max(50).default(50),
  matchDurationMs: z.number().int().min(30_000).max(300_000).default(120_000),
  countdownMs: z.number().int().min(1_000).max(10_000).default(3_000),
  tickRateHz: z.number().int().min(5).max(30).default(15),
  snapshotRateHz: z.number().int().min(2).max(20).default(10),
  lockoutMs: z.number().int().min(1_000).max(10_000).default(4_000)
});

export const quizDashSessionConfigSchema = z.object({
  gameType: z.literal("quizdash"),
  playerLimit: z.number().int().min(2).max(50).default(50),
  raceDurationMs: z.number().int().min(30_000).max(300_000).default(120_000),
  countdownMs: z.number().int().min(1_000).max(10_000).default(3_000),
  tickRateHz: z.number().int().min(5).max(30).default(15),
  snapshotRateHz: z.number().int().min(2).max(20).default(10)
});

export const sessionConfigSchema = z.discriminatedUnion("gameType", [goldRushSessionConfigSchema, quizDashSessionConfigSchema]);

export type GoldRushSessionConfig = z.infer<typeof goldRushSessionConfigSchema>;
export type QuizDashSessionConfig = z.infer<typeof quizDashSessionConfigSchema>;
export type SessionConfig = z.infer<typeof sessionConfigSchema>;

interface BaseSessionPlayer {
  playerId: string;
  name: string;
  avatarId: PlayerAvatarId;
  joinedAt: number;
  connected: boolean;
  lastSeenAt: number;
  rank: number;
  status: PlayerStatus;
}

export interface GoldRushSessionPlayer extends BaseSessionPlayer {
  gameType: "goldrush";
  gold: number;
  questionCursor: number;
  questionSeed: number;
  correctAnswers: number;
  wrongAnswers: number;
  chaosTriggerCount: number;
  goldGained: number;
  goldLost: number;
  lockoutUntil: number | null;
  pendingChestPick: boolean;
  pendingTargetPick: boolean;
  pendingChestOutcome: PendingGoldRushChestOutcome | null;
  availableTargets: TargetCandidate[];
  recentOutcome: PlayerOutcome | null;
}

export interface QuizDashSessionPlayer extends BaseSessionPlayer {
  gameType: "quizdash";
  distance: number;
  questionCursor: number;
  questionSeed: number;
  correctAnswers: number;
  wrongAnswers: number;
  chaosTriggerCount: number;
  distanceGained: number;
  distanceLost: number;
  pendingChestPick: boolean;
  pendingTargetPick: boolean;
  pendingChestOutcome: PendingQuizDashChestOutcome | null;
  availableTargets: TargetCandidate[];
  recentOutcome: PlayerOutcome | null;
}

export type SessionPlayer = GoldRushSessionPlayer | QuizDashSessionPlayer;

export interface GameSessionSummary {
  sessionId: string;
  code: string;
  phase: GamePhase;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  playerCount: number;
  config: SessionConfig;
}

export interface GoldRushMatchStanding {
  gameType: "goldrush";
  playerId: string;
  name: string;
  avatarId: PlayerAvatarId;
  rank: number;
  gold: number;
  correctAnswers: number;
  wrongAnswers: number;
  chaosTriggers: number;
}

export interface QuizDashMatchStanding {
  gameType: "quizdash";
  playerId: string;
  name: string;
  avatarId: PlayerAvatarId;
  rank: number;
  distance: number;
  correctAnswers: number;
  wrongAnswers: number;
}

export type MatchStanding = GoldRushMatchStanding | QuizDashMatchStanding;

export interface GoldRushMatchResult {
  matchId: string;
  sessionId: string;
  code: string;
  gameType: "goldrush";
  startedAt: number;
  endedAt: number;
  durationMs: number;
  playerCount: number;
  winners: string[];
  standings: GoldRushMatchStanding[];
  stats: {
    totalCorrectAnswers: number;
    totalWrongAnswers: number;
    totalChaosTriggers: number;
    totalGoldInPlay: number;
    winningGold: number;
  };
}

export interface QuizDashMatchResult {
  matchId: string;
  sessionId: string;
  code: string;
  gameType: "quizdash";
  startedAt: number;
  endedAt: number;
  durationMs: number;
  playerCount: number;
  winners: string[];
  standings: QuizDashMatchStanding[];
  stats: {
    totalCorrectAnswers: number;
    totalWrongAnswers: number;
    winningDistance: number;
  };
}

export type MatchResult = GoldRushMatchResult | QuizDashMatchResult;

export interface GoldRushSnapshotPlayer {
  gameType: "goldrush";
  id: string;
  name: string;
  avatarId: PlayerAvatarId;
  gold: number;
  rank: number;
  correctAnswers: number;
  wrongAnswers: number;
  status: PlayerStatus;
}

export interface QuizDashSnapshotPlayer {
  gameType: "quizdash";
  id: string;
  name: string;
  avatarId: PlayerAvatarId;
  distance: number;
  rank: number;
  correctAnswers: number;
  wrongAnswers: number;
  status: PlayerStatus;
}

export type SnapshotPlayer = GoldRushSnapshotPlayer | QuizDashSnapshotPlayer;

export interface GoldRushRosterPlayer {
  gameType: "goldrush";
  id: string;
  name: string;
  avatarId: PlayerAvatarId;
  connected: boolean;
  rank: number;
  gold: number;
}

export interface QuizDashRosterPlayer {
  gameType: "quizdash";
  id: string;
  name: string;
  avatarId: PlayerAvatarId;
  connected: boolean;
  rank: number;
  distance: number;
}

export type RosterPlayer = GoldRushRosterPlayer | QuizDashRosterPlayer;

export const createGoldRushSessionRequestSchema = z.object({
  gameType: z.literal("goldrush"),
  playerLimit: z.number().int().min(2).max(50).optional(),
  matchDurationMs: z.number().int().min(30_000).max(300_000).optional(),
  countdownMs: z.number().int().min(1_000).max(10_000).optional(),
  lockoutMs: z.number().int().min(1_000).max(10_000).optional()
});

export const createQuizDashSessionRequestSchema = z.object({
  gameType: z.literal("quizdash"),
  playerLimit: z.number().int().min(2).max(50).optional(),
  raceDurationMs: z.number().int().min(30_000).max(300_000).optional(),
  countdownMs: z.number().int().min(1_000).max(10_000).optional()
});

export const createSessionRequestSchema = z.discriminatedUnion("gameType", [createGoldRushSessionRequestSchema, createQuizDashSessionRequestSchema]);

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

export const joinSessionRequestSchema = z.object({
  name: z.string().trim().min(1).max(24),
  avatarId: playerAvatarIdSchema
});

export const createSessionResponseSchema = z.object({
  sessionId: z.string(),
  code: z.string(),
  hostToken: z.string(),
  summary: z.object({
    sessionId: z.string(),
    code: z.string(),
    phase: z.enum(GAME_PHASES),
    createdAt: z.number(),
    startedAt: z.number().nullable(),
    endedAt: z.number().nullable(),
    playerCount: z.number(),
    config: sessionConfigSchema
  })
});

export type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>;

export const joinSessionResponseSchema = z.object({
  sessionId: z.string(),
  playerId: z.string(),
  playerToken: z.string(),
  summary: z.object({
    sessionId: z.string(),
    code: z.string(),
    phase: z.enum(GAME_PHASES),
    createdAt: z.number(),
    startedAt: z.number().nullable(),
    endedAt: z.number().nullable(),
    playerCount: z.number(),
    config: sessionConfigSchema
  })
});

export type JoinSessionResponse = z.infer<typeof joinSessionResponseSchema>;

export const clientAnswerEventSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal("answer"),
  questionId: z.string(),
  answerId: z.string()
});

export const clientChestPickEventSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal("chest_pick"),
  chestIndex: z.union([z.literal(0), z.literal(1), z.literal(2)])
});

export const clientTargetPickEventSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal("target_pick"),
  targetPlayerId: z.string()
});

export const clientInputEventSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal("input"),
  seq: z.number().int().nonnegative(),
  tapCount: z.number().int().min(0).max(100),
  windowMs: z.number().int().min(10).max(1_000)
});

export const clientHostCommandEventSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal("host_command"),
  command: z.enum(["start_match", "end_match"])
});

export const clientPingEventSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal("ping"),
  at: z.number().int().optional()
});

export const clientEventSchema = z.discriminatedUnion("type", [
  clientAnswerEventSchema,
  clientChestPickEventSchema,
  clientTargetPickEventSchema,
  clientInputEventSchema,
  clientHostCommandEventSchema,
  clientPingEventSchema
]);

export type ClientEvent = z.infer<typeof clientEventSchema>;

export type JoinAckEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "join_ack";
  sessionId: string;
  playerId?: string;
  phase: GamePhase;
  serverTimeMs: number;
  summary: GameSessionSummary;
};

export type RosterUpdateEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "roster_update";
  gameType: GameType;
  players: RosterPlayer[];
};

export type PhaseChangedEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "phase_changed";
  phase: GamePhase;
  countdownMs?: number;
  remainingMs?: number;
};

export type GoldRushSnapshotEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "snapshot";
  gameType: "goldrush";
  phase: GamePhase;
  tick: number;
  serverTimeMs: number;
  remainingMs: number;
  players: GoldRushSnapshotPlayer[];
};

export type QuizDashSnapshotEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "snapshot";
  gameType: "quizdash";
  phase: GamePhase;
  tick: number;
  serverTimeMs: number;
  remainingMs: number;
  players: QuizDashSnapshotPlayer[];
};

export type SnapshotEvent = GoldRushSnapshotEvent | QuizDashSnapshotEvent;

export type GoldRushPlayerStateEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "player_state";
  gameType: "goldrush";
  phase: GamePhase;
  playerId: string;
  gold: number;
  rank: number;
  correctAnswers: number;
  wrongAnswers: number;
  chaosTriggers: number;
  lockoutEndsAt: number | null;
  pendingChestPick: boolean;
  pendingTargetPick: boolean;
  availableTargets: TargetCandidate[];
  currentQuestion: PublicQuestion | null;
  recentOutcome: PlayerOutcome | null;
};

export type QuizDashPlayerStateEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "player_state";
  gameType: "quizdash";
  phase: GamePhase;
  playerId: string;
  pendingChestPick: boolean;
  pendingTargetPick: boolean;
  availableTargets: TargetCandidate[];
  currentQuestion: PublicQuestion | null;
  recentOutcome: PlayerOutcome | null;
};

export type PlayerStateEvent = GoldRushPlayerStateEvent | QuizDashPlayerStateEvent;

export type ChaosEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "chaos_event";
  gameType: "goldrush";
  actor: {
    playerId: string;
    name: string;
    avatarId: PlayerAvatarId;
    rank: number;
    gold: number;
  };
  target?: {
    playerId: string;
    name: string;
    avatarId: PlayerAvatarId;
    rank: number;
    gold: number;
  };
  outcome: PlayerOutcome;
  at: number;
};

export type GoldRushMatchFinishedEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "match_finished";
  gameType: "goldrush";
  matchId: string;
  winners: string[];
  standings: GoldRushMatchStanding[];
};

export type QuizDashMatchFinishedEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "match_finished";
  gameType: "quizdash";
  matchId: string;
  winners: string[];
  standings: QuizDashMatchStanding[];
};

export type MatchFinishedEvent = GoldRushMatchFinishedEvent | QuizDashMatchFinishedEvent;

export type ErrorEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "error";
  code: string;
  message: string;
};

export type PongEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "pong";
  at: number;
};

export type ServerEvent =
  | JoinAckEvent
  | RosterUpdateEvent
  | PhaseChangedEvent
  | SnapshotEvent
  | PlayerStateEvent
  | ChaosEvent
  | MatchFinishedEvent
  | ErrorEvent
  | PongEvent;

export const defaultGoldRushSessionConfig: GoldRushSessionConfig = {
  gameType: "goldrush",
  playerLimit: 50,
  matchDurationMs: 120_000,
  countdownMs: 3_000,
  tickRateHz: 15,
  snapshotRateHz: 10,
  lockoutMs: 4_000
};

export const defaultQuizDashSessionConfig: QuizDashSessionConfig = {
  gameType: "quizdash",
  playerLimit: 50,
  raceDurationMs: 120_000,
  countdownMs: 3_000,
  tickRateHz: 15,
  snapshotRateHz: 10
};

export function getDefaultSessionConfig(gameType: GameType): SessionConfig {
  return gameType === "goldrush" ? defaultGoldRushSessionConfig : defaultQuizDashSessionConfig;
}

export function parseClientEvent(payload: unknown): ClientEvent {
  return clientEventSchema.parse(payload);
}

export function getPlayerAvatarPreset(avatarId: PlayerAvatarId) {
  return PLAYER_AVATAR_PRESETS.find((preset) => preset.id === avatarId) ?? PLAYER_AVATAR_PRESETS[0];
}

export function getPlayerAccentHex(avatarId: PlayerAvatarId): string {
  return getPlayerAvatarPreset(avatarId).accentHex;
}

export function getPlayerShadowHex(avatarId: PlayerAvatarId): string {
  return getPlayerAvatarPreset(avatarId).shadowHex;
}

export function getDefaultPlayerAvatar(index = 0): PlayerAvatarId {
  return PLAYER_AVATAR_PRESETS[index % PLAYER_AVATAR_PRESETS.length].id;
}

export function coercePlayerAvatarId(value: unknown, fallbackIndex = 0): PlayerAvatarId {
  if (typeof value === "string") {
    const avatarMatch = PLAYER_AVATAR_PRESETS.find((preset) => preset.id === value);
    if (avatarMatch) {
      return avatarMatch.id;
    }

    const legacyAvatar = LEGACY_COLOR_TO_AVATAR[value as keyof typeof LEGACY_COLOR_TO_AVATAR];
    if (legacyAvatar) {
      return legacyAvatar;
    }
  }

  return getDefaultPlayerAvatar(fallbackIndex);
}

export function isGoldRushConfig(config: SessionConfig): config is GoldRushSessionConfig {
  return config.gameType === "goldrush";
}

export function isQuizDashConfig(config: SessionConfig): config is QuizDashSessionConfig {
  return config.gameType === "quizdash";
}

export function isGoldRushPlayer(player: SessionPlayer): player is GoldRushSessionPlayer {
  return player.gameType === "goldrush";
}

export function isQuizDashPlayer(player: SessionPlayer): player is QuizDashSessionPlayer {
  return player.gameType === "quizdash";
}

export function safeParseServerEvent(payload: unknown): ServerEvent | null {
  if (!payload || typeof payload !== "object" || !("type" in payload)) {
    return null;
  }

  return payload as ServerEvent;
}
