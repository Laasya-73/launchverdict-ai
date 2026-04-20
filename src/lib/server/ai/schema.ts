import { z } from 'zod';

const numberScore = z.coerce.number().min(0).max(10);

export const dimensionScoresSchema = z.object({
  problemClarity: numberScore,
  customerPain: numberScore,
  differentiation: numberScore,
  feasibility: numberScore,
  monetization: numberScore,
  goToMarket: numberScore,
  defensibility: numberScore,
  scalability: numberScore
});

export const lensAssessmentSchema = z.object({
  lens: z.enum(['Investor', 'Customer', 'Product', 'Market', 'Execution']),
  summary: z.string().min(12).max(600),
  strengths: z.array(z.string().min(3).max(180)).min(2).max(6),
  weaknesses: z.array(z.string().min(3).max(180)).min(2).max(6),
  risks: z.array(z.string().min(3).max(180)).min(2).max(8),
  blindSpots: z.array(z.string().min(3).max(180)).min(1).max(5),
  recommendations: z.array(z.string().min(3).max(180)).min(2).max(8),
  dimensionScores: dimensionScoresSchema,
  verdict: z.string().min(6).max(180)
});

export type LensAssessmentSchema = z.infer<typeof lensAssessmentSchema>;
