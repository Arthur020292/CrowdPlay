import { describe, expect, it } from "vitest";

import type { QuizDashSessionPlayer } from "@crowdplay/protocol";

import {
  QUESTION_BANK,
  buildStandings,
  createChestOutcome,
  evaluateAnswer,
  getQuestionForPlayer,
  getTopOpponentTargets,
  resolveChestOutcome
} from "./index";

function createPlayer(playerId: string, name: string): QuizDashSessionPlayer {
  return {
    gameType: "quizdash",
    playerId,
    name,
    avatarId: "fox",
    joinedAt: Date.now(),
    connected: true,
    lastSeenAt: Date.now(),
    distance: 0,
    questionCursor: 0,
    questionSeed: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    chaosTriggerCount: 0,
    distanceGained: 0,
    distanceLost: 0,
    pendingChestPick: false,
    pendingTargetPick: false,
    pendingChestOutcome: null,
    availableTargets: [],
    recentOutcome: null,
    rank: 0,
    status: "connected"
  };
}

describe("QuizDash race simulation", () => {
  it("uses the shared question bank", () => {
    const player = createPlayer("p1", "Ada");
    const question = getQuestionForPlayer(player);
    expect(question.id).toBe(QUESTION_BANK[0]?.id);
  });

  it("evaluates answers from the shared question bank", () => {
    const player = createPlayer("p1", "Ada");
    const question = QUESTION_BANK[0]!;
    expect(evaluateAnswer(player, question.id, question.correctAnswerId)).toBe(true);
    expect(evaluateAnswer(player, question.id, "wrong")).toBe(false);
  });

  it("builds standings by distance and correct answers", () => {
    const ada = createPlayer("p1", "Ada");
    const ben = createPlayer("p2", "Ben");
    ada.distance = 20;
    ben.distance = 20;
    ada.correctAnswers = 3;
    ben.correctAnswers = 4;
    const standings = buildStandings([ada, ben]);
    expect(standings[0]?.playerId).toBe("p2");
    expect(standings[1]?.playerId).toBe("p1");
  });

  it("offers top three opponents for targeted effects", () => {
    const actor = createPlayer("p1", "Ada");
    const ben = createPlayer("p2", "Ben");
    const cam = createPlayer("p3", "Cam");
    const dia = createPlayer("p4", "Dia");
    ben.distance = 40;
    cam.distance = 30;
    dia.distance = 20;
    const targets = getTopOpponentTargets([actor, ben, cam, dia], actor);
    expect(targets).toHaveLength(3);
    expect(targets[0]?.playerId).toBe("p2");
  });

  it("resolves distance steals without going below zero", () => {
    const actor = createPlayer("p1", "Ada");
    const ben = createPlayer("p2", "Ben");
    ben.distance = 10;
    const resolution = resolveChestOutcome(
      [actor, ben],
      actor,
      { effectType: "distance_steal", percentage: 0.2, minimumDistance: 8, maximumDistance: 30 },
      ben.playerId
    );
    expect(actor.distance).toBeGreaterThan(0);
    expect(ben.distance).toBeGreaterThanOrEqual(0);
    expect(resolution.target?.playerId).toBe(ben.playerId);
  });

  it("creates deterministic chest outcomes", () => {
    const actor = createPlayer("p1", "Ada");
    expect(createChestOutcome(actor, 1, "session:player:cursor")).toEqual(createChestOutcome(actor, 1, "session:player:cursor"));
  });
});
