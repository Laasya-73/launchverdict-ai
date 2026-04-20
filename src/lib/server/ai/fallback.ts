import type { CriticLens, DimensionScores, LensAssessment, ParsedIdea } from '$lib/types/analysis';

function clamp(value: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, value));
}

function scoreFromLength(text: string, min = 40, max = 220): number {
  const len = text.trim().length;
  if (len <= min) return 4.3;
  if (len >= max) return 8.1;
  const range = max - min;
  return 4.3 + ((len - min) / range) * 3.8;
}

function keywordBoost(text: string, keywords: RegExp): number {
  return keywords.test(text.toLowerCase()) ? 0.9 : 0;
}

function buildBaseScores(idea: ParsedIdea): DimensionScores {
  const pain = scoreFromLength(idea.painPoint) + keywordBoost(idea.painPoint, /\b(cost|slow|risk|manual|compliance|revenue|lost)\b/);
  const problemClarity = scoreFromLength(idea.startupIdea) + scoreFromLength(idea.painPoint, 30, 180) * 0.2;
  const monetization =
    scoreFromLength(idea.businessModel, 20, 160) +
    keywordBoost(idea.businessModel, /\b(subscription|usage|seat|contract|annual|transaction|enterprise)\b/);
  const differentiation =
    6.5 -
    (idea.solutionIsGenericAI ? 1.8 : 0) -
    (idea.competitorsList.length > 4 ? 1 : 0) +
    (idea.whyNow.length > 40 ? 0.4 : 0);
  const goToMarket =
    6.7 - (idea.targetIsBroad ? 1.6 : 0.2) - (idea.competitorsList.length > 3 ? 0.9 : 0.1);
  const defensibility =
    5.4 +
    keywordBoost(`${idea.solution} ${idea.businessModel}`, /\bworkflow|data|compliance|network|proprietary|integration\b/) -
    (idea.solutionIsGenericAI ? 1.1 : 0.3);
  const feasibility =
    6.8 -
    keywordBoost(`${idea.solution} ${idea.startupIdea}`, /\bhardware|marketplace|social network|full stack replacement\b/) +
    keywordBoost(idea.solution, /\bautomation|copilot|assistant|dashboard|api\b/);
  const scalability =
    6.4 + keywordBoost(idea.businessModel, /\bsaas|subscription|platform\b/) - (idea.targetIsBroad ? 0.7 : 0);

  return {
    problemClarity: clamp(problemClarity),
    customerPain: clamp(pain),
    differentiation: clamp(differentiation),
    feasibility: clamp(feasibility),
    monetization: clamp(monetization),
    goToMarket: clamp(goToMarket),
    defensibility: clamp(defensibility),
    scalability: clamp(scalability)
  };
}

function tuneForLens(lens: CriticLens, base: DimensionScores): DimensionScores {
  const tuned = { ...base };
  if (lens === 'Investor') {
    tuned.monetization = clamp(tuned.monetization + 0.5);
    tuned.defensibility = clamp(tuned.defensibility + 0.4);
  }
  if (lens === 'Customer') {
    tuned.customerPain = clamp(tuned.customerPain + 0.6);
    tuned.goToMarket = clamp(tuned.goToMarket + 0.2);
  }
  if (lens === 'Product') {
    tuned.feasibility = clamp(tuned.feasibility + 0.4);
    tuned.problemClarity = clamp(tuned.problemClarity + 0.2);
  }
  if (lens === 'Market') {
    tuned.differentiation = clamp(tuned.differentiation - 0.2);
    tuned.scalability = clamp(tuned.scalability + 0.3);
  }
  if (lens === 'Execution') {
    tuned.feasibility = clamp(tuned.feasibility - 0.3);
    tuned.goToMarket = clamp(tuned.goToMarket - 0.2);
  }
  return tuned;
}

function verdictForLens(lens: CriticLens, scores: DimensionScores, mode: 'normal' | 'brutal'): string {
  const direct = mode === 'brutal';
  const lensSignal =
    lens === 'Investor'
      ? scores.monetization * 0.4 + scores.defensibility * 0.35 + scores.scalability * 0.25
      : lens === 'Customer'
        ? scores.customerPain * 0.45 + scores.problemClarity * 0.35 + scores.goToMarket * 0.2
        : lens === 'Product'
          ? scores.feasibility * 0.45 + scores.problemClarity * 0.3 + scores.differentiation * 0.25
          : lens === 'Market'
            ? scores.differentiation * 0.45 + scores.scalability * 0.3 + scores.goToMarket * 0.25
            : scores.feasibility * 0.4 + scores.goToMarket * 0.35 + scores.defensibility * 0.25;

  const level = lensSignal >= 7.1 ? 'high' : lensSignal >= 5.6 ? 'mid' : 'low';

  const normal: Record<CriticLens, Record<'high' | 'mid' | 'low', string>> = {
    Investor: {
      high: 'Investor take: fundable if early moat and traction proof stay focused.',
      mid: 'Investor take: decent upside, but wedge and moat are not sharp enough yet.',
      low: 'Investor take: weak fundability right now versus execution risk.'
    },
    Customer: {
      high: 'Customer take: urgency is strong enough to support willingness-to-pay.',
      mid: 'Customer take: value exists, but switching trigger is still weak.',
      low: 'Customer take: current framing is unlikely to drive customer adoption.'
    },
    Product: {
      high: 'Product take: MVP scope is workable and likely to deliver clear value.',
      mid: 'Product take: product can work if scope narrows to one painful workflow.',
      low: 'Product take: scope is too broad to land a clear first win.'
    },
    Market: {
      high: 'Market take: timing is workable with focused positioning.',
      mid: 'Market take: category is viable, but differentiation must be tighter.',
      low: 'Market take: competitive pressure is too high for current positioning.'
    },
    Execution: {
      high: 'Execution take: realistic for a small team with disciplined scope.',
      mid: 'Execution take: feasible, but delivery risk rises quickly with scope creep.',
      low: 'Execution take: current plan is too risky to execute cleanly.'
    }
  };

  const brutal: Record<CriticLens, Record<'high' | 'mid' | 'low', string>> = {
    Investor: {
      high: 'Investor take: investable only if traction and moat proof happen fast.',
      mid: 'Investor take: not fundable yet. Wedge and moat are still soft.',
      low: 'Investor take: this is not venture-backable in current form.'
    },
    Customer: {
      high: 'Customer take: people will pay if onboarding friction stays low.',
      mid: 'Customer take: buyers might like it, but urgency is not strong enough.',
      low: 'Customer take: users will not switch for this as currently positioned.'
    },
    Product: {
      high: 'Product take: ship this focused and avoid feature sprawl.',
      mid: 'Product take: cut scope now and own one painful workflow.',
      low: 'Product take: this scope will fail to deliver a clear first win.'
    },
    Market: {
      high: 'Market take: timing is okay only with a harder positioning angle.',
      mid: 'Market take: crowded lane. Generic positioning gets buried.',
      low: 'Market take: category pressure is too high for this idea right now.'
    },
    Execution: {
      high: 'Execution take: build is realistic if the team stays strict on scope.',
      mid: 'Execution take: execution risk is moderate and can spike quickly.',
      low: 'Execution take: delivery risk is too high for the current plan.'
    }
  };

  return (direct ? brutal : normal)[lens][level];
}

function lensSummary(lens: CriticLens, idea: ParsedIdea, mode: 'normal' | 'brutal'): string {
  const core = `${idea.startupIdea} targeting ${idea.targetUsers}`;
  const direct = mode === 'brutal';
  const byLens: Record<CriticLens, string> = {
    Investor: direct
      ? `Investor lens: ${core} is not fundable yet without a hard wedge and credible moat.`
      : `Investor lens: ${core} has potential if moat and wedge are sharpened early.`,
    Customer: direct
      ? 'Customer lens: users will not switch unless the pain is urgent and ROI is obvious.'
      : `Customer lens: value is believable when the pain is urgent and switching costs are low.`,
    Product: direct
      ? 'Product lens: this will fail if you launch broad instead of owning one painful workflow.'
      : `Product lens: initial scope should be constrained to one painful workflow to deliver a clear win.`,
    Market: direct
      ? 'Market lens: this gets crushed in a crowded category unless positioning is significantly tighter.'
      : `Market lens: category pressure is manageable only with tighter positioning and clear timing advantage.`,
    Execution: direct
      ? 'Execution lens: a small team can ship this only with strict scope discipline.'
      : `Execution lens: delivery is realistic for a small team if launch scope remains focused.`
  };
  return byLens[lens];
}

function baseRecommendations(idea: ParsedIdea): string[] {
  const recs = [
    'Start with a narrow, high-pain niche and ship one workflow end-to-end.',
    'Reframe the messaging around measurable outcomes instead of generic AI capabilities.',
    'Test pricing sensitivity with 10-15 target customers before broad launch.'
  ];
  if (idea.targetIsBroad) recs.push('Narrow ICP from broad audience to a segment with clear budget and urgency.');
  if (idea.solutionIsGenericAI)
    recs.push('Replace "AI assistant" positioning with concrete workflow automation language.');
  if (!idea.competitorsList.length)
    recs.push('Map direct and adjacent competitors to clarify your wedge before building full scope.');
  return recs;
}

export function fallbackLensAssessment(lens: CriticLens, idea: ParsedIdea, mode: 'normal' | 'brutal'): LensAssessment {
  const scores = tuneForLens(lens, buildBaseScores(idea));
  const direct = mode === 'brutal';

  const weaknesses = [
    idea.targetIsBroad
      ? direct
        ? 'Your audience is too broad. This kills GTM precision.'
        : 'Target audience is too broad, which weakens early GTM precision.'
      : 'ICP is present but needs sharper budget-holder definition.',
    idea.solutionIsGenericAI
      ? direct
        ? 'Positioning sounds generic. You are blending into commodity AI tooling.'
        : 'Current positioning sounds generic and risks blending into crowded AI tooling.'
      : 'Differentiation exists but is not yet articulated as a hard-to-copy wedge.',
    direct
      ? 'ROI proof is weak. Without hard numbers, buyers will not trust this.'
      : 'Proof of ROI should be clearer to accelerate customer trust and conversion.'
  ];

  const risks = [
    direct
      ? 'Crowded market. Incumbents and fast-follow AI players can out-distribute you.'
      : 'Crowded market with incumbent tools and fast-follow AI competitors.',
    idea.targetIsBroad
      ? 'Unclear ICP can increase CAC and reduce conversion rates.'
      : direct
        ? 'GTM will be expensive before you earn proof and references.'
        : 'GTM channels may be expensive before strong references exist.',
    direct
      ? 'Behavior change is hard. Adoption stalls if users must rebuild workflows.'
      : 'Behavior change risk if onboarding requires users to replace existing workflows.',
    direct
      ? 'Weak wedge. A broad v1 gets ignored.'
      : 'Weak wedge risk if first release is too broad and not outcome-specific.'
  ];

  const recommendations = baseRecommendations(idea);
  const strengths = [
    'Problem framing indicates operational friction that can justify software spend.',
    'Business model signal suggests a pathway to recurring revenue.',
    'Timing narrative can support urgency if tied to regulation, cost pressure, or AI adoption trend.'
  ];

  return {
    lens,
    summary: lensSummary(lens, idea, mode),
    strengths,
    weaknesses,
    risks,
    blindSpots: [
      direct
        ? 'You have not explicitly tested willingness-to-pay assumptions.'
        : 'Missing explicit assumption tests for willingness-to-pay.',
      direct
        ? 'No baseline KPI means you cannot prove ROI fast.'
        : 'No quantified baseline KPI for proving first-wave ROI.'
    ],
    recommendations: recommendations.slice(0, 6),
    dimensionScores: scores,
    verdict: verdictForLens(lens, scores, mode)
  };
}
