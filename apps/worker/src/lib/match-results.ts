import type { MatchResult } from "@crowdplay/protocol";

export async function persistMatchResult(database: D1Database, result: MatchResult): Promise<void> {
  await database
    .prepare(
      `INSERT INTO match_results (
        match_id,
        session_id,
        game_type,
        code,
        started_at,
        ended_at,
        duration_ms,
        player_count,
        winner_ids_json,
        standings_json,
        stats_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      result.matchId,
      result.sessionId,
      result.gameType,
      result.code,
      result.startedAt,
      result.endedAt,
      result.durationMs,
      result.playerCount,
      JSON.stringify(result.winners),
      JSON.stringify(result.standings),
      JSON.stringify(result.stats),
      Date.now()
    )
    .run();
}

export async function readMatchResult(database: D1Database, matchId: string): Promise<MatchResult | null> {
  const row = await database
    .prepare("SELECT * FROM match_results WHERE match_id = ? LIMIT 1")
    .bind(matchId)
    .first<Record<string, unknown>>();

  if (!row) {
    return null;
  }

  return {
    matchId: String(row.match_id),
    sessionId: String(row.session_id),
    code: String(row.code),
    gameType: "tapdash",
    startedAt: Number(row.started_at),
    endedAt: Number(row.ended_at),
    durationMs: Number(row.duration_ms),
    playerCount: Number(row.player_count),
    winners: JSON.parse(String(row.winner_ids_json)) as string[],
    standings: JSON.parse(String(row.standings_json)),
    stats: JSON.parse(String(row.stats_json))
  };
}
