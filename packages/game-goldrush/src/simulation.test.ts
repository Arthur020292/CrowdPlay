import { describe, expect, it } from "vitest";

import type { GoldRushSessionPlayer } from "@crowdplay/protocol";

import {
  QUESTION_BANK,
  clearExpiredLockout,
  createChestOutcome,
  evaluateAnswer,
  getQuestionForPlayer,
  getTopOpponentTargets,
  isLockoutActive,
  resolveChestOutcome,
  syncRanks,
  addGold
} from "./index";

function createPlayer(playerId: string, name: string, joinedAt = Date.now()): GoldRushSessionPlayer {
  return {
    gameType: "goldrush",
    playerId,
    name,
    avatarId: "fox",
    joinedAt,
    connected: true,
    lastSeenAt: joinedAt,
    gold: 0,
    rank: 0,
    status: "connected",
    questionCursor: 0,
    questionSeed: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    chaosTriggerCount: 0,
    goldGained: 0,
    goldLost: 0,
    lockoutUntil: null,
    pendingChestPick: false,
    pendingTargetPick: false,
    pendingChestOutcome: null,
    availableTargets: [],
    recentOutcome: null
  };
}

describe("Gold Rush engine", () => {
  it("returns deterministic questions based on seed and cursor", () => {
    const player = createPlayer("p1", "Ada");
    player.questionSeed = 2;
    player.questionCursor = 1;
    const question = getQuestionForPlayer(player);
    expect(question.id).toBe(QUESTION_BANK[3]?.id);
  });

  it("validates correct answers against the assigned question", () => {
    const player = createPlayer("p1", "Ada");
    const question = getQuestionForPlayer(player);
    const correctAnswerId = QUESTION_BANK[0]?.correctAnswerId ?? "";
    expect(evaluateAnswer(player, question.id, correctAnswerId)).toBe(true);
    expect(evaluateAnswer(player, question.id, "nope")).toBe(false);
  });

  it("rolls the same chest outcome for the same seed and chest index", () => {
    const player = createPlayer("p1", "Ada");
    expect(createChestOutcome(player, 2, "seed")).toEqual(createChestOutcome(player, 2, "seed"));
  });

  it("never lets gold loss or steal drive gold below zero", () => {
    const actor = createPlayer("p1", "Ada");
    const target = createPlayer("p2", "Ben");
    actor.gold = 10;
    target.gold = 12;
    resolveChestOutcome([actor, target], actor, { effectType: "gold_loss", percentage: 0.15, minimumGold: 15, maximumGold: 80 });
    expect(actor.gold).toBeGreaterThanOrEqual(0);
    resolveChestOutcome([actor, target], actor, { effectType: "gold_steal", percentage: 0.2, minimumGold: 20, maximumGold: 150 }, target.playerId);
    expect(actor.gold).toBeGreaterThanOrEqual(0);
    expect(target.gold).toBeGreaterThanOrEqual(0);
  });

  it("returns top three opponent targets without including the actor", () => {
    const ada = createPlayer("p1", "Ada", 1);
    const ben = createPlayer("p2", "Ben", 2);
    const cam = createPlayer("p3", "Cam", 3);
    const dia = createPlayer("p4", "Dia", 4);
    const eli = createPlayer("p5", "Eli", 5);
    addGold(ada, 200);
    addGold(ben, 180);
    addGold(cam, 160);
    addGold(dia, 140);
    addGold(eli, 120);
    syncRanks([ada, ben, cam, dia, eli]);
    expect(getTopOpponentTargets([ada, ben, cam, dia, eli], cam).map((target) => target.playerId)).toEqual(["p1", "p2", "p4"]);
  });

  it("builds standings by gold, then correct answers, then join order", () => {
    const ada = createPlayer("p1", "Ada", 1);
    const ben = createPlayer("p2", "Ben", 2);
    addGold(ada, 20);
    addGold(ben, 20);
    ada.correctAnswers = 3;
    ben.correctAnswers = 2;
    const standings = syncRanks([ada, ben]);
    expect(standings[0]?.playerId).toBe("p1");
    expect(standings[1]?.playerId).toBe("p2");
  });

  it("clears expired lockouts and reports active lockouts correctly", () => {
    const player = createPlayer("p1", "Ada");
    player.lockoutUntil = Date.now() + 500;
    expect(isLockoutActive(player, Date.now())).toBe(true);
    clearExpiredLockout(player, player.lockoutUntil + 1);
    expect(player.lockoutUntil).toBeNull();
  });
});
