import { describe, expect, it } from "vitest";

import type { SessionPlayer } from "@crowdplay/protocol";

import {
  QUESTION_BANK,
  SAFE_MOVE_RANGE,
  RANDOM_EFFECT_RANGE,
  applyRewardChoice,
  buildStandings,
  clearExpiredLockout,
  evaluateAnswer,
  getQuestionForPlayer,
  isLockoutActive,
  movePlayer,
  syncRanks
} from "./index";

function createPlayer(playerId: string, name: string, joinedAt = Date.now()): SessionPlayer {
  return {
    playerId,
    name,
    avatarId: "fox",
    joinedAt,
    connected: true,
    lastSeenAt: joinedAt,
    distance: 0,
    rank: 0,
    status: "connected",
    questionCursor: 0,
    questionSeed: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    effectCount: 0,
    distanceGained: 0,
    distanceLost: 0,
    lockoutUntil: null,
    pendingRewardChoice: false,
    recentOutcome: null
  };
}

describe("Quiz race engine", () => {
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

  it("applies safe move rewards inside the configured range", () => {
    const player = createPlayer("p1", "Ada");
    const players = [player];

    const resolution = applyRewardChoice(players, player, "move", "seed");

    expect(player.distance).toBeGreaterThanOrEqual(SAFE_MOVE_RANGE.min);
    expect(player.distance).toBeLessThanOrEqual(SAFE_MOVE_RANGE.max);
    expect(resolution.effectType).toBe("safe_move");
  });

  it("never lets chaotic rewards drive distance below zero", () => {
    const actor = createPlayer("p1", "Ada");
    const target = createPlayer("p2", "Ben");
    target.distance = 2;

    const players = [actor, target];
    const resolution = applyRewardChoice(players, actor, "effect", "force-steal");

    expect(actor.distance).toBeGreaterThanOrEqual(0);
    expect(target.distance).toBeGreaterThanOrEqual(0);
    expect(["move", "swap", "steal", "trap"]).toContain(resolution.effectType === "safe_move" ? "move" : resolution.effectType);
  });

  it("builds standings by distance, then correct answers, then join order", () => {
    const ada = createPlayer("p1", "Ada", 1);
    const ben = createPlayer("p2", "Ben", 2);

    movePlayer(ada, 20);
    movePlayer(ben, 20);
    ada.correctAnswers = 3;
    ben.correctAnswers = 2;

    const standings = buildStandings([ada, ben]);

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

  it("syncs ranks after movement changes", () => {
    const ada = createPlayer("p1", "Ada");
    const ben = createPlayer("p2", "Ben");

    movePlayer(ada, RANDOM_EFFECT_RANGE.max);
    movePlayer(ben, RANDOM_EFFECT_RANGE.min);
    syncRanks([ada, ben]);

    expect(ada.rank).toBe(1);
    expect(ben.rank).toBe(2);
  });
});
