type AiHoleSummary = {
  hole: number;
  par: number;
  total: number;
  driver: number;
  fairway: number;
  iron: number;
  pitching: number;
  putting: number;
};

type AiRoundSummary = {
  date: string;
  total_score: number;
  total_par: number;
  hole_count: number;
  score_diff: number;
};

export type AiAnalysisRequest = {
  courseName: string;
  teeColor: 'blue' | 'white' | 'red';
  holeCount: number;
  totalScore: number;
  totalPar: number;
  holeSummaries: AiHoleSummary[];
  recentRounds: AiRoundSummary[];
};

export type AiAnalysisResponse = {
  currentRound: string;
  history: string;
};

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Rule-based fallback used when OpenAI is unavailable
function getRuleBasedAnalysis(requestData: AiAnalysisRequest): AiAnalysisResponse {
  const { totalScore, totalPar, holeSummaries, recentRounds } = requestData;
  const scoredHoles = holeSummaries.filter((h) => h.total > 0);

  // Current round insight
  let currentRound = 'Start scoring holes to see your performance analysis.';
  if (scoredHoles.length > 0) {
    const diff = totalScore - totalPar;
    const totalPutts = scoredHoles.reduce((s, h) => s + h.putting, 0);
    const avgPuttsPerHole = totalPutts / scoredHoles.length;
    const worstHoles = scoredHoles.filter((h) => h.total - h.par >= 2);

    if (diff <= -2) {
      currentRound = `Excellent round! You are ${Math.abs(diff)} under par across ${scoredHoles.length} holes. Keep up the aggressive play!`;
    } else if (diff <= 0) {
      currentRound = `Solid round — at or under par after ${scoredHoles.length} holes. Stay consistent and trust your swing.`;
    } else if (diff <= 3) {
      currentRound = `Decent round, ${diff} over par. ${worstHoles.length > 0 ? `Watch holes where you scored double bogey or worse (${worstHoles.length} so far). ` : ''}Keep steady.`;
    } else {
      currentRound = `Tough round, ${diff} over par. Focus on reducing big numbers — avoid compounding errors on a single hole.`;
    }

    if (avgPuttsPerHole > 2.5) {
      currentRound += ` Putting is costing you strokes (avg ${avgPuttsPerHole.toFixed(1)}/hole) — consider more short-putt practice.`;
    }
  }

  // History trend insight
  let history = 'Save rounds to unlock trend analysis.';
  if (recentRounds.length >= 2) {
    const avgDiff = recentRounds.reduce((s, r) => s + r.score_diff, 0) / recentRounds.length;
    const latest = recentRounds[recentRounds.length - 1];
    const previous = recentRounds[recentRounds.length - 2];
    const trend = latest.score_diff - previous.score_diff;

    const trendText = trend < 0 ? 'improving' : trend > 0 ? 'trending higher' : 'holding steady';
    if (avgDiff <= -1) {
      history = `Your recent average is ${avgDiff.toFixed(1)} vs par — well under. You are ${trendText} compared to your last round.`;
    } else if (avgDiff <= 2) {
      history = `Recent rounds average ${avgDiff > 0 ? '+' : ''}${avgDiff.toFixed(1)} vs par. You are ${trendText}. Consistency is your strength — keep building on it.`;
    } else {
      history = `Recent average is +${avgDiff.toFixed(1)} vs par. You are ${trendText}. Try to eliminate penalty strokes and focus on course management.`;
    }
  } else if (recentRounds.length === 1) {
    const d = recentRounds[0].score_diff;
    history = `First round recorded: ${d >= 0 ? '+' : ''}${d} vs par. Save more rounds to see trend analysis.`;
  }

  return { currentRound, history };
}

export async function getAiAnalysis(requestData: AiAnalysisRequest): Promise<AiAnalysisResponse> {
  if (!OPENAI_API_KEY) {
    return getRuleBasedAnalysis(requestData);
  }

  const userPrompt = `You are a helpful golf coach. Analyze the current round and recent round history in concise English. Return only valid JSON with keys "currentRound" and "history".

Current round:
Course: ${requestData.courseName}
Tee: ${requestData.teeColor}
Holes: ${requestData.holeCount}
Total score: ${requestData.totalScore}
Total par: ${requestData.totalPar}
Hole details:
${requestData.holeSummaries
    .map(
      (hole) =>
        `Hole ${hole.hole}: par ${hole.par}, score ${hole.total}, driver ${hole.driver}, fairway ${hole.fairway}, iron ${hole.iron}, pitching ${hole.pitching}, putting ${hole.putting}`
    )
    .join('\n')}

Recent rounds summary:
${requestData.recentRounds.length > 0
    ? requestData.recentRounds
        .map(
          (round) =>
            `${round.date}: score ${round.total_score}, par ${round.total_par}, diff ${round.score_diff}, holes ${round.hole_count}`
        )
        .join('\n')
    : 'No previous rounds.'}

Generate a short coach-style analysis. Do not add any extra explanation outside the JSON object.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a golf coach and performance analyst.' },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 220,
      }),
    });

    // On quota/rate-limit/server errors fall back to rule-based analysis silently
    if (!response.ok) {
      return getRuleBasedAnalysis(requestData);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
      return getRuleBasedAnalysis(requestData);
    }

    try {
      const parsed = JSON.parse(content);
      return {
        currentRound: String(parsed.currentRound || '').trim(),
        history: String(parsed.history || '').trim(),
      };
    } catch {
      return {
        currentRound: content.trim(),
        history: '',
      };
    }
  } catch {
    // Network error — fall back gracefully
    return getRuleBasedAnalysis(requestData);
  }
}
