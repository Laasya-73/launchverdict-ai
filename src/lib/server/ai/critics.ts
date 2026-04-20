import type { CriticLens, LensAssessment, ParsedIdea } from '$lib/types/analysis';
import { fallbackLensAssessment } from './fallback';
import { LENSES } from './prompts';
import { requestLensFromGemini, requestLensFromOpenAI } from './provider';
import { lensAssessmentSchema } from './schema';

function band(score: number): 'high' | 'mid' | 'low' {
  if (score >= 7.1) return 'high';
  if (score >= 5.6) return 'mid';
  return 'low';
}

function lensWeightedSignal(assessment: LensAssessment, lens: CriticLens): number {
  const s = assessment.dimensionScores;
  if (lens === 'Investor') return s.monetization * 0.4 + s.defensibility * 0.35 + s.scalability * 0.25;
  if (lens === 'Customer') return s.customerPain * 0.45 + s.problemClarity * 0.35 + s.goToMarket * 0.2;
  if (lens === 'Product') return s.feasibility * 0.45 + s.problemClarity * 0.3 + s.differentiation * 0.25;
  if (lens === 'Market') return s.differentiation * 0.45 + s.scalability * 0.3 + s.goToMarket * 0.25;
  return s.feasibility * 0.4 + s.goToMarket * 0.35 + s.defensibility * 0.25;
}

function buildLensVerdict(lens: CriticLens, assessment: LensAssessment, mode: 'normal' | 'brutal'): string {
  const signal = lensWeightedSignal(assessment, lens);
  const level = band(signal);
  const direct = mode === 'brutal';

  const normal: Record<CriticLens, Record<'high' | 'mid' | 'low', string>> = {
    Investor: {
      high: 'Investor take: fundable if you prove early traction and keep moat-building focused.',
      mid: 'Investor take: attractive but not venture-ready until wedge and moat are clearer.',
      low: 'Investor take: weak fundability right now; upside does not yet justify risk.'
    },
    Customer: {
      high: 'Customer take: pain and value are clear enough to support willingness-to-pay.',
      mid: 'Customer take: value is plausible, but urgency and switching trigger need sharper proof.',
      low: 'Customer take: customer urgency is too weak to drive reliable adoption.'
    },
    Product: {
      high: 'Product take: scoped well for an MVP with a clear path to user value.',
      mid: 'Product take: product can work, but scope needs tighter workflow focus.',
      low: 'Product take: solution is too broad and likely to miss a clear first win.'
    },
    Market: {
      high: 'Market take: timing and category dynamics are favorable with focused positioning.',
      mid: 'Market take: viable market, but differentiation must be sharper to stand out.',
      low: 'Market take: competitive pressure is high and current positioning is too exposed.'
    },
    Execution: {
      high: 'Execution take: small team can realistically build and launch this plan.',
      mid: 'Execution take: feasible with strict sequencing and controlled launch scope.',
      low: 'Execution take: delivery risk is high for current scope and constraints.'
    }
  };

  const brutal: Record<CriticLens, Record<'high' | 'mid' | 'low', string>> = {
    Investor: {
      high: 'Investor take: fundable only if you move fast on traction and moat.',
      mid: 'Investor take: not fundable yet. Wedge and moat are still soft.',
      low: 'Investor take: this does not clear venture-backable quality.'
    },
    Customer: {
      high: 'Customer take: people will likely pay if onboarding stays simple.',
      mid: 'Customer take: buyers may like it, but urgency is not strong enough yet.',
      low: 'Customer take: customers will not switch for this as currently framed.'
    },
    Product: {
      high: 'Product take: MVP path is clear. Ship focused and avoid feature sprawl.',
      mid: 'Product take: scope is loose. Cut features and own one painful workflow.',
      low: 'Product take: product direction is unfocused and likely to stall.'
    },
    Market: {
      high: 'Market take: timing is workable, but only with sharp positioning.',
      mid: 'Market take: crowded lane. You need a harder angle to survive.',
      low: 'Market take: market pressure is too high for this current positioning.'
    },
    Execution: {
      high: 'Execution take: build is realistic if the team stays disciplined.',
      mid: 'Execution take: execution risk is moderate and can spike if scope expands.',
      low: 'Execution take: this is too hard to execute cleanly with current scope.'
    }
  };

  return (direct ? brutal : normal)[lens][level];
}

function normalizeAssessment(candidate: LensAssessment, lens: CriticLens): LensAssessment {
  const validated = lensAssessmentSchema.parse({
    ...candidate,
    lens
  });
  return validated;
}

export async function runCriticLenses(
  idea: ParsedIdea,
  mode: 'normal' | 'brutal',
  env: { OPENAI_API_KEY?: string; OPENAI_MODEL?: string; GOOGLE_API_KEY?: string; GOOGLE_MODEL?: string }
): Promise<LensAssessment[]> {
  const openAIModel = env.OPENAI_MODEL || 'gpt-4.1-mini';
  const openAIKey = env.OPENAI_API_KEY;
  const googleModel = env.GOOGLE_MODEL || 'gemini-2.0-flash';
  const googleKey = env.GOOGLE_API_KEY;

  const outputs = await Promise.all(
    LENSES.map(async (lens) => {
      if (!openAIKey && !googleKey) {
        const fallback = fallbackLensAssessment(lens, idea, mode);
        return {
          ...fallback,
          verdict: buildLensVerdict(lens, fallback, mode)
        };
      }

      try {
        if (openAIKey) {
          const llm = await requestLensFromOpenAI(lens, idea, mode, openAIKey, openAIModel);
          const normalized = normalizeAssessment(llm, lens);
          return {
            ...normalized,
            verdict: buildLensVerdict(lens, normalized, mode)
          };
        }

        if (googleKey) {
          const llm = await requestLensFromGemini(lens, idea, mode, googleKey, googleModel);
          const normalized = normalizeAssessment(llm, lens);
          return {
            ...normalized,
            verdict: buildLensVerdict(lens, normalized, mode)
          };
        }
      } catch {
        if (openAIKey && googleKey) {
          try {
            const llm = await requestLensFromGemini(lens, idea, mode, googleKey, googleModel);
            const normalized = normalizeAssessment(llm, lens);
            return {
              ...normalized,
              verdict: buildLensVerdict(lens, normalized, mode)
            };
          } catch {
            const fallback = fallbackLensAssessment(lens, idea, mode);
            return {
              ...fallback,
              verdict: buildLensVerdict(lens, fallback, mode)
            };
          }
        }
        const fallback = fallbackLensAssessment(lens, idea, mode);
        return {
          ...fallback,
          verdict: buildLensVerdict(lens, fallback, mode)
        };
      }

      const fallback = fallbackLensAssessment(lens, idea, mode);
      return {
        ...fallback,
        verdict: buildLensVerdict(lens, fallback, mode)
      };
    })
  );

  return outputs;
}
