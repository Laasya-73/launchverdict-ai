import type { CriticLens, CritiqueMode, LensAssessment, ParsedIdea } from '$lib/types/analysis';
import { buildLensSystemPrompt, buildLensUserPrompt } from './prompts';

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function parseJsonPayload(raw: string, providerName: string, lens: CriticLens): LensAssessment {
  const trimmed = raw.trim();
  const withoutCodeFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutCodeFence) as LensAssessment;
  } catch {
    throw new Error(`${providerName} returned non-JSON content for ${lens} lens.`);
  }
}

export async function requestLensFromOpenAI(
  lens: CriticLens,
  idea: ParsedIdea,
  mode: CritiqueMode,
  apiKey: string,
  model: string
): Promise<LensAssessment> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildLensSystemPrompt(lens, mode) },
        { role: 'user', content: buildLensUserPrompt(lens, idea, mode) }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${err}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const raw = data.choices?.[0]?.message?.content;

  if (!raw) {
    throw new Error(`OpenAI returned an empty response for ${lens} lens.`);
  }

  return parseJsonPayload(raw, 'OpenAI', lens);
}

export async function requestLensFromGemini(
  lens: CriticLens,
  idea: ParsedIdea,
  mode: CritiqueMode,
  apiKey: string,
  model: string
): Promise<LensAssessment> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildLensSystemPrompt(lens, mode) }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildLensUserPrompt(lens, idea, mode) }]
        }
      ],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${err}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();

  if (!raw) {
    throw new Error(`Gemini returned an empty response for ${lens} lens.`);
  }

  return parseJsonPayload(raw, 'Gemini', lens);
}
