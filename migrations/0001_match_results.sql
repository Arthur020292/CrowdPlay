CREATE TABLE IF NOT EXISTS match_results (
  match_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  code TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  player_count INTEGER NOT NULL,
  winner_ids_json TEXT NOT NULL,
  standings_json TEXT NOT NULL,
  stats_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_match_results_created_at ON match_results (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_results_code ON match_results (code);
