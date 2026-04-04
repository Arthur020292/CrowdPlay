import type {
  GoldRushMatchStanding,
  GoldRushSessionPlayer,
  PendingGoldRushChestOutcome,
  PlayerOutcome,
  PublicQuestion,
  TargetCandidate
} from "@crowdplay/protocol";
import { QUESTION_BANK, type QuestionDefinition } from "../../game-content/src/index";
export { QUESTION_BANK, type QuestionDefinition } from "../../game-content/src/index";

export interface ChestResolution {
  effectType: PendingGoldRushChestOutcome["effectType"];
  outcome: PlayerOutcome;
  target: GoldRushSessionPlayer | null;
}

export function buildStandings(players: GoldRushSessionPlayer[]): GoldRushMatchStanding[] {
  return [...players]
    .sort((left, right) => {
      if (right.gold !== left.gold) {
        return right.gold - left.gold;
      }

      if (right.correctAnswers !== left.correctAnswers) {
        return right.correctAnswers - left.correctAnswers;
      }

      return left.joinedAt - right.joinedAt;
    })
    .map((player, index) => ({
      gameType: "goldrush",
      playerId: player.playerId,
      name: player.name,
      avatarId: player.avatarId,
      rank: index + 1,
      gold: player.gold,
      correctAnswers: player.correctAnswers,
      wrongAnswers: player.wrongAnswers,
      chaosTriggers: player.chaosTriggerCount
    }));
}

export function syncRanks(players: GoldRushSessionPlayer[]): GoldRushMatchStanding[] {
  const standings = buildStandings(players);
  standings.forEach((standing, index) => {
    const player = players.find((candidate) => candidate.playerId === standing.playerId);
    if (player) {
      player.rank = index + 1;
    }
  });
  return standings;
}

export function getQuestionForPlayer(player: Pick<GoldRushSessionPlayer, "questionCursor" | "questionSeed">): PublicQuestion {
  return toPublicQuestion(getQuestionDefinitionForPlayer(player));
}

export function getQuestionDefinitionForPlayer(player: Pick<GoldRushSessionPlayer, "questionCursor" | "questionSeed">): QuestionDefinition {
  const index = (player.questionSeed + player.questionCursor) % QUESTION_BANK.length;
  return QUESTION_BANK[index]!;
}

export function evaluateAnswer(player: Pick<GoldRushSessionPlayer, "questionCursor" | "questionSeed">, questionId: string, answerId: string): boolean {
  const question = getQuestionDefinitionForPlayer(player);
  return question.id === questionId && question.correctAnswerId === answerId;
}

export function createChestOutcome(actor: GoldRushSessionPlayer, chestIndex: number, seedRoot: string): PendingGoldRushChestOutcome {
  const seed = `${seedRoot}:chest:${chestIndex}`;
  const roll = rollDeterministicInt(`${seed}:effect`, 0, 99);

  if (roll < 28) {
    return { effectType: "gold_gain", goldAmount: 25 };
  }
  if (roll < 48) {
    return { effectType: "gold_gain", goldAmount: 50 };
  }
  if (roll < 56) {
    return { effectType: "gold_gain", goldAmount: 85 };
  }
  if (roll < 68) {
    return { effectType: "gold_multiplier", multiplier: 1.5, minimumGain: 30 };
  }
  if (roll < 84) {
    return { effectType: "gold_steal", percentage: 0.2, minimumGold: 20, maximumGold: 150 };
  }
  if (roll < 90) {
    return { effectType: "gold_swap" };
  }

  return {
    effectType: "gold_loss",
    percentage: 0.15,
    minimumGold: actor.gold === 0 ? 0 : 15,
    maximumGold: 80
  };
}

export function requiresTarget(outcome: PendingGoldRushChestOutcome): boolean {
  return outcome.effectType === "gold_steal" || outcome.effectType === "gold_swap";
}

export function getTopOpponentTargets(players: GoldRushSessionPlayer[], actor: GoldRushSessionPlayer): TargetCandidate[] {
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
  players: GoldRushSessionPlayer[],
  actor: GoldRushSessionPlayer,
  chestOutcome: PendingGoldRushChestOutcome,
  targetPlayerId?: string
): ChestResolution {
  actor.chaosTriggerCount += 1;

  if (chestOutcome.effectType === "gold_gain") {
    const amount = Math.max(0, Math.round(chestOutcome.goldAmount));
    addGold(actor, amount);
    syncRanks(players);
    return {
      effectType: chestOutcome.effectType,
      target: null,
      outcome: {
        kind: "reward",
        title: amount >= 80 ? "Jackpot chest" : amount >= 50 ? "Heavy chest" : "Quick stash",
        detail: `You banked ${amount} gold.`,
        effectType: chestOutcome.effectType,
        goldDelta: amount,
        at: Date.now()
      }
    };
  }

  if (chestOutcome.effectType === "gold_multiplier") {
    const gain = Math.max(Math.round(actor.gold * (chestOutcome.multiplier - 1)), chestOutcome.minimumGain);
    addGold(actor, gain);
    syncRanks(players);
    return {
      effectType: chestOutcome.effectType,
      target: null,
      outcome: {
        kind: "reward",
        title: "Multiplier chest",
        detail: `Your vault multiplied. You gained ${gain} gold.`,
        effectType: chestOutcome.effectType,
        goldDelta: gain,
        at: Date.now()
      }
    };
  }

  if (chestOutcome.effectType === "gold_loss") {
    const amount = actor.gold <= 0 ? 0 : clamp(Math.round(actor.gold * chestOutcome.percentage), chestOutcome.minimumGold, chestOutcome.maximumGold);
    const actualLoss = removeGold(actor, amount);
    syncRanks(players);
    return {
      effectType: chestOutcome.effectType,
      target: null,
      outcome: {
        kind: "reward",
        title: "Mimic chest",
        detail: actualLoss > 0 ? `The chest bit back. You lost ${actualLoss} gold.` : "The trap fizzled. Your empty vault survived.",
        effectType: chestOutcome.effectType,
        goldDelta: -actualLoss,
        at: Date.now()
      }
    };
  }

  const target = targetPlayerId ? players.find((player) => player.playerId === targetPlayerId) ?? null : null;
  if (!target || target.playerId === actor.playerId) {
    addGold(actor, 50);
    syncRanks(players);
    return {
      effectType: "gold_gain",
      target: null,
      outcome: {
        kind: "reward",
        title: "Fallback chest",
        detail: "Your target slipped away, so you banked 50 gold instead.",
        effectType: "gold_gain",
        goldDelta: 50,
        at: Date.now()
      }
    };
  }

  if (chestOutcome.effectType === "gold_steal") {
    const amount = target.gold <= 0 ? 0 : Math.min(target.gold, clamp(Math.round(target.gold * chestOutcome.percentage), chestOutcome.minimumGold, chestOutcome.maximumGold));
    const stolen = removeGold(target, amount);
    addGold(actor, stolen);
    syncRanks(players);
    return {
      effectType: chestOutcome.effectType,
      target,
      outcome: {
        kind: "reward",
        title: "Heist chest",
        detail: stolen > 0 ? `You stole ${stolen} gold from ${target.name}.` : `${target.name}'s vault was empty, so the heist came up cold.`,
        effectType: chestOutcome.effectType,
        goldDelta: stolen,
        at: Date.now()
      }
    };
  }

  const actorGold = actor.gold;
  const targetGold = target.gold;
  actor.gold = targetGold;
  target.gold = actorGold;
  actor.goldGained = roundNumber(actor.goldGained + Math.max(0, targetGold - actorGold));
  actor.goldLost = roundNumber(actor.goldLost + Math.max(0, actorGold - targetGold));
  target.goldGained = roundNumber(target.goldGained + Math.max(0, actorGold - targetGold));
  target.goldLost = roundNumber(target.goldLost + Math.max(0, targetGold - actorGold));
  syncRanks(players);

  return {
    effectType: chestOutcome.effectType,
    target,
    outcome: {
      kind: "reward",
      title: "Swap chest",
      detail: `You swapped vaults with ${target.name}.`,
      effectType: chestOutcome.effectType,
      goldDelta: targetGold - actorGold,
      at: Date.now()
    }
  };
}

export function addGold(player: GoldRushSessionPlayer, amount: number): void {
  const safeAmount = Math.max(0, Math.round(amount));
  player.gold = roundNumber(player.gold + safeAmount);
  player.goldGained = roundNumber(player.goldGained + safeAmount);
}

export function removeGold(player: GoldRushSessionPlayer, amount: number): number {
  const safeAmount = Math.max(0, Math.round(amount));
  const actualLoss = Math.min(player.gold, safeAmount);
  player.gold = roundNumber(player.gold - actualLoss);
  player.goldLost = roundNumber(player.goldLost + actualLoss);
  return actualLoss;
}

export function isLockoutActive(player: Pick<GoldRushSessionPlayer, "lockoutUntil">, now: number): boolean {
  return player.lockoutUntil !== null && player.lockoutUntil > now;
}

export function clearExpiredLockout(player: GoldRushSessionPlayer, now: number): void {
  if (player.lockoutUntil !== null && player.lockoutUntil <= now) {
    player.lockoutUntil = null;
  }
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
