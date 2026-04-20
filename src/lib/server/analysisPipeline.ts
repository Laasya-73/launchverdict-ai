import type {
  CompareIdeasInput,
  CompareIdeasReport,
  ComparisonMetric,
  CritiqueMode,
  EvidenceTag,
  IdeaInput,
  VentureReport
} from '$lib/types/analysis';
import { runCriticLenses } from './ai/critics';
import { buildAggregateScores } from './scoring/engine';
import {
  buildFinalVerdict,
  buildPortfolioAngle,
  buildRewrite,
  buildStructuredCritique,
  buildSwot,
  buildTopLists,
  buildWhyNotToBuildThis
} from './scoring/aggregation';
import { preprocessIdeaInput } from './utils/preprocess';

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return slug || 'startup-idea-report';
}

function compareMetric(
  metric: string,
  ideaA: number,
  ideaB: number,
  tieBreaker: 'A' | 'B'
): ComparisonMetric {
  if (Math.abs(ideaA - ideaB) < 0.01) return { metric, ideaA, ideaB, winner: tieBreaker };
  return {
    metric,
    ideaA,
    ideaB,
    winner: ideaA > ideaB ? 'A' : 'B'
  };
}

function buildComparisonMatrix(a: VentureReport, b: VentureReport, tieBreaker: 'A' | 'B'): ComparisonMetric[] {
  return [
    compareMetric('Problem Strength', a.scores.problemStrength, b.scores.problemStrength, tieBreaker),
    compareMetric('Market Signal', a.scores.dimensionScores.scalability, b.scores.dimensionScores.scalability, tieBreaker),
    compareMetric('Differentiation', a.scores.differentiation, b.scores.differentiation, tieBreaker),
    compareMetric('Monetization', a.scores.monetizationPotential, b.scores.monetizationPotential, tieBreaker),
    compareMetric('Execution Ease', 10 - a.scores.founderRisk, 10 - b.scores.founderRisk, tieBreaker),
    compareMetric('Overall Venture Score', a.scores.overallVentureScore, b.scores.overallVentureScore, tieBreaker)
  ];
}

function confidenceBand(confidence: number): 'High confidence' | 'Moderate confidence' | 'Close decision' {
  if (confidence >= 0.78) return 'High confidence';
  if (confidence >= 0.64) return 'Moderate confidence';
  return 'Close decision';
}

const dimensionLabel: Record<keyof VentureReport['scores']['dimensionScores'], string> = {
  problemClarity: 'problem clarity',
  customerPain: 'customer pain',
  differentiation: 'differentiation',
  feasibility: 'feasibility',
  monetization: 'monetization',
  goToMarket: 'go-to-market',
  defensibility: 'defensibility',
  scalability: 'scalability'
};

function stripEvidenceTag(text: string): string {
  return text.replace(/^\[(model-estimate|inferred|rule-based)\]\s*/i, '').trim();
}

function normalizeClaimText(text: string): string {
  return stripEvidenceTag(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function strongestWeakestDimensions(report: VentureReport): {
  best: { key: keyof VentureReport['scores']['dimensionScores']; label: string; value: number };
  worst: { key: keyof VentureReport['scores']['dimensionScores']; label: string; value: number };
} {
  const entries = Object.entries(report.scores.dimensionScores) as Array<
    [keyof VentureReport['scores']['dimensionScores'], number]
  >;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const [bestKey, bestValue] = sorted[0];
  const [worstKey, worstValue] = sorted[sorted.length - 1];

  return {
    best: { key: bestKey, label: dimensionLabel[bestKey], value: bestValue },
    worst: { key: worstKey, label: dimensionLabel[worstKey], value: worstValue }
  };
}

function topRiskSignal(report: VentureReport, exclude?: string): string {
  const candidates = [...report.failureRisks, ...report.topWeaknesses]
    .map((line) => stripEvidenceTag(line))
    .filter(Boolean);
  if (!candidates.length) return 'No critical blocker identified yet.';
  if (!exclude) return candidates[0];

  const excluded = normalizeClaimText(exclude);
  const distinct = candidates.find((line) => normalizeClaimText(line) !== excluded);
  return distinct ?? candidates[0];
}

function buildComparisonNarrative(
  matrix: ComparisonMetric[],
  winner: 'Idea A' | 'Idea B',
  confidence: number,
  band: 'High confidence' | 'Moderate confidence' | 'Close decision',
  closeCall: boolean,
  a: VentureReport,
  b: VentureReport
): { winnerReason: string; tradeoffs: string[]; recommendation: string } {
  const mode = a.critiqueMode;
  const winnerSide: 'A' | 'B' = winner === 'Idea A' ? 'A' : 'B';
  const loser = winner === 'Idea A' ? 'Idea B' : 'Idea A';
  const loserSide: 'A' | 'B' = winnerSide === 'A' ? 'B' : 'A';
  const winsA = matrix.filter((row) => row.winner === 'A').length;
  const winsB = matrix.filter((row) => row.winner === 'B').length;
  const topGap = [...matrix]
    .map((row) => ({ ...row, gap: Math.abs(row.ideaA - row.ideaB) }))
    .sort((x, y) => y.gap - x.gap)[0];
  const deltas = matrix
    .map((row) => {
      const winnerScore = winnerSide === 'A' ? row.ideaA : row.ideaB;
      const loserScore = winnerSide === 'A' ? row.ideaB : row.ideaA;
      return {
        metric: row.metric,
        winnerScore,
        loserScore,
        delta: winnerScore - loserScore
      };
    })
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const winnerLeads = deltas.filter((d) => d.delta > 0.05).sort((x, y) => y.delta - x.delta);
  const winnerLagging = deltas.filter((d) => d.delta < -0.05).sort((x, y) => x.delta - y.delta);
  const decisiveLead = winnerLeads[0] ?? deltas[0];
  const supportLead = winnerLeads[1];
  const loserEdge = winnerLagging[0];
  const aShape = strongestWeakestDimensions(a);
  const bShape = strongestWeakestDimensions(b);
  const aRisk = topRiskSignal(a);
  const bRisk = topRiskSignal(b, aRisk);
  const sameRisk = normalizeClaimText(aRisk) === normalizeClaimText(bRisk);
  const aRiskLine = sameRisk ? `Shared top risk: ${aRisk}` : `Idea A risk: ${aRisk}`;
  const bRiskLine = sameRisk ? `Shared top risk: ${bRisk}` : `Idea B risk: ${bRisk}`;

  const winnerReason =
    mode === 'brutal'
      ? `${winner} wins ${winner === 'Idea A' ? winsA : winsB}/${matrix.length} dimensions because ${decisiveLead.metric} is materially better (${decisiveLead.winnerScore.toFixed(
          1
        )} vs ${decisiveLead.loserScore.toFixed(1)}).${
          supportLead ? ` Secondary edge: ${supportLead.metric} (${supportLead.winnerScore.toFixed(1)} vs ${supportLead.loserScore.toFixed(1)}).` : ''
        } Confidence: ${confidence.toFixed(2)} (${band}).${closeCall ? ' Close call: do not commit until a customer pays.' : ''}`
      : `${winner} wins on aggregate signal (${winner === 'Idea A' ? winsA : winsB} of ${
          matrix.length
        } comparison dimensions) mainly due to ${decisiveLead.metric} (${decisiveLead.winnerScore.toFixed(1)} vs ${decisiveLead.loserScore.toFixed(
          1
        )}).${supportLead ? ` It also leads on ${supportLead.metric} (${supportLead.winnerScore.toFixed(1)} vs ${supportLead.loserScore.toFixed(1)}).` : ''} Confidence: ${confidence.toFixed(2)} (${band}).${
          closeCall ? ' This is a close call, so validate with real customer interviews before committing.' : ''
        }`;

  const tradeoffs =
    mode === 'brutal'
      ? [
          `Winner edge: ${winner} beats ${loser} on ${decisiveLead.metric} by ${(decisiveLead.delta >= 0 ? decisiveLead.delta : -decisiveLead.delta).toFixed(1)} points (${decisiveLead.winnerScore.toFixed(1)} vs ${decisiveLead.loserScore.toFixed(1)}).`,
          loserEdge
            ? `${loser} only clearly wins ${loserEdge.metric} (${(loserEdge.delta * -1).toFixed(1)} points back), but it does not offset the winner's lead.`
            : `${loser} does not have a meaningful metric advantage in this comparison set.`,
          topGap.gap >= 1
            ? `Biggest separation is ${topGap.metric} (${topGap.ideaA.toFixed(1)} vs ${topGap.ideaB.toFixed(1)}).`
            : 'No runaway advantage; both options still need sharper execution.',
          sameRisk ? `Failure trigger check: both ideas share the same blocker -> ${aRisk}` : `Failure trigger check: ${aRiskLine} | ${bRiskLine}`
        ]
      : [
          `Why ${winner} has the edge: ${decisiveLead.metric} is higher by ${(decisiveLead.delta >= 0 ? decisiveLead.delta : -decisiveLead.delta).toFixed(1)} points (${decisiveLead.winnerScore.toFixed(1)} vs ${decisiveLead.loserScore.toFixed(1)}).`,
          loserEdge
            ? `${loser} still has one advantage in ${loserEdge.metric} (${(loserEdge.delta * -1).toFixed(1)} points), but it is not enough to win overall.`
            : `${loser} does not show a clear counter-advantage in the scored dimensions.`,
          topGap.gap >= 1
            ? `Largest tradeoff is ${topGap.metric} (${topGap.ideaA.toFixed(1)} vs ${topGap.ideaB.toFixed(1)}).`
            : 'Largest tradeoff is moderate; neither idea has a runaway advantage.',
          sameRisk ? `Risk to validate next: both ideas share the same blocker -> ${aRisk}` : `Risk to validate next: ${aRiskLine} | ${bRiskLine}`
        ];

  const recommendation =
    mode === 'brutal'
      ? `Pick ${winner}, but prove paid demand quickly. If pilots stall, cut scope or pivot immediately.`
      : `Prioritize ${winner}. Keep the runner-up as a pivot option if early sales signal underperforms.`;

  return { winnerReason, tradeoffs, recommendation };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cleanSentence(value: string): string {
  const typoFixes: Array<[RegExp, string]> = [
    [/\bteh\b/gi, 'the'],
    [/\brecieve\b/gi, 'receive'],
    [/\bseperate\b/gi, 'separate'],
    [/\bdefinately\b/gi, 'definitely'],
    [/\boccured\b/gi, 'occurred'],
    [/\bwierd\b/gi, 'weird']
  ];

  let text = value.replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of typoFixes) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(/\s+([,.;:!?])/g, '$1');
  text = text.replace(/([.?!])([A-Za-z])/g, '$1 $2');
  if (text.length > 0) text = text[0].toUpperCase() + text.slice(1);
  if (text && !/[.?!]$/.test(text)) text += '.';
  return text;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/^\[[^\]]+\]\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function tagClaim(text: string, tag: EvidenceTag): string {
  const existing = text.match(/^\[(model-estimate|inferred|rule-based)\]\s*/i);
  const core = cleanSentence(text.replace(/^\[[^\]]+\]\s*/, ''));
  if (existing) return `[${existing[1].toLowerCase()}] ${core}`;
  return `[${tag}] ${core}`;
}

function cleanClaimList(items: string[], fallback: string[], tag: EvidenceTag): string[] {
  const merged = [...items, ...fallback]
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => tagClaim(line, tag));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of merged) {
    const key = normalizeKey(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function makeUniqueLensVerdict(
  lens: VentureReport['lenses'][number],
  mode: CritiqueMode,
  used: Set<string>
): string {
  let base = cleanSentence(lens.verdict);
  let key = normalizeKey(base);
  if (key && !used.has(key)) {
    used.add(key);
    return base;
  }

  const summarySlice = cleanSentence(lens.summary).replace(/\.$/, '');
  const fallback =
    mode === 'brutal'
      ? `${lens.lens} verdict: fix scope and wedge before you scale.`
      : `${lens.lens} verdict: ${summarySlice}.`;
  base = cleanSentence(fallback);
  key = normalizeKey(base);

  if (!key || used.has(key)) {
    base = cleanSentence(
      mode === 'brutal'
        ? `${lens.lens} verdict: high risk until execution focus improves.`
        : `${lens.lens} verdict: viable with tighter focus and stronger evidence.`
    );
    key = normalizeKey(base);
  }

  if (key) used.add(key);
  return base;
}

function qualityGateReport(report: VentureReport): VentureReport {
  const mode = report.critiqueMode;
  const lenses = report.lenses.map((lens) => ({
    ...lens,
    summary: tagClaim(lens.summary, 'model-estimate'),
    strengths: cleanClaimList(lens.strengths, ['Clear pain signal exists.'], 'model-estimate'),
    weaknesses: cleanClaimList(lens.weaknesses, ['Wedge is not sharp enough yet.'], 'model-estimate'),
    risks: cleanClaimList(lens.risks, ['Crowded alternatives may limit early adoption.'], 'model-estimate'),
    blindSpots: cleanClaimList(lens.blindSpots, ['Willingness-to-pay assumptions are not fully tested.'], 'model-estimate'),
    recommendations: cleanClaimList(lens.recommendations, ['Run 10 customer interviews before scaling scope.'], 'model-estimate')
  }));

  const usedVerdicts = new Set<string>();
  for (const lens of lenses) {
    lens.verdict = tagClaim(makeUniqueLensVerdict(lens, mode, usedVerdicts), 'model-estimate');
  }

  const rulePivot = cleanSentence(
    `Ship ${report.rewrite.pivot.firstWorkflow} first and aim to ${report.rewrite.pivot.successMetric}.`
  );

  const topStrengths = cleanClaimList(
    report.topStrengths,
    ['Clear buyer pain exists and can justify spend.'],
    'model-estimate'
  );
  const topWeaknesses = cleanClaimList(
    report.topWeaknesses,
    ['Current positioning is not specific enough yet.'],
    'model-estimate'
  );
  const failureRisks = cleanClaimList(
    report.failureRisks,
    ['Competitive pressure can increase acquisition cost.'],
    'model-estimate'
  );

  const improvementSuggestions = cleanClaimList(
    report.improvementSuggestions,
    [rulePivot],
    mode === 'brutal' ? 'rule-based' : 'model-estimate'
  );

  const whyNotToBuildThis = cleanClaimList(
    report.whyNotToBuildThis,
    ['Pause until one measurable pilot outcome is validated.'],
    'model-estimate'
  );

  return {
    ...report,
    confidenceExplanation: cleanSentence(report.confidenceExplanation),
    competitorDisclaimer:
      '[inferred] Inferred competitors are approximate and may include adjacent tools.',
    finalVerdict: cleanSentence(report.finalVerdict),
    portfolioAngle: cleanSentence(report.portfolioAngle),
    lenses,
    structuredCritique: {
      ...report.structuredCritique,
      clarityOfProblem: cleanSentence(report.structuredCritique.clarityOfProblem),
      customerPainLevel: cleanSentence(report.structuredCritique.customerPainLevel),
      differentiation: cleanSentence(report.structuredCritique.differentiation),
      differentiationWhy: tagClaim(report.structuredCritique.differentiationWhy, 'rule-based'),
      feasibility: cleanSentence(report.structuredCritique.feasibility),
      monetizationStrength: cleanSentence(report.structuredCritique.monetizationStrength),
      goToMarketDifficulty: cleanSentence(report.structuredCritique.goToMarketDifficulty),
      defensibility: cleanSentence(report.structuredCritique.defensibility),
      scalability: cleanSentence(report.structuredCritique.scalability)
    },
    topStrengths,
    topWeaknesses,
    failureRisks,
    improvementSuggestions,
    whyNotToBuildThis,
    swot: {
      strengths: cleanClaimList(report.swot.strengths, topStrengths, 'model-estimate').slice(0, 4),
      weaknesses: cleanClaimList(report.swot.weaknesses, topWeaknesses, 'model-estimate').slice(0, 4),
      opportunities: cleanClaimList(report.swot.opportunities, improvementSuggestions, 'rule-based').slice(0, 4),
      threats: cleanClaimList(report.swot.threats, failureRisks, 'model-estimate').slice(0, 4)
    },
    rewrite: {
      ...report.rewrite,
      improvedIdea: cleanSentence(report.rewrite.improvedIdea),
      sharperNiche: cleanSentence(report.rewrite.sharperNiche),
      betterPositioning: cleanSentence(report.rewrite.betterPositioning),
      repositioning: cleanSentence(report.rewrite.repositioning),
      revisedPitch: cleanSentence(report.rewrite.revisedPitch),
      revisedHeadline: cleanSentence(report.rewrite.revisedHeadline),
      icpRefinement: cleanSentence(report.rewrite.icpRefinement),
      pivotSuggestion: cleanSentence(report.rewrite.pivotSuggestion),
      whyBetter: cleanClaimList(report.rewrite.whyBetter, ['This version is easier to sell with a focused first workflow.'], 'rule-based'),
      pivot: {
        ...report.rewrite.pivot,
        newTarget: cleanSentence(report.rewrite.pivot.newTarget),
        newPositioning: cleanSentence(report.rewrite.pivot.newPositioning),
        firstWorkflow: cleanSentence(report.rewrite.pivot.firstWorkflow),
        successMetric: cleanSentence(report.rewrite.pivot.successMetric),
        whyBetter: cleanSentence(report.rewrite.pivot.whyBetter),
        revisedPitch: cleanSentence(report.rewrite.pivot.revisedPitch)
      }
    }
  };
}

function detailQualitySignal(input: IdeaInput): number {
  const fields = [input.startupIdea, input.targetUsers, input.painPoint, input.solution, input.businessModel, input.whyNow];
  const words = fields
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return clamp(words / 140, 0.35, 1);
}

function buildSingleConfidence(idea: IdeaInput, report: VentureReport): { score: number; explanation: string } {
  const detail = detailQualitySignal(idea);
  const scores = Object.values(report.scores.dimensionScores);
  const spread = (Math.max(...scores) - Math.min(...scores)) / 10;
  let confidence = 0.55 + detail * 0.2 + spread * 0.15;
  const reasons: string[] = [];

  if (detail >= 0.78) reasons.push('inputs were detailed');
  else if (detail <= 0.5) reasons.push('inputs were somewhat thin');
  else reasons.push('input detail was decent');

  if (report.parsedIdea.targetIsBroad) {
    confidence -= 0.08;
    reasons.push('ICP is broad');
  }
  if (report.parsedIdea.solutionIsGenericAI) {
    confidence -= 0.06;
    reasons.push('positioning is generic');
  }
  if (report.parsedIdea.competitorCount > 0) {
    confidence += 0.04;
    reasons.push('competitive context is clear');
  }
  if (report.parsedIdea.marketType !== 'mixed') {
    confidence += 0.04;
    reasons.push('market type is clearly defined');
  }

  const score = round2(clamp(confidence, 0.45, 0.93));
  const lead = score >= 0.78 ? 'High confidence' : score >= 0.64 ? 'Moderate confidence' : 'Close-call confidence';
  return {
    score,
    explanation: `${lead}: ${reasons.slice(0, 3).join(', ')}.`
  };
}

function mostRepeatedRisk(lenses: VentureReport['lenses']): string | undefined {
  const counts = new Map<string, number>();
  for (const lens of lenses) {
    for (const risk of lens.risks) {
      const key = risk.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] < 2) return undefined;
  return ranked[0][0];
}

function pickForcedWinner(
  a: VentureReport,
  b: VentureReport
): { winner: 'Idea A' | 'Idea B'; confidence: number; closeCall: boolean } {
  const gap = a.scores.overallVentureScore - b.scores.overallVentureScore;
  if (Math.abs(gap) >= 0.15) {
    return {
      winner: gap > 0 ? 'Idea A' : 'Idea B',
      confidence: round2(clamp(0.6 + Math.abs(gap) * 0.16, 0.56, 0.94)),
      closeCall: Math.abs(gap) < 0.45
    };
  }

  const tieBreakers = [
    a.scores.monetizationPotential - b.scores.monetizationPotential,
    a.scores.differentiation - b.scores.differentiation,
    b.scores.founderRisk - a.scores.founderRisk,
    a.scores.dimensionScores.goToMarket - b.scores.dimensionScores.goToMarket
  ];

  const signal = tieBreakers.reduce((sum, value, index) => sum + value * (index === 0 ? 1.3 : 1), 0);
  const winner: 'Idea A' | 'Idea B' = signal >= 0 ? 'Idea A' : 'Idea B';
  const confidence = round2(clamp(0.56 + Math.abs(signal) * 0.05, 0.56, 0.82));
  return { winner, confidence, closeCall: true };
}

export async function analyzeIdeaPipeline(
  input: IdeaInput,
  env: { OPENAI_API_KEY?: string; OPENAI_MODEL?: string; GOOGLE_API_KEY?: string; GOOGLE_MODEL?: string }
): Promise<VentureReport> {
  const parsedIdea = preprocessIdeaInput(input);
  const mode: CritiqueMode = parsedIdea.critiqueMode ?? 'normal';
  const lenses = await runCriticLenses(parsedIdea, mode, env);
  const scores = buildAggregateScores(lenses, parsedIdea);
  const topLists = buildTopLists(lenses, mode);
  const structuredCritique = buildStructuredCritique(scores, parsedIdea);
  const swot = buildSwot(topLists.strengths, topLists.weaknesses, topLists.risks, topLists.recommendations);
  const rewrite = buildRewrite(parsedIdea, scores, mode, { repeatedRisk: mostRepeatedRisk(lenses) });
  const finalVerdict = buildFinalVerdict(scores, mode);
  const portfolioAngle = buildPortfolioAngle(scores);
  const reportSlug = slugify(parsedIdea.startupIdea);
  const whyNotToBuildThis = buildWhyNotToBuildThis(topLists.weaknesses, topLists.risks, mode);
  const brutalImprovements =
    mode === 'brutal'
      ? [
          `Cut scope now: ship only "${rewrite.pivot.firstWorkflow}" for ${rewrite.pivot.newTarget}.`,
          `Success bar for launch: ${rewrite.pivot.successMetric}.`,
          `Reposition immediately: ${rewrite.pivot.newPositioning}`
        ]
      : [];

  const report: VentureReport = {
    submittedAt: new Date().toISOString(),
    reportSlug,
    critiqueMode: mode,
    confidence: 0,
    confidenceExplanation: '',
    competitorDisclaimer: '[inferred] Inferred competitors are approximate and may include adjacent tools.',
    parsedIdea,
    lenses,
    structuredCritique,
    scores,
    topStrengths: topLists.strengths,
    topWeaknesses: topLists.weaknesses,
    failureRisks: topLists.risks,
    whyNotToBuildThis,
    improvementSuggestions:
      mode === 'brutal'
        ? [...new Set([...brutalImprovements, ...topLists.recommendations])].slice(0, 8)
        : topLists.recommendations,
    swot,
    rewrite,
    finalVerdict,
    portfolioAngle
  };

  const confidence = buildSingleConfidence(input, report);
  report.confidence = confidence.score;
  report.confidenceExplanation = confidence.explanation;
  return qualityGateReport(report);
}

export async function compareIdeasPipeline(
  input: CompareIdeasInput,
  env: { OPENAI_API_KEY?: string; OPENAI_MODEL?: string; GOOGLE_API_KEY?: string; GOOGLE_MODEL?: string }
): Promise<CompareIdeasReport> {
  const mode: CritiqueMode = input.critiqueMode ?? 'normal';

  const [ideaA, ideaB] = await Promise.all([
    analyzeIdeaPipeline({ ...input.ideaA, critiqueMode: mode }, env),
    analyzeIdeaPipeline({ ...input.ideaB, critiqueMode: mode }, env)
  ]);

  const forced = pickForcedWinner(ideaA, ideaB);
  const winnerSide: 'A' | 'B' = forced.winner === 'Idea A' ? 'A' : 'B';
  const matrix = buildComparisonMatrix(ideaA, ideaB, winnerSide);
  const band = confidenceBand(forced.confidence);
  const narrative = buildComparisonNarrative(
    matrix,
    forced.winner,
    forced.confidence,
    band,
    forced.closeCall,
    ideaA,
    ideaB
  );

  return {
    critiqueMode: mode,
    confidence: forced.confidence,
    confidenceBand: band,
    ideaA,
    ideaB,
    matrix,
    winner: forced.winner,
    winnerReason: narrative.winnerReason,
    tradeoffs: narrative.tradeoffs,
    recommendation: narrative.recommendation
  };
}
