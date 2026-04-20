import type { IdeaInput, ParsedIdea } from '$lib/types/analysis';

const broadTargetPattern =
  /\b(everyone|anyone|all users|all businesses|any business|consumers|general public)\b/i;
const genericAiPattern =
  /\b(ai assistant|chatbot|copilot|platform for everyone|agent for everyone|general ai)\b/i;
const b2bPattern =
  /\b(smb|small business|mid-market|enterprise|operations|team|company|firms|workflow|b2b|saas)\b/i;
const b2cPattern =
  /\b(consumers|students|parents|individuals|people|creators|gamers|patients|runners|fitness)\b/i;
const pricingPattern =
  /\b(subscription|annual|seat|per-seat|contract|usage|transaction|license|tiered|enterprise plan)\b/i;

const COMPETITOR_HINTS: Array<{ trigger: RegExp; competitors: string[] }> = [
  { trigger: /\bworkflow|automation|integrat/i, competitors: ['Zapier', 'Make', 'Airtable'] },
  { trigger: /\bnotes|docs|knowledge|wiki/i, competitors: ['Notion AI', 'Coda AI', 'Confluence'] },
  { trigger: /\bsales|crm|pipeline/i, competitors: ['HubSpot', 'Salesforce', 'Pipedrive'] },
  { trigger: /\blegal|contract|compliance/i, competitors: ['Harvey', 'Ironclad', 'Clio'] },
  { trigger: /\brecruit|hiring|talent/i, competitors: ['Greenhouse', 'Lever', 'Ashby'] },
  { trigger: /\bmarketing|ads|campaign/i, competitors: ['Jasper', 'Copy.ai', 'HubSpot'] },
  { trigger: /\bhealth|wellness|fitness/i, competitors: ['Noom', 'MyFitnessPal', 'Whoop'] }
];

export function splitCompetitors(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/,|\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export function inferCompetitors(input: IdeaInput): string[] {
  const text = `${input.startupIdea} ${input.solution} ${input.marketCategory ?? ''}`.toLowerCase();
  const inferred = new Set<string>();

  for (const hint of COMPETITOR_HINTS) {
    if (hint.trigger.test(text)) {
      hint.competitors.forEach((name) => inferred.add(name));
    }
  }

  return [...inferred].slice(0, 5);
}

export function preprocessIdeaInput(input: IdeaInput): ParsedIdea {
  const cleaned: IdeaInput = {
    startupIdea: input.startupIdea.trim(),
    targetUsers: input.targetUsers.trim(),
    painPoint: input.painPoint.trim(),
    solution: input.solution.trim(),
    businessModel: input.businessModel.trim(),
    competitors: input.competitors?.trim() ?? '',
    whyNow: input.whyNow.trim(),
    marketCategory: input.marketCategory?.trim() ?? '',
    critiqueMode: input.critiqueMode ?? 'normal'
  };

  const competitorsList = splitCompetitors(cleaned.competitors);
  const inferredCompetitors = inferCompetitors(cleaned);
  const competitorCount = competitorsList.length + inferredCompetitors.length;
  const shortSummary = `${cleaned.startupIdea} for ${cleaned.targetUsers} solving ${cleaned.painPoint}`;
  const text = `${cleaned.targetUsers} ${cleaned.businessModel} ${cleaned.marketCategory ?? ''}`;
  const marketType =
    b2bPattern.test(text) && !b2cPattern.test(text)
      ? 'b2b'
      : b2cPattern.test(text) && !b2bPattern.test(text)
        ? 'b2c'
        : 'mixed';

  return {
    ...cleaned,
    critiqueMode: cleaned.critiqueMode ?? 'normal',
    competitorsList,
    inferredCompetitors,
    competitorCount,
    shortSummary,
    targetIsBroad: broadTargetPattern.test(cleaned.targetUsers),
    solutionIsGenericAI: genericAiPattern.test(`${cleaned.startupIdea} ${cleaned.solution}`),
    marketType,
    pricingSignalStrong: pricingPattern.test(`${cleaned.businessModel} ${cleaned.solution}`)
  };
}
