import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { MatchResult } from "@crowdplay/protocol";

import { Leaderboard } from "../components/Leaderboard";
import { getMatchResult } from "../lib/api";

export function ResultsPage() {
  const params = useParams();
  const matchId = params.matchId ?? "";
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMatchResult(matchId)
      .then(setResult)
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "Unable to load match result."));
  }, [matchId]);

  if (error) {
    return <div className="rounded-[2rem] border border-rose-400/20 bg-rose-400/10 p-6 text-rose-100">{error}</div>;
  }

  if (!result) {
    return <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-slate-300">Loading match results...</div>;
  }

  const isGoldRush = result.gameType === "goldrush";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Match result</p>
        <h1 className="mt-3 text-4xl font-black text-white">Session {result.code}</h1>
        <p className="mt-4 text-slate-300">
          {result.playerCount} players • {Math.round(result.durationMs / 1000)} second {isGoldRush ? "match" : "race"} •{" "}
          {isGoldRush ? `Winning vault ${result.stats.winningGold} gold` : `Winning distance ${result.stats.winningDistance.toFixed(1)}m`}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Winners</div>
            <div className="mt-2 text-2xl font-black text-white">{result.winners.length}</div>
          </div>
          {isGoldRush ? (
            <>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Correct answers</div>
                <div className="mt-2 text-2xl font-black text-white">{result.stats.totalCorrectAnswers}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Chaos chests</div>
                <div className="mt-2 text-2xl font-black text-white">{result.stats.totalChaosTriggers}</div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Correct answers</div>
                <div className="mt-2 text-2xl font-black text-white">{result.stats.totalCorrectAnswers}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Wrong answers</div>
                <div className="mt-2 text-2xl font-black text-white">{result.stats.totalWrongAnswers}</div>
              </div>
            </>
          )}
        </div>
      </section>

      <Leaderboard players={result.standings} title="Final standings" />
    </div>
  );
}
