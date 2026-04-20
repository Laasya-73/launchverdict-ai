# LaunchVerdict AI

LaunchVerdict AI is a SvelteKit app that evaluates startup ideas with a structured pipeline instead of a single chat prompt.

## What It Does

- Analyzes one startup idea with:
  - 5 AI reviewer lenses: `Investor`, `Customer`, `Product`, `Market`, `Execution`
  - rubric scoring (problem, differentiation, monetization, execution, defensibility, scalability, etc.)
  - strengths, weaknesses, failure risks, and improvement suggestions
  - SWOT snapshot
  - rewrite and pivot recommendations (niche, positioning, pitch, headline)
  - final verdict + confidence score
- Compares two ideas with:
  - side-by-side score matrix
  - forced winner (no tie outcome)
  - confidence band + tradeoff summary
- Supports tone modes:
  - `Normal`
  - `Brutal Honesty`
- Exports report to PDF from the dashboard view.

## Pipeline

`Input Form -> Preprocess -> Multi-Lens Critique -> Rubric Scoring -> Aggregate + Quality Gate -> Dashboard Report`

Quality gate includes:
- grammar and readability cleanup
- de-duplication and normalization
- evidence tags (`model-estimate`, `inferred`, `rule-based`)
- competitor inference disclaimer

## Current UX Notes

- Structured field-level validation messages are enabled.
- Compare mode includes `Market / Category`.

## Tech Stack

- SvelteKit + TypeScript
- Zod
- OpenAI Chat Completions API
- Google Gemini API (fallback provider)
- `html2canvas` + `jspdf` for report export

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file from example:

```bash
cp .env.example .env
```

If you are on PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Fill `.env` with your keys:

```env
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4.1-mini
GOOGLE_API_KEY=your-google-ai-studio-key
GOOGLE_MODEL=gemini-2.0-flash
```

Provider order in code:
1. OpenAI (`OPENAI_API_KEY`)
2. Google (`GOOGLE_API_KEY`) if OpenAI is missing or fails
3. Deterministic fallback evaluator (no key)

4. Run locally:

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run check
npm run test
npm run build
npm run preview
```

