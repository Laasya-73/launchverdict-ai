# LaunchVerdict AI

LaunchVerdict AI is an LLM-powered startup idea evaluation system built with SvelteKit.

It converts raw startup concepts into structured venture assessments using:

- multi-lens critique (`Investor`, `Customer`, `Product`, `Market`, `Execution`)
- critique tone modes (`Normal` and `Brutal Honesty`)
- rubric-based scoring across 8 startup dimensions
- rule-based score adjustments (competitor density, B2B/B2C monetization bias, generic positioning penalties)
- risk and blind-spot extraction
- pivot and repositioning suggestions
- a printable founder-style report dashboard
- side-by-side idea comparison decision engine

## Core Pipeline

`Input Form -> Idea Parser -> Multi-Agent Critique -> Weighted Scoring -> Recommendation Engine -> Dashboard Report`

## Features in V1

- Structured intake form:
  - startup idea
  - target users
  - pain point
  - solution
  - business model
  - competitors (optional)
  - why now
  - market/category (optional)
- Rubric score breakdown
- Venture score + final verdict
- Strengths / weaknesses / risks / recommendations
- SWOT snapshot
- ICP refinement + pivot + pitch rewrite mode
- Compare Two Ideas matrix with winner + tradeoffs
- Forced winner decision with confidence score
- Brutal mode that prioritizes flaws first
- "Why NOT to build this" section
- Downloadable report via browser print-to-PDF
- Schema validation + deterministic fallback analysis when no API key is present

## Tech Stack

- SvelteKit + TypeScript
- Zod validation
- OpenAI Chat Completions API (`OPENAI_API_KEY`) or Google Gemini API (`GOOGLE_API_KEY`)

## Local Run

1. Install dependencies:

```bash
npm install
```

2. Optional: add environment variables in `.env`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
GOOGLE_API_KEY=your_google_ai_studio_key_here
GOOGLE_MODEL=gemini-2.0-flash
```

Provider priority:

1. `GOOGLE_API_KEY` (Gemini)
2. `OPENAI_API_KEY` (OpenAI)
3. deterministic fallback evaluator

3. Start dev server:

```bash
npm run dev
```

If no API key is configured, the app still works using a deterministic fallback evaluator.

## Resume Angle

Built an LLM-powered startup idea evaluation platform that converts raw startup concepts into structured venture assessments using rubric-based scoring and multi-agent critique to analyze viability, differentiation, and execution risk.
