import { z } from "zod";

export const PROTOCOL_VERSION = 1;
export const GAME_PHASES = ["lobby", "countdown", "live", "finished", "archived", "expired"] as const;
export const PLAYER_STATUSES = ["connected", "disconnected", "finished", "kicked"] as const;
export const QUESTION_FORMATS = ["mcq", "boolean"] as const;
export const REWARD_CHOICES = ["move", "effect"] as const;
export const RANDOM_EFFECT_TYPES = ["move", "swap", "steal", "trap"] as const;

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

export type GamePhase = (typeof GAME_PHASES)[number];
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];
export type PlayerAvatarId = (typeof PLAYER_AVATAR_PRESETS)[number]["id"];
export type QuestionFormat = (typeof QUESTION_FORMATS)[number];
export type RewardChoice = (typeof REWARD_CHOICES)[number];
export type RandomEffectType = (typeof RANDOM_EFFECT_TYPES)[number];

export const playerAvatarIdSchema = z.enum(PLAYER_AVATAR_PRESETS.map((preset) => preset.id) as [PlayerAvatarId, ...PlayerAvatarId[]]);
export const questionFormatSchema = z.enum(QUESTION_FORMATS);
export const rewardChoiceSchema = z.enum(REWARD_CHOICES);
export const randomEffectTypeSchema = z.enum(RANDOM_EFFECT_TYPES);

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

export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type PublicQuestion = z.infer<typeof publicQuestionSchema>;

export const playerOutcomeSchema = z.object({
  kind: z.enum(["correct", "wrong", "reward"]),
  title: z.string(),
  detail: z.string(),
  effectType: randomEffectTypeSchema.optional(),
  distanceDelta: z.number().optional(),
  at: z.number().int()
});

export type PlayerOutcome = z.infer<typeof playerOutcomeSchema>;

export const sessionConfigSchema = z.object({
  gameType: z.literal("quizdash").default("quizdash"),
  playerLimit: z.number().int().min(2).max(50).default(50),
  raceDurationMs: z.number().int().min(30_000).max(300_000).default(120_000),
  countdownMs: z.number().int().min(1_000).max(10_000).default(3_000),
  tickRateHz: z.number().int().min(5).max(30).default(15),
  snapshotRateHz: z.number().int().min(2).max(20).default(10),
  lockoutMs: z.number().int().min(1_000).max(10_000).default(4_000)
});

export type SessionConfig = z.infer<typeof sessionConfigSchema>;

export interface SessionPlayer {
  playerId: string;
  name: string;
  avatarId: PlayerAvatarId;
  joinedAt: number;
  connected: boolean;
  lastSeenAt: number;
  distance: number;
  rank: number;
  status: PlayerStatus;
  questionCursor: number;
  questionSeed: number;
  correctAnswers: number;
  wrongAnswers: number;
  effectCount: number;
  distanceGained: number;
  distanceLost: number;
  lockoutUntil: number | null;
  pendingRewardChoice: boolean;
  recentOutcome: PlayerOutcome | null;
}

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

export interface MatchStanding {
  playerId: string;
  name: string;
  avatarId: PlayerAvatarId;
  rank: number;
  distance: number;
  correctAnswers: number;
  wrongAnswers: number;
  effectsTriggered: number;
}

export interface MatchResult {
  matchId: string;
  sessionId: string;
  code: string;
  gameType: "quizdash";
  startedAt: number;
  endedAt: number;
  durationMs: number;
  playerCount: number;
  winners: string[];
  standings: MatchStanding[];
  stats: {
    totalCorrectAnswers: number;
    totalWrongAnswers: number;
    totalEffectsTriggered: number;
    winningDistance: number;
  };
}

export interface SnapshotPlayer {
  id: string;
  name: string;
  avatarId: PlayerAvatarId;
  d: number;
  r: number;
  correctAnswers: number;
  wrongAnswers: number;
  status: PlayerStatus;
}

export interface RosterPlayer {
  id: string;
  name: string;
  avatarId: PlayerAvatarId;
  connected: boolean;
  rank: number;
  distance: number;
}

export const createSessionRequestSchema = z.object({
  playerLimit: z.number().int().min(2).max(50).optional(),
  raceDurationMs: z.number().int().min(30_000).max(300_000).optional(),
  countdownMs: z.number().int().min(1_000).max(10_000).optional(),
  lockoutMs: z.number().int().min(1_000).max(10_000).optional()
});

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

export const clientRewardChoiceEventSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal("reward_choice"),
  choice: rewardChoiceSchema
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
  clientRewardChoiceEventSchema,
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
  players: RosterPlayer[];
};

export type PhaseChangedEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "phase_changed";
  phase: GamePhase;
  countdownMs?: number;
  remainingMs?: number;
};

export type SnapshotEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "snapshot";
  phase: GamePhase;
  tick: number;
  serverTimeMs: number;
  remainingMs: number;
  players: SnapshotPlayer[];
};

export type PlayerStateEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "player_state";
  phase: GamePhase;
  playerId: string;
  distance: number;
  rank: number;
  correctAnswers: number;
  wrongAnswers: number;
  effectsTriggered: number;
  lockoutEndsAt: number | null;
  pendingRewardChoice: boolean;
  currentQuestion: PublicQuestion | null;
  recentOutcome: PlayerOutcome | null;
};

export type MatchFinishedEvent = {
  v: typeof PROTOCOL_VERSION;
  type: "match_finished";
  matchId: string;
  winners: string[];
  standings: MatchStanding[];
};

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
  | MatchFinishedEvent
  | ErrorEvent
  | PongEvent;

export const defaultSessionConfig: SessionConfig = {
  gameType: "quizdash",
  playerLimit: 50,
  raceDurationMs: 120_000,
  countdownMs: 3_000,
  tickRateHz: 15,
  snapshotRateHz: 10,
  lockoutMs: 4_000
};

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

export function safeParseServerEvent(payload: unknown): ServerEvent | null {
  if (!payload || typeof payload !== "object" || !("type" in payload)) {
    return null;
  }

  return payload as ServerEvent;
}
