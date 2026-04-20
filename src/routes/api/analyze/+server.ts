import { analyzeIdeaPipeline } from '$lib/server/analysisPipeline';
import { ideaInputSchema, ideaInputSchemaRelaxed } from '$lib/server/validation/inputSchema';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ZodError } from 'zod';

function firstValidationMessage(flattened: { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> }): string {
  const fromForm = flattened.formErrors?.find(Boolean);
  if (fromForm) return fromForm;
  for (const key of Object.keys(flattened.fieldErrors)) {
    const msg = flattened.fieldErrors[key as keyof typeof flattened.fieldErrors]?.find(Boolean);
    if (msg) return msg;
  }
  return 'Validation failed';
}

function fieldErrorMap(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (path && !errors[path]) errors[path] = issue.message;
  }

  const flattened = error.flatten().fieldErrors;
  for (const [key, messages] of Object.entries(flattened)) {
    const message = messages?.find(Boolean);
    if (message && !errors[key]) errors[key] = message;
  }

  return errors;
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const payload = await request.json();
    const parser = payload?.fromImproveRerun ? ideaInputSchemaRelaxed : ideaInputSchema;
    const parsed = parser.safeParse(payload);

    if (!parsed.success) {
      const details = parsed.error.flatten();
      return json(
        {
          error: 'Validation failed',
          message: firstValidationMessage(details),
          details,
          fieldErrors: fieldErrorMap(parsed.error)
        },
        { status: 400 }
      );
    }

    const platformEnv = (platform as { env?: Record<string, string | undefined> } | undefined)?.env;

    const report = await analyzeIdeaPipeline(parsed.data, {
      OPENAI_API_KEY: platformEnv?.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
      OPENAI_MODEL: platformEnv?.OPENAI_MODEL ?? process.env.OPENAI_MODEL,
      GOOGLE_API_KEY: platformEnv?.GOOGLE_API_KEY ?? process.env.GOOGLE_API_KEY,
      GOOGLE_MODEL: platformEnv?.GOOGLE_MODEL ?? process.env.GOOGLE_MODEL
    });

    return json(report, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return json(
      {
        error: 'Analysis failed',
        message
      },
      { status: 500 }
    );
  }
};
