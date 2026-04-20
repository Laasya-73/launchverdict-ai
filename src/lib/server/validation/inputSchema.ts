import { z } from 'zod';

const countWords = (value: string): number =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const vaguePattern =
  /\b(ai assistant|automation tool|assistant app|ai app|tool for everyone|solution for everyone|automation platform)\b/i;

type TextFieldOptions = {
  min?: number;
  max?: number;
  minWords?: number;
  requiredMessage?: string;
  minLengthMessage?: string;
  minWordsMessage?: string;
  vagueMessage?: string;
};

const textField = (label: string, options: TextFieldOptions = {}) => {
  const min = options.min ?? 8;
  const max = options.max ?? 1200;
  const minWords = options.minWords ?? 10;

  return z
    .string({ required_error: options.requiredMessage ?? `${label} is required.` })
    .trim()
    .min(min, options.minLengthMessage ?? `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be under ${max} characters.`)
    .refine((value) => countWords(value) >= minWords, {
      message: options.minWordsMessage ?? `${label} must be at least ${minWords} words so the analysis is reliable.`
    })
    .refine((value) => !vaguePattern.test(value), {
      message: options.vagueMessage ?? `Please provide a more detailed ${label.toLowerCase()} description.`
    });
};

export const ideaInputSchema = z.object({
  startupIdea: textField('Startup idea', {
    min: 10,
    max: 1200,
    minWords: 10,
    requiredMessage: 'Startup idea is required.',
    minWordsMessage: 'Startup idea should be more descriptive (at least 10 words).',
    vagueMessage: 'Startup idea is too vague. Describe who it is for and what it does.'
  }),
  targetUsers: textField('Target users', {
    min: 6,
    max: 500,
    minWords: 10,
    requiredMessage: 'Target customers are required.',
    minWordsMessage: 'Please describe target customers clearly in at least 10 words.'
  }),
  painPoint: textField('Pain point', {
    min: 10,
    max: 900,
    minWords: 10,
    requiredMessage: 'Pain point is required.',
    minWordsMessage: 'Please describe the pain point in at least 1 clear sentence (10+ words).'
  }),
  solution: textField('Solution', {
    min: 10,
    max: 900,
    minWords: 12,
    requiredMessage: 'Solution is required.',
    minWordsMessage: 'Solution should explain workflow and outcome in at least 12 words.'
  }),
  businessModel: textField('Business model', {
    min: 6,
    max: 600,
    minWords: 10,
    requiredMessage: 'Business model is required.',
    minWordsMessage: 'Business model should explain how you make money in at least 10 words.'
  }),
  competitors: z.string().trim().max(600).optional().or(z.literal('')),
  whyNow: textField('Why now', {
    min: 10,
    max: 700,
    minWords: 10,
    requiredMessage: 'Why now is required.',
    minWordsMessage: 'Why now should mention timing, trend, or market shift (at least 10 words).'
  }),
  marketCategory: z.string().trim().max(300).optional().or(z.literal('')),
  critiqueMode: z.enum(['normal', 'brutal']).optional().default('normal'),
  fromImproveRerun: z.boolean().optional().default(false)
});

export const ideaInputSchemaRelaxed = z.object({
  startupIdea: textField('Startup idea', {
    min: 10,
    max: 1200,
    minWords: 0,
    requiredMessage: 'Startup idea is required.',
    vagueMessage: 'Startup idea is too vague. Describe who it is for and what it does.'
  }),
  targetUsers: textField('Target users', {
    min: 6,
    max: 500,
    minWords: 0,
    requiredMessage: 'Target customers are required.'
  }),
  painPoint: textField('Pain point', {
    min: 10,
    max: 900,
    minWords: 0,
    requiredMessage: 'Pain point is required.'
  }),
  solution: textField('Solution', {
    min: 10,
    max: 900,
    minWords: 0,
    requiredMessage: 'Solution is required.'
  }),
  businessModel: textField('Business model', {
    min: 6,
    max: 600,
    minWords: 0,
    requiredMessage: 'Business model is required.'
  }),
  competitors: z.string().trim().max(600).optional().or(z.literal('')),
  whyNow: textField('Why now', {
    min: 10,
    max: 700,
    minWords: 0,
    requiredMessage: 'Why now is required.'
  }),
  marketCategory: z.string().trim().max(300).optional().or(z.literal('')),
  critiqueMode: z.enum(['normal', 'brutal']).optional().default('normal'),
  fromImproveRerun: z.boolean().optional().default(false)
});

export type IdeaInputSchema = z.infer<typeof ideaInputSchema>;

export const compareIdeasInputSchema = z.object({
  ideaA: ideaInputSchema,
  ideaB: ideaInputSchema,
  critiqueMode: z.enum(['normal', 'brutal']).optional().default('normal')
});

export type CompareIdeasInputSchema = z.infer<typeof compareIdeasInputSchema>;
