import type { CriticLens, DimensionScores } from '$lib/types/analysis';

export const DIMENSION_KEYS: Array<keyof DimensionScores> = [
  'problemClarity',
  'customerPain',
  'differentiation',
  'feasibility',
  'monetization',
  'goToMarket',
  'defensibility',
  'scalability'
];

export const DIMENSION_WEIGHTS: Record<keyof DimensionScores, number> = {
  problemClarity: 0.15,
  customerPain: 0.15,
  differentiation: 0.15,
  feasibility: 0.15,
  monetization: 0.15,
  goToMarket: 0.1,
  defensibility: 0.1,
  scalability: 0.05
};

export const LENS_WEIGHTS: Record<CriticLens, number> = {
  Investor: 0.25,
  Customer: 0.2,
  Product: 0.2,
  Market: 0.2,
  Execution: 0.15
};
