import type {
  AggregateScores,
  CritiqueMode,
  LensAssessment,
  ParsedIdea,
  RewriteOutput,
  StructuredCritique,
  Swot
} from '$lib/types/analysis';

function uniqueTake(items: string[], count: number): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, count);
}

function asBand(score: number): string {
  if (score >= 8) return 'Very strong';
  if (score >= 6.5) return 'Strong';
  if (score >= 5) return 'Moderate';
  if (score >= 4) return 'Weak';
  return 'Very weak';
}

function grammarSafe(text: string): string {
  const typoFixes: Array<[RegExp, string]> = [
    [/\bteh\b/gi, 'the'],
    [/\brecieve\b/gi, 'receive'],
    [/\bseperate\b/gi, 'separate'],
    [/\bdefinately\b/gi, 'definitely'],
    [/\boccured\b/gi, 'occurred'],
    [/\bwierd\b/gi, 'weird']
  ];

  let cleaned = text.replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of typoFixes) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = cleaned.replace(/\s+([,.;:!?])/g, '$1');
  cleaned = cleaned.replace(/([.?!])([A-Za-z])/g, '$1 $2');

  if (cleaned.length > 0) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }

  if (!/[.?!]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
}

function firstSentence(value: string): string {
  const sentence = value.split(/[.!?]/)[0]?.trim() ?? '';
  return sentence || value.trim();
}

function truncateWords(value: string, maxWords: number): string {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

function stripLeadPhrase(value: string): string {
  return value
    .replace(/^(the product|this product|the tool|this tool|our product|our tool)\s+/i, '')
    .replace(/^(it|this)\s+/i, '')
    .trim();
}

function lowerStart(value: string): string {
  if (!value) return value;
  return value[0].toLowerCase() + value.slice(1);
}

function buildRevisedHeadline(idea: ParsedIdea): string {
  const targetBase = idea.targetUsers.split(/,| with | using | managing /i)[0]?.trim() || idea.targetUsers;
  const target = truncateWords(targetBase, 7);

  const workflowBase = stripLeadPhrase(firstSentence(idea.solution));
  const workflow = truncateWords(workflowBase, 10);

  const painSentence = firstSentence(idea.painPoint);
  const painMatch = painSentence.match(
    /\b(?:lose|losing|spend|spending|waste|wasting|cost|costing)\b\s+(.+)/i
  );
  const painCoreRaw = painMatch?.[1] ?? painSentence;
  const painCore = truncateWords(
    stripLeadPhrase(painCoreRaw.replace(/\b(that|which|before)\b.+$/i, '').replace(/^[,.;:\s-]+/, '')),
    11
  );

  const workflowPart = lowerStart(workflow);
  const painPart = lowerStart(painCore);

  if (workflowPart && painPart) {
    return grammarSafe(`For ${target}, automate ${workflowPart} to cut ${painPart}`);
  }
  if (workflowPart) {
    return grammarSafe(`For ${target}, automate ${workflowPart}`);
  }
  return grammarSafe(`For ${target}, cut costly manual work with focused automation`);
}

function differentiationWhy(idea: ParsedIdea, scores: AggregateScores): string {
  const allCompetitors = [...new Set([...idea.competitorsList, ...idea.inferredCompetitors])].slice(0, 3);
  if (idea.solutionIsGenericAI && idea.competitorCount > 0) {
    return `Positioning sounds like a generic AI assistant and overlaps with ${allCompetitors.join(', ')} without a clear wedge.`;
  }
  if (idea.competitorCount > 3) {
    return `The market already has many similar tools (${allCompetitors.join(', ')}), and the pitch does not show a hard-to-copy advantage yet.`;
  }
  if (idea.targetIsBroad) {
    return 'Target audience is broad, so the value proposition is not uniquely strong for one segment.';
  }
  if (scores.dimensionScores.defensibility < 5.5) {
    return 'Defensibility is weak, so competitors can likely copy the core value quickly.';
  }
  return 'Differentiation exists, but the wedge is not stated as a specific workflow + measurable outcome.';
}

export function buildStructuredCritique(scores: AggregateScores, idea: ParsedIdea): StructuredCritique {
  return {
    clarityOfProblem: `${asBand(scores.dimensionScores.problemClarity)} (${scores.dimensionScores.problemClarity}/10)`,
    customerPainLevel: `${asBand(scores.dimensionScores.customerPain)} (${scores.dimensionScores.customerPain}/10)`,
    differentiation: `${asBand(scores.dimensionScores.differentiation)} (${scores.dimensionScores.differentiation}/10)`,
    differentiationWhy: differentiationWhy(idea, scores),
    feasibility: `${asBand(scores.dimensionScores.feasibility)} (${scores.dimensionScores.feasibility}/10)`,
    monetizationStrength: `${asBand(scores.dimensionScores.monetization)} (${scores.dimensionScores.monetization}/10)`,
    goToMarketDifficulty: `${scores.executionComplexity} difficulty`,
    defensibility: `${asBand(scores.dimensionScores.defensibility)} (${scores.dimensionScores.defensibility}/10)`,
    scalability: `${asBand(scores.dimensionScores.scalability)} (${scores.dimensionScores.scalability}/10)`
  };
}

function hardenRecommendation(line: string): string {
  const trimmed = line.trim().replace(/\.$/, '');
  if (!trimmed) return trimmed;
  if (/^stop\b/i.test(trimmed) || /^cut\b/i.test(trimmed) || /^focus\b/i.test(trimmed)) return `${trimmed}.`;
  if (/^replace\b/i.test(trimmed)) return `${trimmed}.`;
  return `Do this now: ${trimmed}.`;
}

export function buildTopLists(lenses: LensAssessment[], mode: CritiqueMode): {
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendations: string[];
} {
  const direct = mode === 'brutal';
  const recommendations = uniqueTake(lenses.flatMap((lens) => lens.recommendations), 8);
  return {
    strengths: uniqueTake(lenses.flatMap((lens) => lens.strengths), direct ? 4 : 6),
    weaknesses: uniqueTake(lenses.flatMap((lens) => lens.weaknesses), direct ? 8 : 6),
    risks: uniqueTake(lenses.flatMap((lens) => lens.risks), direct ? 10 : 8),
    recommendations: direct ? recommendations.map(hardenRecommendation) : recommendations
  };
}

export function buildSwot(
  strengths: string[],
  weaknesses: string[],
  risks: string[],
  recommendations: string[]
): Swot {
  const opportunities = uniqueTake(
    recommendations.map((item) => `Opportunity: ${item}`),
    4
  );
  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    opportunities,
    threats: risks.slice(0, 4)
  };
}

export function buildRewrite(
  idea: ParsedIdea,
  scores: AggregateScores,
  mode: CritiqueMode,
  context?: { repeatedRisk?: string }
): RewriteOutput {
  const direct = mode === 'brutal';
  const dimensions = Object.entries(scores.dimensionScores) as Array<[keyof AggregateScores['dimensionScores'], number]>;
  const weakest = [...dimensions].sort((a, b) => a[1] - b[1])[0];
  const strongest = [...dimensions].sort((a, b) => b[1] - a[1])[0];
  const weakestLabel = weakest[0].replace(/([A-Z])/g, ' $1').toLowerCase();
  const strongestLabel = strongest[0].replace(/([A-Z])/g, ' $1').toLowerCase();

  const audience = idea.targetIsBroad
    ? `a narrower segment within ${idea.targetUsers}`
    : idea.targetUsers;
  const positioning = idea.solutionIsGenericAI
    ? 'workflow automation with clear business value'
    : 'focused solution for one market';
  const strongerNiche = idea.targetIsBroad
    ? `${idea.targetUsers.split(' ').slice(0, 6).join(' ')} teams with urgent compliance or revenue pain`
    : `${idea.targetUsers} with high-frequency operational pain`;
  const improvedIdea = `A focused ${idea.solutionIsGenericAI ? 'automation tool' : 'decision support tool'} for ${strongerNiche}.`;
  const firstWorkflow = /compliance|audit|regulat/i.test(`${idea.startupIdea} ${idea.painPoint} ${idea.solution}`)
    ? 'auto-validate required documents and generate audit-ready packets'
    : /recruit|hiring|candidate/i.test(`${idea.startupIdea} ${idea.painPoint} ${idea.solution}`)
      ? 'screen incoming candidates and trigger ranked outreach in one queue'
      : /sales|pipeline|crm/i.test(`${idea.startupIdea} ${idea.painPoint} ${idea.solution}`)
        ? 'score leads and automate next-step follow-up from one workflow'
        : 'automate one repeated high-friction workflow end-to-end';
  const successMetric = /compliance|audit|regulat/i.test(`${idea.startupIdea} ${idea.painPoint} ${idea.solution}`)
    ? 'reduce documentation errors by 40% in the first 30 days'
    : /recruit|hiring|candidate/i.test(`${idea.startupIdea} ${idea.painPoint} ${idea.solution}`)
      ? 'cut time-to-shortlist by 35% in the first 30 days'
      : /sales|pipeline|crm/i.test(`${idea.startupIdea} ${idea.painPoint} ${idea.solution}`)
        ? 'increase qualified follow-ups per rep by 30% in the first month'
        : 'save at least 6 team-hours per week per pilot customer';

  return {
    improvedIdea,
    sharperNiche: strongerNiche,
    betterPositioning: `Move from broad "AI assistant" language to ${positioning}, especially to improve ${weakestLabel}.`,
    repositioning: `Position it as ${positioning} for ${audience}, focused on one repeat task and leaning into your strength in ${strongestLabel}.`,
    revisedPitch: `${idea.startupIdea} helps ${audience} eliminate "${idea.painPoint}" with a focused product that delivers value in days, not months.`,
    revisedHeadline: buildRevisedHeadline(idea),
    icpRefinement: idea.targetIsBroad
      ? `Start with a smaller group inside ${idea.targetUsers} that has urgent pain and budget.`
      : `Start with buyers inside ${idea.targetUsers} who have urgent pain and can approve budget quickly.`,
    pivotSuggestion: `Start with ${firstWorkflow} for ${audience}. Target a pilot where you can ${successMetric} before expanding scope.${
      context?.repeatedRisk ? ` First, reduce this repeated risk: ${context.repeatedRisk}` : ''
    }`,
    whyBetter: [
      'The target group is tighter, so marketing and sales become clearer.',
      'The message focuses on business results instead of generic AI.',
      direct
        ? 'This version is easier to sell because it solves one painful problem first.'
        : 'This first version can prove value quickly on one painful workflow.'
    ],
    pivot: {
      newTarget: strongerNiche,
      newPositioning: `Focused ${positioning} with clear value language.`,
      firstWorkflow,
      successMetric,
      whyBetter: direct
        ? 'This pivot cuts broad scope and targets buyers with urgency and budget.'
        : 'This pivot narrows scope and makes buying intent clearer.',
      revisedPitch: `${idea.startupIdea} for ${strongerNiche} with a first release focused on one painful workflow and measurable ROI.`
    }
  };
}

export function buildFinalVerdict(scores: AggregateScores, mode: CritiqueMode = 'normal'): string {
  const label = scores.verdictLabel;
  if (mode === 'brutal') {
    return grammarSafe(`${label}. Fix uniqueness and monetization before building.`);
  }
  return grammarSafe(label);
}

export function buildPortfolioAngle(scores: AggregateScores): string {
  if (scores.dimensionScores.differentiation < 5.5)
    return 'Pick one clear angle and explain why competitors cannot copy it easily.';
  if (scores.dimensionScores.goToMarket < 5.5)
    return 'Narrow the target customer and use one simple channel to get your first users.';
  return 'Show simple proof of value (time saved or money saved) to make sales easier.';
}

export function buildWhyNotToBuildThis(weaknesses: string[], risks: string[], mode: CritiqueMode): string[] {
  const base = uniqueTake([...risks, ...weaknesses], 4);
  if (mode === 'brutal') {
    return base.map((line) => `Do not build this yet if: ${line}`);
  }
  return base.map((line) => `Pause if: ${line}`);
}
