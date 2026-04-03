import type {
  MatchStanding,
  PlayerOutcome,
  PublicQuestion,
  QuestionOption,
  RandomEffectType,
  RewardChoice,
  SessionPlayer
} from "@crowdplay/protocol";

export interface QuestionDefinition extends PublicQuestion {
  correctAnswerId: string;
}

export interface RewardResolution {
  outcome: PlayerOutcome;
  effectType: RandomEffectType | "safe_move";
}

const BOOLEAN_OPTIONS: QuestionOption[] = [
  { id: "true", label: "True" },
  { id: "false", label: "False" }
];

export const SAFE_MOVE_RANGE = { min: 6, max: 14 } as const;
export const RANDOM_EFFECT_RANGE = { min: 4, max: 12 } as const;

export const QUESTION_BANK: QuestionDefinition[] = [
  {
    id: "q_planet_red",
    prompt: "Which planet is known as the Red Planet?",
    format: "mcq",
    options: [
      { id: "mars", label: "Mars" },
      { id: "venus", label: "Venus" },
      { id: "jupiter", label: "Jupiter" },
      { id: "saturn", label: "Saturn" }
    ],
    correctAnswerId: "mars"
  },
  {
    id: "q_ocean_largest",
    prompt: "What is the largest ocean on Earth?",
    format: "mcq",
    options: [
      { id: "pacific", label: "Pacific Ocean" },
      { id: "atlantic", label: "Atlantic Ocean" },
      { id: "indian", label: "Indian Ocean" },
      { id: "arctic", label: "Arctic Ocean" }
    ],
    correctAnswerId: "pacific"
  },
  {
    id: "q_lightning_true",
    prompt: "Lightning is hotter than the surface of the sun.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "true"
  },
  {
    id: "q_japan_capital",
    prompt: "What is the capital city of Japan?",
    format: "mcq",
    options: [
      { id: "tokyo", label: "Tokyo" },
      { id: "kyoto", label: "Kyoto" },
      { id: "osaka", label: "Osaka" },
      { id: "nagoya", label: "Nagoya" }
    ],
    correctAnswerId: "tokyo"
  },
  {
    id: "q_mammal_true",
    prompt: "A dolphin is a mammal.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "true"
  },
  {
    id: "q_author_hobbit",
    prompt: "Who wrote The Hobbit?",
    format: "mcq",
    options: [
      { id: "tolkien", label: "J.R.R. Tolkien" },
      { id: "rowling", label: "J.K. Rowling" },
      { id: "lewis", label: "C.S. Lewis" },
      { id: "martin", label: "George R.R. Martin" }
    ],
    correctAnswerId: "tolkien"
  },
  {
    id: "q_bamboo_true",
    prompt: "Bamboo is a type of grass.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "true"
  },
  {
    id: "q_smallest_prime",
    prompt: "What is the smallest prime number?",
    format: "mcq",
    options: [
      { id: "zero", label: "0" },
      { id: "one", label: "1" },
      { id: "two", label: "2" },
      { id: "three", label: "3" }
    ],
    correctAnswerId: "two"
  },
  {
    id: "q_pacific_true",
    prompt: "The Pacific Ocean is larger than the Atlantic Ocean.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "true"
  },
  {
    id: "q_h2o",
    prompt: "What does H2O represent?",
    format: "mcq",
    options: [
      { id: "salt", label: "Salt" },
      { id: "water", label: "Water" },
      { id: "oxygen", label: "Oxygen" },
      { id: "hydrogen", label: "Hydrogen" }
    ],
    correctAnswerId: "water"
  },
  {
    id: "q_spider_true",
    prompt: "Spiders have six legs.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "false"
  },
  {
    id: "q_fastest_land",
    prompt: "Which animal is the fastest on land?",
    format: "mcq",
    options: [
      { id: "cheetah", label: "Cheetah" },
      { id: "lion", label: "Lion" },
      { id: "horse", label: "Horse" },
      { id: "gazelle", label: "Gazelle" }
    ],
    correctAnswerId: "cheetah"
  }
];

export function buildStandings(players: SessionPlayer[]): MatchStanding[] {
  return [...players]
    .sort((left, right) => {
      if (right.distance !== left.distance) {
        return right.distance - left.distance;
      }

      if (right.correctAnswers !== left.correctAnswers) {
        return right.correctAnswers - left.correctAnswers;
      }

      return left.joinedAt - right.joinedAt;
    })
    .map((player, index) => ({
      playerId: player.playerId,
      name: player.name,
      avatarId: player.avatarId,
      rank: index + 1,
      distance: roundNumber(player.distance),
      correctAnswers: player.correctAnswers,
      wrongAnswers: player.wrongAnswers,
      effectsTriggered: player.effectCount
    }));
}

export function syncRanks(players: SessionPlayer[]): MatchStanding[] {
  const standings = buildStandings(players);
  standings.forEach((standing, index) => {
    const player = players.find((candidate) => candidate.playerId === standing.playerId);
    if (player) {
      player.rank = index + 1;
    }
  });
  return standings;
}

export function getQuestionForPlayer(player: Pick<SessionPlayer, "questionCursor" | "questionSeed">): PublicQuestion {
  return toPublicQuestion(getQuestionDefinitionForPlayer(player));
}

export function getQuestionDefinitionForPlayer(player: Pick<SessionPlayer, "questionCursor" | "questionSeed">): QuestionDefinition {
  const index = (player.questionSeed + player.questionCursor) % QUESTION_BANK.length;
  return QUESTION_BANK[index]!;
}

export function evaluateAnswer(player: Pick<SessionPlayer, "questionCursor" | "questionSeed">, questionId: string, answerId: string): boolean {
  const question = getQuestionDefinitionForPlayer(player);
  return question.id === questionId && question.correctAnswerId === answerId;
}

export function applyRewardChoice(players: SessionPlayer[], actor: SessionPlayer, choice: RewardChoice, seed: string): RewardResolution {
  if (choice === "move") {
    const amount = rollDeterministicInt(`${seed}:safe_move`, SAFE_MOVE_RANGE.min, SAFE_MOVE_RANGE.max);
    movePlayer(actor, amount);
    syncRanks(players);
    return {
      effectType: "safe_move",
      outcome: {
        kind: "reward",
        title: "Clean getaway",
        detail: `You surged ahead by ${amount.toFixed(1)}m.`,
        distanceDelta: amount,
        at: Date.now()
      }
    };
  }

  const effectType = pickEffectType(seed);

  if (effectType === "move") {
    const amount = rollDeterministicInt(`${seed}:effect_move`, RANDOM_EFFECT_RANGE.min + 2, RANDOM_EFFECT_RANGE.max + 4);
    actor.effectCount += 1;
    movePlayer(actor, amount);
    syncRanks(players);
    return {
      effectType,
      outcome: {
        kind: "reward",
        title: "Turbo chest",
        detail: `Chaos helped. You blasted forward ${amount.toFixed(1)}m.`,
        effectType,
        distanceDelta: amount,
        at: Date.now()
      }
    };
  }

  if (effectType === "trap") {
    const amount = rollDeterministicInt(`${seed}:trap`, RANDOM_EFFECT_RANGE.min, RANDOM_EFFECT_RANGE.max);
    actor.effectCount += 1;
    loseDistance(actor, amount);
    syncRanks(players);
    return {
      effectType,
      outcome: {
        kind: "reward",
        title: "Trap chest",
        detail: `Bad luck. You lost ${amount.toFixed(1)}m.`,
        effectType,
        distanceDelta: -amount,
        at: Date.now()
      }
    };
  }

  const target = getEffectTarget(players, actor);
  if (!target) {
    const fallbackAmount = rollDeterministicInt(`${seed}:fallback`, SAFE_MOVE_RANGE.min, SAFE_MOVE_RANGE.max);
    actor.effectCount += 1;
    movePlayer(actor, fallbackAmount);
    syncRanks(players);
    return {
      effectType: "move",
      outcome: {
        kind: "reward",
        title: "Lucky fallback",
        detail: `No target available, so you still gained ${fallbackAmount.toFixed(1)}m.`,
        effectType: "move",
        distanceDelta: fallbackAmount,
        at: Date.now()
      }
    };
  }

  if (effectType === "steal") {
    const amount = Math.min(
      target.distance,
      rollDeterministicInt(`${seed}:steal`, RANDOM_EFFECT_RANGE.min, RANDOM_EFFECT_RANGE.max)
    );
    actor.effectCount += 1;
    loseDistance(target, amount);
    movePlayer(actor, amount);
    syncRanks(players);
    return {
      effectType,
      outcome: {
        kind: "reward",
        title: "Heist chest",
        detail: `You stole ${amount.toFixed(1)}m from ${target.name}.`,
        effectType,
        distanceDelta: amount,
        at: Date.now()
      }
    };
  }

  actor.effectCount += 1;
  const actorDistance = actor.distance;
  actor.distance = target.distance;
  target.distance = actorDistance;
  actor.distanceGained += Math.max(0, actor.distance - actorDistance);
  actor.distanceLost += Math.max(0, actorDistance - actor.distance);
  target.distanceGained += Math.max(0, target.distance - actorDistance);
  target.distanceLost += Math.max(0, actorDistance - target.distance);
  syncRanks(players);
  return {
    effectType,
    outcome: {
      kind: "reward",
      title: "Swap chest",
      detail: `You swapped places with ${target.name}.`,
      effectType,
      distanceDelta: roundNumber(actor.distance - actorDistance),
      at: Date.now()
    }
  };
}

export function movePlayer(player: SessionPlayer, amount: number): void {
  const safeAmount = Math.max(0, roundNumber(amount));
  player.distance = roundNumber(player.distance + safeAmount);
  player.distanceGained = roundNumber(player.distanceGained + safeAmount);
}

export function loseDistance(player: SessionPlayer, amount: number): void {
  const safeAmount = Math.max(0, roundNumber(amount));
  const actualLoss = Math.min(player.distance, safeAmount);
  player.distance = roundNumber(player.distance - actualLoss);
  player.distanceLost = roundNumber(player.distanceLost + actualLoss);
}

export function isLockoutActive(player: Pick<SessionPlayer, "lockoutUntil">, now: number): boolean {
  return player.lockoutUntil !== null && player.lockoutUntil > now;
}

export function clearExpiredLockout(player: SessionPlayer, now: number): void {
  if (player.lockoutUntil !== null && player.lockoutUntil <= now) {
    player.lockoutUntil = null;
  }
}

export function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function toPublicQuestion(question: QuestionDefinition): PublicQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    format: question.format,
    options: question.options
  };
}

function pickEffectType(seed: string): RandomEffectType {
  const effectIndex = rollDeterministicInt(`${seed}:effect`, 0, 3);
  return ["move", "swap", "steal", "trap"][effectIndex] as RandomEffectType;
}

function getEffectTarget(players: SessionPlayer[], actor: SessionPlayer): SessionPlayer | null {
  const standings = buildStandings(players);
  const actorIndex = standings.findIndex((standing) => standing.playerId === actor.playerId);
  if (actorIndex === -1 || standings.length <= 1) {
    return null;
  }

  const higher = standings[actorIndex - 1];
  if (higher) {
    return players.find((player) => player.playerId === higher.playerId) ?? null;
  }

  const lower = standings[actorIndex + 1];
  if (lower) {
    return players.find((player) => player.playerId === lower.playerId) ?? null;
  }

  return null;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function rollDeterministicInt(seed: string, min: number, max: number): number {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const range = safeMax - safeMin + 1;
  return safeMin + (hashSeed(seed) % range);
}
