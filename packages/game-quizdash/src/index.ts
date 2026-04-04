import { QUESTION_BANK, type QuestionDefinition } from "../../game-content/src/index";
import type {
  PendingQuizDashChestOutcome,
  PlayerOutcome,
  PublicQuestion,
  QuizDashMatchStanding,
  QuizDashSessionPlayer,
  TargetCandidate
} from "@crowdplay/protocol";

export { QUESTION_BANK, type QuestionDefinition } from "../../game-content/src/index";

export interface ChestResolution {
  effectType: PendingQuizDashChestOutcome["effectType"];
  outcome: PlayerOutcome;
  target: QuizDashSessionPlayer | null;
}

export function buildStandings(players: QuizDashSessionPlayer[]): QuizDashMatchStanding[] {
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
      gameType: "quizdash",
      playerId: player.playerId,
      name: player.name,
      avatarId: player.avatarId,
      rank: index + 1,
      distance: roundNumber(player.distance),
      correctAnswers: player.correctAnswers,
      wrongAnswers: player.wrongAnswers
    }));
}

export function syncRanks(players: QuizDashSessionPlayer[]): QuizDashMatchStanding[] {
  const standings = buildStandings(players);
  standings.forEach((standing, index) => {
    const player = players.find((candidate) => candidate.playerId === standing.playerId);
    if (player) {
      player.rank = index + 1;
    }
  });
  return standings;
}

export function getQuestionForPlayer(player: Pick<QuizDashSessionPlayer, "questionCursor" | "questionSeed">): PublicQuestion {
  return toPublicQuestion(getQuestionDefinitionForPlayer(player));
}

export function getQuestionDefinitionForPlayer(player: Pick<QuizDashSessionPlayer, "questionCursor" | "questionSeed">): QuestionDefinition {
  const index = (player.questionSeed + player.questionCursor) % QUESTION_BANK.length;
  return QUESTION_BANK[index]!;
}

export function evaluateAnswer(player: Pick<QuizDashSessionPlayer, "questionCursor" | "questionSeed">, questionId: string, answerId: string): boolean {
  const question = getQuestionDefinitionForPlayer(player);
  return question.id === questionId && question.correctAnswerId === answerId;
}

export function createChestOutcome(actor: QuizDashSessionPlayer, chestIndex: number, seedRoot: string): PendingQuizDashChestOutcome {
  const seed = `${seedRoot}:chest:${chestIndex}`;
  const roll = rollDeterministicInt(`${seed}:effect`, 0, 99);

  if (roll < 28) {
    return { effectType: "distance_gain", distanceAmount: 10 };
  }
  if (roll < 48) {
    return { effectType: "distance_gain", distanceAmount: 20 };
  }
  if (roll < 56) {
    return { effectType: "distance_gain", distanceAmount: 35 };
  }
  if (roll < 68) {
    return { effectType: "distance_multiplier", multiplier: 1.5, minimumGain: 12 };
  }
  if (roll < 84) {
    return { effectType: "distance_steal", percentage: 0.2, minimumDistance: 8, maximumDistance: 30 };
  }
  if (roll < 90) {
    return { effectType: "distance_swap" };
  }

  return {
    effectType: "distance_loss",
    percentage: 0.15,
    minimumDistance: actor.distance === 0 ? 0 : 6,
    maximumDistance: 20
  };
}

export function requiresTarget(outcome: PendingQuizDashChestOutcome): boolean {
  return outcome.effectType === "distance_steal" || outcome.effectType === "distance_swap";
}

export function getTopOpponentTargets(players: QuizDashSessionPlayer[], actor: QuizDashSessionPlayer): TargetCandidate[] {
  return buildStandings(players)
    .filter((standing) => standing.playerId !== actor.playerId)
    .slice(0, 3)
    .map((standing) => ({
      playerId: standing.playerId,
      name: standing.name,
      avatarId: standing.avatarId
    }));
}

export function resolveChestOutcome(
  players: QuizDashSessionPlayer[],
  actor: QuizDashSessionPlayer,
  chestOutcome: PendingQuizDashChestOutcome,
  targetPlayerId?: string
): ChestResolution {
  actor.chaosTriggerCount += 1;

  if (chestOutcome.effectType === "distance_gain") {
    const amount = roundNumber(Math.max(0, chestOutcome.distanceAmount));
    addDistance(actor, amount);
    syncRanks(players);
    return {
      effectType: chestOutcome.effectType,
      target: null,
      outcome: {
        kind: "reward",
        title: amount >= 30 ? "Burst chest" : amount >= 20 ? "Turbo chest" : "Quick boost",
        detail: `You gained ${amount.toFixed(1)}m.`,
        effectType: chestOutcome.effectType,
        distanceDelta: amount,
        at: Date.now()
      }
    };
  }

  if (chestOutcome.effectType === "distance_multiplier") {
    const gain = Math.max(roundNumber(actor.distance * (chestOutcome.multiplier - 1)), chestOutcome.minimumGain);
    addDistance(actor, gain);
    syncRanks(players);
    return {
      effectType: chestOutcome.effectType,
      target: null,
      outcome: {
        kind: "reward",
        title: "Multiplier chest",
        detail: `Your lead multiplied. You gained ${gain.toFixed(1)}m.`,
        effectType: chestOutcome.effectType,
        distanceDelta: gain,
        at: Date.now()
      }
    };
  }

  if (chestOutcome.effectType === "distance_loss") {
    const amount = actor.distance <= 0 ? 0 : clamp(roundNumber(actor.distance * chestOutcome.percentage), chestOutcome.minimumDistance, chestOutcome.maximumDistance);
    const actualLoss = removeDistance(actor, amount);
    syncRanks(players);
    return {
      effectType: chestOutcome.effectType,
      target: null,
      outcome: {
        kind: "reward",
        title: "Glitch chest",
        detail: actualLoss > 0 ? `You lost ${actualLoss.toFixed(1)}m.` : "The trap fizzled and you stayed put.",
        effectType: chestOutcome.effectType,
        distanceDelta: -actualLoss,
        at: Date.now()
      }
    };
  }

  const target = targetPlayerId ? players.find((player) => player.playerId === targetPlayerId) ?? null : null;
  if (!target || target.playerId === actor.playerId) {
    addDistance(actor, 20);
    syncRanks(players);
    return {
      effectType: "distance_gain",
      target: null,
      outcome: {
        kind: "reward",
        title: "Fallback chest",
        detail: "Your target slipped away, so you gained 20.0m instead.",
        effectType: "distance_gain",
        distanceDelta: 20,
        at: Date.now()
      }
    };
  }

  if (chestOutcome.effectType === "distance_steal") {
    const amount =
      target.distance <= 0
        ? 0
        : Math.min(target.distance, clamp(roundNumber(target.distance * chestOutcome.percentage), chestOutcome.minimumDistance, chestOutcome.maximumDistance));
    const stolen = removeDistance(target, amount);
    addDistance(actor, stolen);
    syncRanks(players);
    return {
      effectType: chestOutcome.effectType,
      target,
      outcome: {
        kind: "reward",
        title: "Heist chest",
        detail: stolen > 0 ? `You stole ${stolen.toFixed(1)}m from ${target.name}.` : `${target.name} had no distance left to steal.`,
        effectType: chestOutcome.effectType,
        distanceDelta: stolen,
        at: Date.now()
      }
    };
  }

  const actorDistance = actor.distance;
  const targetDistance = target.distance;
  actor.distance = roundNumber(targetDistance);
  target.distance = roundNumber(actorDistance);
  actor.distanceGained = roundNumber(actor.distanceGained + Math.max(0, targetDistance - actorDistance));
  actor.distanceLost = roundNumber(actor.distanceLost + Math.max(0, actorDistance - targetDistance));
  target.distanceGained = roundNumber(target.distanceGained + Math.max(0, actorDistance - targetDistance));
  target.distanceLost = roundNumber(target.distanceLost + Math.max(0, targetDistance - actorDistance));
  syncRanks(players);

  return {
    effectType: chestOutcome.effectType,
    target,
    outcome: {
      kind: "reward",
      title: "Swap chest",
      detail: `You swapped distance with ${target.name}.`,
      effectType: chestOutcome.effectType,
      distanceDelta: roundNumber(targetDistance - actorDistance),
      at: Date.now()
    }
  };
}

export function addDistance(player: QuizDashSessionPlayer, amount: number): void {
  const safeAmount = roundNumber(Math.max(0, amount));
  player.distance = roundNumber(player.distance + safeAmount);
  player.distanceGained = roundNumber(player.distanceGained + safeAmount);
}

export function removeDistance(player: QuizDashSessionPlayer, amount: number): number {
  const safeAmount = roundNumber(Math.max(0, amount));
  const actualLoss = Math.min(player.distance, safeAmount);
  player.distance = roundNumber(player.distance - actualLoss);
  player.distanceLost = roundNumber(player.distanceLost + actualLoss);
  return actualLoss;
}

function toPublicQuestion(question: QuestionDefinition): PublicQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    format: question.format,
    options: question.options
  };
}

function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
