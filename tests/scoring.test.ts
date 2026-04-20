import { describe, expect, it } from 'vitest';
import { buildAggregateScores } from '../src/lib/server/scoring/engine';
import type { LensAssessment, ParsedIdea } from '../src/lib/types/analysis';

const baseLens: LensAssessment = {
  lens: 'Investor',
  summary: 'test',
  strengths: ['a', 'b'],
  weaknesses: ['a', 'b'],
  risks: ['a', 'b'],
  blindSpots: ['a'],
  recommendations: ['a', 'b'],
  dimensionScores: {
    problemClarity: 7,
    customerPain: 7,
    differentiation: 6,
    feasibility: 6,
    monetization: 8,
    goToMarket: 6,
    defensibility: 6,
    scalability: 7
  },
  verdict: 'test'
};

describe('buildAggregateScores', () => {
  it('returns bounded and rounded scores', () => {
    const lenses: LensAssessment[] = [
      baseLens,
      { ...baseLens, lens: 'Customer' },
      { ...baseLens, lens: 'Product' },
      { ...baseLens, lens: 'Market' },
      { ...baseLens, lens: 'Execution' }
    ];

    const parsedIdea = {
      startupIdea: 'B2B automation platform for finance operations teams',
      targetUsers: 'Finance operations teams at mid-market B2B companies',
      painPoint: 'Manual reconciliation and reporting workflows consume too many hours',
      solution: 'Workflow automation with approval logic and dashboard reporting',
      businessModel: 'Per-seat annual subscription with enterprise tiers',
      competitors: 'ToolA, ToolB',
      whyNow: 'AI adoption and cost pressure make automation urgency higher',
      marketCategory: 'B2B SaaS',
      critiqueMode: 'normal',
      competitorsList: ['ToolA', 'ToolB'],
      inferredCompetitors: ['ToolC'],
      shortSummary: 'summary',
      targetIsBroad: false,
      solutionIsGenericAI: false,
      marketType: 'b2b',
      pricingSignalStrong: true,
      competitorCount: 3
    } satisfies ParsedIdea;

    const output = buildAggregateScores(lenses, parsedIdea);
    expect(output.overallVentureScore).toBeGreaterThan(0);
    expect(output.overallVentureScore).toBeLessThanOrEqual(10);
    expect(['Low', 'Medium', 'High']).toContain(output.executionComplexity);
    expect(output.verdictLabel).toBeTypeOf('string');
  });

  it('applies deterministic rule penalties for crowded and weak-monetization ideas', () => {
    const lenses: LensAssessment[] = [
      { ...baseLens, lens: 'Investor', dimensionScores: { ...baseLens.dimensionScores, differentiation: 8, monetization: 8 } },
      { ...baseLens, lens: 'Customer', dimensionScores: { ...baseLens.dimensionScores, differentiation: 8, monetization: 8 } },
      { ...baseLens, lens: 'Product', dimensionScores: { ...baseLens.dimensionScores, differentiation: 8, monetization: 8 } },
      { ...baseLens, lens: 'Market', dimensionScores: { ...baseLens.dimensionScores, differentiation: 8, monetization: 8 } },
      { ...baseLens, lens: 'Execution', dimensionScores: { ...baseLens.dimensionScores, differentiation: 8, monetization: 8 } }
    ];

    const parsedIdea = {
      startupIdea: 'Consumer AI app for everyone',
      targetUsers: 'Consumers and students across many broad segments',
      painPoint: 'People need help with tasks and planning',
      solution: 'General AI assistant that helps with many different workflows',
      businessModel: 'Freemium consumer application with unclear paid tier',
      competitors: 'A, B, C, D, E',
      whyNow: 'AI is popular now',
      marketCategory: 'Consumer AI',
      critiqueMode: 'normal',
      competitorsList: ['A', 'B', 'C', 'D', 'E'],
      inferredCompetitors: ['F'],
      shortSummary: 'summary',
      targetIsBroad: true,
      solutionIsGenericAI: true,
      marketType: 'b2c',
      pricingSignalStrong: false,
      competitorCount: 6
    } satisfies ParsedIdea;

    const output = buildAggregateScores(lenses, parsedIdea);
    expect(output.differentiation).toBeLessThanOrEqual(4.8);
    expect(output.monetizationPotential).toBeLessThanOrEqual(5.8);
  });
});
