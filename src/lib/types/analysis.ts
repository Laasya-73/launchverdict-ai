export type CriticLens = 'Investor' | 'Customer' | 'Product' | 'Market' | 'Execution';
export type CritiqueMode = 'normal' | 'brutal';
export type EvidenceTag = 'model-estimate' | 'inferred' | 'rule-based';

export interface IdeaInput {
  startupIdea: string;
  targetUsers: string;
  painPoint: string;
  solution: string;
  businessModel: string;
  competitors?: string;
  whyNow: string;
  marketCategory?: string;
  critiqueMode?: CritiqueMode;
  fromImproveRerun?: boolean;
}

export interface ParsedIdea extends IdeaInput {
  critiqueMode: CritiqueMode;
  competitorsList: string[];
  shortSummary: string;
  inferredCompetitors: string[];
  targetIsBroad: boolean;
  solutionIsGenericAI: boolean;
  marketType: 'b2b' | 'b2c' | 'mixed';
  pricingSignalStrong: boolean;
  competitorCount: number;
}

export interface DimensionScores {
  problemClarity: number;
  customerPain: number;
  differentiation: number;
  feasibility: number;
  monetization: number;
  goToMarket: number;
  defensibility: number;
  scalability: number;
}

export interface LensAssessment {
  lens: CriticLens;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  blindSpots: string[];
  recommendations: string[];
  dimensionScores: DimensionScores;
  verdict: string;
}

export interface AggregateScores {
  dimensionScores: DimensionScores;
  problemStrength: number;
  differentiation: number;
  monetizationPotential: number;
  founderRisk: number;
  executionComplexity: 'Low' | 'Medium' | 'High';
  overallVentureScore: number;
  verdictLabel: 'Weak idea' | 'Needs refinement' | 'Promising but unfocused' | 'Strong niche opportunity' | 'High-potential concept';
}

export interface StructuredCritique {
  clarityOfProblem: string;
  customerPainLevel: string;
  differentiation: string;
  differentiationWhy: string;
  feasibility: string;
  monetizationStrength: string;
  goToMarketDifficulty: string;
  defensibility: string;
  scalability: string;
}

export interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface RewriteOutput {
  improvedIdea: string;
  sharperNiche: string;
  betterPositioning: string;
  repositioning: string;
  revisedPitch: string;
  revisedHeadline: string;
  icpRefinement: string;
  pivotSuggestion: string;
  whyBetter: string[];
  pivot: {
    newTarget: string;
    newPositioning: string;
    firstWorkflow: string;
    successMetric: string;
    whyBetter: string;
    revisedPitch: string;
  };
}

export interface VentureReport {
  submittedAt: string;
  reportSlug: string;
  critiqueMode: CritiqueMode;
  confidence: number;
  confidenceExplanation: string;
  competitorDisclaimer: string;
  parsedIdea: ParsedIdea;
  lenses: LensAssessment[];
  structuredCritique: StructuredCritique;
  scores: AggregateScores;
  topStrengths: string[];
  topWeaknesses: string[];
  failureRisks: string[];
  whyNotToBuildThis: string[];
  improvementSuggestions: string[];
  swot: Swot;
  rewrite: RewriteOutput;
  finalVerdict: string;
  portfolioAngle: string;
}

export interface CompareIdeasInput {
  ideaA: IdeaInput;
  ideaB: IdeaInput;
  critiqueMode?: CritiqueMode;
}

export interface ComparisonMetric {
  metric: string;
  ideaA: number;
  ideaB: number;
  winner: 'A' | 'B';
}

export interface CompareIdeasReport {
  critiqueMode: CritiqueMode;
  confidence: number;
  confidenceBand: 'High confidence' | 'Moderate confidence' | 'Close decision';
  ideaA: VentureReport;
  ideaB: VentureReport;
  matrix: ComparisonMetric[];
  winner: 'Idea A' | 'Idea B';
  winnerReason: string;
  tradeoffs: string[];
  recommendation: string;
}
