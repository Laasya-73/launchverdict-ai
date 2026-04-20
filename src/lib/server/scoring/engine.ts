import { DIMENSION_KEYS, DIMENSION_WEIGHTS, LENS_WEIGHTS } from '$lib/constants/rubric';
import type { AggregateScores, DimensionScores, LensAssessment, ParsedIdea } from '$lib/types/analysis';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, value));
}

function weightedDimensionScores(lenses: LensAssessment[]): DimensionScores {
  const base = {
    problemClarity: 0,
    customerPain: 0,
    differentiation: 0,
    feasibility: 0,
    monetization: 0,
    goToMarket: 0,
    defensibility: 0,
    scalability: 0
  };

  for (const dimension of DIMENSION_KEYS) {
    const value = lenses.reduce((sum, lens) => {
      const lensWeight = LENS_WEIGHTS[lens.lens];
      return sum + lens.dimensionScores[dimension] * lensWeight;
    }, 0);
    base[dimension] = round1(clamp(value));
  }

  return base;
}

function calculateOverall(scores: DimensionScores): number {
  const total = DIMENSION_KEYS.reduce((sum, key) => sum + scores[key] * DIMENSION_WEIGHTS[key], 0);
  return round1(clamp(total));
}

function executionComplexityFromScores(scores: DimensionScores): 'Low' | 'Medium' | 'High' {
  const executionSignal = (scores.feasibility + scores.goToMarket) / 2;
  if (executionSignal >= 7.2) return 'Low';
  if (executionSignal >= 5.4) return 'Medium';
  return 'High';
}

function applyRuleLayer(scores: DimensionScores, idea: ParsedIdea): DimensionScores {
  const adjusted = { ...scores };

  if (idea.competitorCount > 3) {
    adjusted.differentiation = clamp(adjusted.differentiation - 2);
    adjusted.differentiation = Math.min(adjusted.differentiation, 4.8);
  } else if (idea.competitorCount > 0) {
    adjusted.differentiation = clamp(adjusted.differentiation - 1.4);
    adjusted.differentiation = Math.min(adjusted.differentiation, 6.1);
  }

  if (idea.marketType === 'b2c' && !idea.pricingSignalStrong) {
    adjusted.monetization = clamp(adjusted.monetization - 2);
    adjusted.monetization = Math.min(adjusted.monetization, 5.8);
  }

  if (idea.marketType === 'b2b') {
    adjusted.monetization = clamp(adjusted.monetization + 0.8);
    adjusted.goToMarket = clamp(adjusted.goToMarket + 0.3);
  }

  if (idea.solutionIsGenericAI) {
    adjusted.differentiation = clamp(adjusted.differentiation - 1);
    adjusted.defensibility = clamp(adjusted.defensibility - 0.7);
  }

  return adjusted;
}

function verdictLabelFromScore(score: number): AggregateScores['verdictLabel'] {
  if (score < 4) return 'Weak idea';
  if (score < 6) return 'Needs refinement';
  if (score < 7.5) return 'Promising but unfocused';
  if (score < 9) return 'Strong niche opportunity';
  return 'High-potential concept';
}

export function buildAggregateScores(lenses: LensAssessment[], idea: ParsedIdea): AggregateScores {
  const baseScores = weightedDimensionScores(lenses);
  const dimensionScores = applyRuleLayer(baseScores, idea);
  const problemStrength = round1((dimensionScores.problemClarity + dimensionScores.customerPain) / 2);
  const founderRisk = round1(
    clamp(10 - (dimensionScores.feasibility * 0.4 + dimensionScores.goToMarket * 0.35 + dimensionScores.defensibility * 0.25))
  );
  const overallVentureScore = calculateOverall(dimensionScores);

  return {
    dimensionScores,
    problemStrength,
    differentiation: dimensionScores.differentiation,
    monetizationPotential: dimensionScores.monetization,
    founderRisk,
    executionComplexity: executionComplexityFromScores(dimensionScores),
    overallVentureScore,
    verdictLabel: verdictLabelFromScore(overallVentureScore)
  };
}
