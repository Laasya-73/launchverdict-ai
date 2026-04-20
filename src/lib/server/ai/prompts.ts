import type { CriticLens, CritiqueMode, ParsedIdea } from '$lib/types/analysis';

export const LENSES: CriticLens[] = ['Investor', 'Customer', 'Product', 'Market', 'Execution'];

const LENS_FOCUS: Record<CriticLens, string> = {
  Investor:
    'Assess venture-backability, market size signal, monetization quality, moat potential, and risk-adjusted upside.',
  Customer:
    'Assess willingness-to-pay, urgency of pain, switching friction, trust, and whether the value proposition is compelling.',
  Product:
    'Assess product sharpness, usability, wedge clarity, feature focus, and whether the first version can deliver an obvious win.',
  Market:
    'Assess competition intensity, timing, distribution dynamics, substitution threats, and category crowding.',
  Execution:
    'Assess build complexity, sequencing, team requirements, data dependencies, GTM tractability, and operational risk.'
};

function modeInstruction(mode: CritiqueMode): string {
  if (mode === 'brutal') {
    return 'Brutal honesty mode is ON. Lead with flaws first. Use direct, critical wording with no hedging, no polite buffering, and no soft language.';
  }
  return 'Normal mode is ON. Be candid but professional and constructive.';
}

export function buildLensSystemPrompt(lens: CriticLens, mode: CritiqueMode): string {
  return [
    'You are a strict startup evaluator.',
    `Current lens: ${lens}.`,
    modeInstruction(mode),
    LENS_FOCUS[lens],
    'Return JSON only.',
    'Use concrete, non-generic critique.',
    'Scores must be 0-10 where 10 is strongest.',
    'Keep arrays concise and specific.'
  ].join(' ');
}

export function buildLensUserPrompt(lens: CriticLens, idea: ParsedIdea, mode: CritiqueMode): string {
  return `
Evaluate this startup concept through the ${lens} lens.
Critique mode: ${mode}.

Startup Idea: ${idea.startupIdea}
Target Users: ${idea.targetUsers}
Pain Point: ${idea.painPoint}
Solution: ${idea.solution}
Business Model: ${idea.businessModel}
Competitors (user-provided): ${idea.competitors || 'None provided'}
Inferred Competitors: ${idea.inferredCompetitors.join(', ') || 'None inferred'}
Why Now: ${idea.whyNow}
Market / Category: ${idea.marketCategory || 'Unspecified'}

Return strict JSON with this shape:
{
  "lens": "${lens}",
  "summary": "string",
  "strengths": ["string", "..."],
  "weaknesses": ["string", "..."],
  "risks": ["string", "..."],
  "blindSpots": ["string", "..."],
  "recommendations": ["string", "..."],
  "dimensionScores": {
    "problemClarity": 0,
    "customerPain": 0,
    "differentiation": 0,
    "feasibility": 0,
    "monetization": 0,
    "goToMarket": 0,
    "defensibility": 0,
    "scalability": 0
  },
  "verdict": "short verdict"
}

Additional constraints:
- In brutal mode, weaknesses and risks must be sharper than strengths.
- Keep recommendations concrete and specific.
`;
}
