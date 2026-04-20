<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import type { CompareIdeasInput, IdeaInput } from '$lib/types/analysis';

  type FieldKey =
    | 'startupIdea'
    | 'targetUsers'
    | 'painPoint'
    | 'solution'
    | 'businessModel'
    | 'competitors'
    | 'whyNow'
    | 'marketCategory';
  type Side = 'ideaA' | 'ideaB';

  type FieldConfig = {
    key: FieldKey;
    label: string;
    placeholderA: string;
    placeholderB: string;
    optional?: boolean;
    hint?: string;
  };

  export let loading = false;
  export let serverError = '';
  export let fieldErrors: Record<string, string> = {};

  const dispatch = createEventDispatcher<{ submit: CompareIdeasInput }>();
  const vaguePattern =
    /\b(ai assistant|automation tool|assistant app|ai app|tool for everyone|solution for everyone|automation platform)\b/i;

  const blankIdea = (): IdeaInput => ({
    startupIdea: '',
    targetUsers: '',
    painPoint: '',
    solution: '',
    businessModel: '',
    competitors: '',
    whyNow: '',
    marketCategory: '',
    critiqueMode: 'normal'
  });

  let form: CompareIdeasInput = {
    ideaA: blankIdea(),
    ideaB: blankIdea(),
    critiqueMode: 'normal'
  };

  const fieldMessages: Record<FieldKey, string> = {
    startupIdea: 'Startup idea should be more descriptive (at least 1-2 sentences).',
    targetUsers: 'Please describe target users clearly (at least 1-2 sentences).',
    painPoint: 'Please explain the pain point clearly (at least 1-2 sentences).',
    solution: 'Please describe your solution clearly (at least 1-2 sentences).',
    businessModel: 'Please explain how this idea makes money (at least 1-2 sentences).',
    competitors: '',
    whyNow: 'Please explain why this idea is relevant now (at least 1-2 sentences).',
    marketCategory: ''
  };

  const minWordsByField: Partial<Record<FieldKey, number>> = {
    startupIdea: 10,
    targetUsers: 10,
    painPoint: 10,
    solution: 12,
    businessModel: 10,
    whyNow: 10
  };

  let localFieldErrors: Record<string, string> = {};

  const fields: Record<FieldKey, FieldConfig> = {
    startupIdea: {
      key: 'startupIdea',
      label: 'Startup Idea',
      placeholderA: 'AI tutor for high school math that adapts lessons per student',
      placeholderB: 'AI recruiter assistant for SMB teams that automates shortlisting and outreach'
    },
    targetUsers: {
      key: 'targetUsers',
      label: 'Target Users',
      placeholderA: 'Parents and students preparing for competitive math exams',
      placeholderB: 'Recruiters and hiring managers at growing SMBs'
    },
    painPoint: {
      key: 'painPoint',
      label: 'Pain Point',
      placeholderA: 'What costly or time-consuming problem exists today? (quantify if possible)',
      placeholderB: 'What costly or time-consuming problem exists today? (quantify if possible)'
    },
    solution: {
      key: 'solution',
      label: 'How exactly does your product solve the problem? (Be specific)',
      placeholderA: 'Adaptive lesson plans, weak-topic diagnosis, and score-improvement tracking for each student',
      placeholderB: 'Automated resume screening, role-fit scoring, and outreach sequencing with recruiter approval',
      hint: 'Recommended: 1-3 sentences for best results.'
    },
    businessModel: {
      key: 'businessModel',
      label: 'Business Model',
      placeholderA: 'How do you make money? (subscription, one-time, usage-based, etc.)',
      placeholderB: 'How do you make money? (subscription, one-time, usage-based, etc.)'
    },
    competitors: {
      key: 'competitors',
      label: 'Competitors',
      placeholderA: 'Khan Academy, Quizlet, private tutors (optional)',
      placeholderB: 'Ashby, Greenhouse, Lever (optional)',
      optional: true
    },
    whyNow: {
      key: 'whyNow',
      label: 'Why Now',
      placeholderA: 'Why is this idea relevant NOW? (AI trends, regulation, market shift)',
      placeholderB: 'Why is this idea relevant NOW? (AI trends, regulation, market shift)'
    },
    marketCategory: {
      key: 'marketCategory',
      label: 'Market / Category',
      placeholderA: 'Optional: EdTech, student test prep, tutoring automation',
      placeholderB: 'Optional: HR tech, recruiting automation, talent operations',
      optional: true
    }
  };

  const sections: Array<{ title: string; keys: FieldKey[] }> = [
    { title: 'Core Idea', keys: ['startupIdea', 'targetUsers'] },
    { title: 'Problem & Solution', keys: ['painPoint', 'solution'] },
    { title: 'Business & Context', keys: ['businessModel', 'competitors', 'whyNow', 'marketCategory'] }
  ];

  const loadingMessages = [
    'Evaluating Idea A and Idea B...',
    'Comparing differentiation and monetization...',
    'Forcing winner selection with confidence...',
    'Building the decision report...'
  ];

  let loadingMessageIndex = 0;
  let loadingTimer: ReturnType<typeof setInterval> | null = null;

  $: {
    if (loading && !loadingTimer) {
      loadingTimer = setInterval(() => {
        loadingMessageIndex = (loadingMessageIndex + 1) % loadingMessages.length;
      }, 1300);
    }

    if (!loading && loadingTimer) {
      clearInterval(loadingTimer);
      loadingTimer = null;
      loadingMessageIndex = 0;
    }
  }

  onDestroy(() => {
    if (loadingTimer) clearInterval(loadingTimer);
  });

  function getField(key: FieldKey): FieldConfig {
    return fields[key];
  }

  function applyValidity(event: Event, key: FieldKey, side: Side) {
    const target = event.currentTarget as HTMLTextAreaElement;
    if (target.validity.valueMissing) {
      const prefix = side === 'ideaA' ? 'Idea A' : 'Idea B';
      target.setCustomValidity(`${prefix}: ${fieldMessages[key] || 'Please provide more detail before continuing.'}`);
      return;
    }
    target.setCustomValidity('');
  }

  function clearValidity(event: Event) {
    const target = event.currentTarget as HTMLTextAreaElement;
    target.setCustomValidity('');
  }

  function countWords(value: string): number {
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function fieldPath(side: Side, key: FieldKey): string {
    return `${side}.${key}`;
  }

  function validateField(side: Side, key: FieldKey, value: string): string {
    const trimmed = value.trim();
    const isOptional = Boolean(fields[key].optional);

    if (!trimmed && isOptional) return '';
    if (!trimmed) return `${side === 'ideaA' ? 'Idea A' : 'Idea B'}: ${fieldMessages[key]}`;

    const minWords = minWordsByField[key];
    if (minWords && countWords(trimmed) < minWords) {
      if (key === 'painPoint') return `${side === 'ideaA' ? 'Idea A' : 'Idea B'}: Please describe the pain point in at least 1 sentence.`;
      if (key === 'solution') return `${side === 'ideaA' ? 'Idea A' : 'Idea B'}: Solution should explain workflow and outcome (at least 12 words).`;
      if (key === 'whyNow') return `${side === 'ideaA' ? 'Idea A' : 'Idea B'}: Why now should mention timing, trend, or market shift.`;
      return `${side === 'ideaA' ? 'Idea A' : 'Idea B'}: ${fields[key].label} needs more detail (at least ${minWords} words).`;
    }

    if (!isOptional && vaguePattern.test(trimmed)) {
      return `${side === 'ideaA' ? 'Idea A' : 'Idea B'}: Please be more specific in ${fields[key].label.toLowerCase()}.`;
    }

    return '';
  }

  function validateCompareForm(): boolean {
    const nextErrors: Record<string, string> = {};
    (['ideaA', 'ideaB'] as Side[]).forEach((side) => {
      (Object.keys(fields) as FieldKey[]).forEach((key) => {
        const message = validateField(side, key, form[side][key] ?? '');
        if (message) nextErrors[fieldPath(side, key)] = message;
      });
    });
    localFieldErrors = nextErrors;
    return Object.keys(nextErrors).length === 0;
  }

  function fieldErrorFor(side: Side, key: FieldKey): string {
    const path = fieldPath(side, key);
    return localFieldErrors[path] || fieldErrors[path] || '';
  }

  function handleInput(event: Event, side: Side, key: FieldKey) {
    clearValidity(event);
    const path = fieldPath(side, key);
    if (localFieldErrors[path]) {
      const { [path]: _removed, ...rest } = localFieldErrors;
      localFieldErrors = rest;
    }
  }

  function trySampleIdeas() {
    form = {
      critiqueMode: form.critiqueMode,
      ideaA: {
        startupIdea: 'AI math tutor that personalizes prep for competitive high school exams',
        targetUsers: 'Students and parents focused on measurable test-score gains in 8-12 weeks',
        painPoint:
          'Families spend heavily on tutoring while students still struggle to retain concepts and receive inconsistent guidance.',
        solution:
          'The product generates adaptive daily lesson plans, diagnoses weak topics from practice data, and tracks progress with parent-facing reports.',
        businessModel:
          'Monthly subscription with premium exam packs, parent reports, and small-group coaching upsell options.',
        competitors: 'Khan Academy, Quizlet, private tutoring centers',
        whyNow:
          'AI tutoring quality has improved, exam pressure is increasing, and parents are actively seeking lower-cost alternatives.',
        marketCategory: 'EdTech / test prep',
        critiqueMode: form.critiqueMode
      },
      ideaB: {
        startupIdea: 'AI recruiting copilot that automates candidate screening and outreach for SMB hiring teams',
        targetUsers: 'Recruiters and hiring managers at SMBs with high-volume roles and small hiring teams',
        painPoint:
          'Recruiters waste hours manually screening resumes, writing repetitive outreach, and losing candidates due to slow response.',
        solution:
          'The tool scores candidate fit against role criteria, drafts personalized outreach, and prioritizes daily actions in one hiring workflow.',
        businessModel:
          'Per-seat SaaS with annual plans, onboarding fees, and usage-based outreach credit pricing tiers.',
        competitors: 'Ashby, Greenhouse, Lever',
        whyNow:
          'Hiring teams are leaner, response speed matters more, and AI-assisted recruiting workflows are now expected in the market.',
        marketCategory: 'HR Tech / recruiting automation',
        critiqueMode: form.critiqueMode
      }
    };
  }

  function submitCompare(event: SubmitEvent) {
    event.preventDefault();
    const formEl = event.currentTarget as HTMLFormElement;
    if (!formEl.reportValidity()) return;
    if (!validateCompareForm()) return;
    form.ideaA.critiqueMode = form.critiqueMode;
    form.ideaB.critiqueMode = form.critiqueMode;
    dispatch('submit', form);
  }
</script>

<form class="panel form-shell" on:submit={submitCompare} novalidate>
  <div class="head">
    <h2>Compare Two Ideas</h2>
    <p class="muted">Use detailed inputs (around 10+ words per field) for fair side-by-side comparison.</p>
  </div>

  <section class="mode-toggle">
    <p>Critique Tone</p>
    <div class="switch" role="tablist" aria-label="Critique mode">
      <button
        type="button"
        class:active={form.critiqueMode === 'normal'}
        on:click={() => (form.critiqueMode = 'normal')}
      >
        <strong>Normal Mode</strong>
        <small>Balanced feedback and tradeoffs.</small>
      </button>
      <button
        type="button"
        class:active={form.critiqueMode === 'brutal'}
        on:click={() => (form.critiqueMode = 'brutal')}
      >
        <strong>Brutal Honesty Mode</strong>
        <small>Direct, no-sugarcoating compare verdict.</small>
      </button>
    </div>
  </section>

  <div class="grid grid-2 compare-grid">
    <article class="idea-col">
      <h3>Idea A</h3>
      {#each sections as section}
        <section class="input-group">
          <header>{section.title}</header>
          <div class="section-fields">
            {#each section.keys as key}
              {@const field = getField(key)}
              <label class="field">
                <span>{field.label} {#if field.optional}<small>(optional)</small>{/if}</span>
                <textarea
                  bind:value={form.ideaA[field.key]}
                  rows={field.key === 'startupIdea' || field.key === 'painPoint' ? 3 : 2}
                  required={!field.optional}
                  placeholder={field.placeholderA}
                  class:error-state={Boolean(fieldErrorFor('ideaA', field.key))}
                  on:invalid={(event) => applyValidity(event, field.key, 'ideaA')}
                  on:input={(event) => handleInput(event, 'ideaA', field.key)}
                ></textarea>
                {#if fieldErrorFor('ideaA', field.key)}
                  <small class="field-error">{fieldErrorFor('ideaA', field.key)}</small>
                {/if}
                {#if field.hint}
                  <em>{field.hint}</em>
                {/if}
              </label>
            {/each}
          </div>
        </section>
      {/each}
    </article>

    <article class="idea-col">
      <h3>Idea B</h3>
      {#each sections as section}
        <section class="input-group">
          <header>{section.title}</header>
          <div class="section-fields">
            {#each section.keys as key}
              {@const field = getField(key)}
              <label class="field">
                <span>{field.label} {#if field.optional}<small>(optional)</small>{/if}</span>
                <textarea
                  bind:value={form.ideaB[field.key]}
                  rows={field.key === 'startupIdea' || field.key === 'painPoint' ? 3 : 2}
                  required={!field.optional}
                  placeholder={field.placeholderB}
                  class:error-state={Boolean(fieldErrorFor('ideaB', field.key))}
                  on:invalid={(event) => applyValidity(event, field.key, 'ideaB')}
                  on:input={(event) => handleInput(event, 'ideaB', field.key)}
                ></textarea>
                {#if fieldErrorFor('ideaB', field.key)}
                  <small class="field-error">{fieldErrorFor('ideaB', field.key)}</small>
                {/if}
                {#if field.hint}
                  <em>{field.hint}</em>
                {/if}
              </label>
            {/each}
          </div>
        </section>
      {/each}
    </article>
  </div>

  {#if serverError}
    <p class="error">{serverError}</p>
  {/if}

  <p class="output-hint">Get a forced winner, confidence score, key tradeoffs, and recommendation.</p>

  <div class="action-row">
    <button class="btn btn-secondary" type="button" on:click={trySampleIdeas} disabled={loading}>Try Sample Ideas</button>
    <button class="btn btn-primary" type="submit" disabled={loading}>
      {#if loading}Comparing ideas...{:else}Compare Ideas{/if}
    </button>
  </div>

  {#if loading}
    <p class="loading-note">
      <span class="spinner" aria-hidden="true"></span>
      {loadingMessages[loadingMessageIndex]}
    </p>
  {/if}
</form>

<style>
  .form-shell {
    margin-top: 1rem;
    padding: 1.1rem;
    display: grid;
    gap: 1rem;
  }

  .head p {
    margin-top: 0.35rem;
  }

  .mode-toggle {
    display: grid;
    gap: 0.45rem;
    padding: 0.75rem;
    border: 1px solid #e2c9b1;
    border-radius: 0.85rem;
    background: linear-gradient(140deg, #fff5ec, #fffaf2);
  }

  .mode-toggle p {
    font-size: 0.84rem;
    font-weight: 800;
    color: #825a44;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    background: #f8eadb;
    border-radius: 0.7rem;
    padding: 0.2rem;
    gap: 0.2rem;
  }

  .switch button {
    border: none;
    background: transparent;
    color: #7a5641;
    border-radius: 0.55rem;
    padding: 0.5rem 0.7rem;
    font: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    display: grid;
    gap: 0.15rem;
  }

  .switch button strong {
    font-size: 0.9rem;
  }

  .switch button small {
    font-size: 0.76rem;
    color: #8e6c57;
  }

  .switch button.active {
    background: #ffffff;
    box-shadow: 0 4px 10px #0b27411d;
  }

  .switch button:last-child.active {
    background: #6f3e2e;
    color: #fff1e7;
  }

  .switch button:last-child.active small {
    color: #ffd5bc;
  }

  .compare-grid {
    align-items: start;
  }

  .idea-col {
    border: 1px solid #e2ccb8;
    border-radius: 0.9rem;
    padding: 0.85rem;
    background: linear-gradient(180deg, #fffaf4, #fff5ec);
    display: grid;
    gap: 0.65rem;
  }

  .idea-col h3 {
    margin: 0;
    font-size: 1rem;
  }

  .input-group {
    border: 1px solid #ead7c4;
    border-radius: 0.8rem;
    background: #fffaf4de;
    padding: 0.65rem;
    display: grid;
    gap: 0.55rem;
  }

  .input-group header {
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #37597d;
  }

  .section-fields {
    display: grid;
    gap: 0.55rem;
  }

  .field {
    display: grid;
    gap: 0.4rem;
  }

  .field span {
    font-size: 0.86rem;
    font-weight: 700;
  }

  .field small {
    color: #708299;
    font-weight: 600;
  }

  .field em {
    font-style: normal;
    font-size: 0.77rem;
    color: #476481;
  }

  textarea {
    width: 100%;
    resize: vertical;
    border-radius: 0.75rem;
    border: 1px solid #ddc4ac;
    padding: 0.6rem 0.72rem;
    font: inherit;
    background: #fffaf5;
    color: #4b3528;
  }

  textarea:focus {
    outline: 2px solid #f0b88d;
    border-color: #d79a73;
  }

  textarea.error-state {
    border-color: #cc4959;
    box-shadow: 0 0 0 1px #cc495933;
  }

  .field-error {
    color: #a11f2d;
    font-size: 0.76rem;
    font-weight: 700;
    margin-top: -0.05rem;
  }

  .error {
    color: #991b1b;
    font-weight: 700;
    margin: 0;
  }

  .output-hint {
    margin: 0;
    font-size: 0.88rem;
    color: #355a7f;
    font-weight: 700;
  }

  .action-row {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .loading-note {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.88rem;
    font-weight: 700;
    color: #2a557c;
  }

  .spinner {
    width: 0.95rem;
    height: 0.95rem;
    border: 2px solid #b7d0e7;
    border-top-color: #0e7396;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  button[disabled] {
    cursor: not-allowed;
    opacity: 0.7;
  }

  @media (max-width: 720px) {
    .switch {
      grid-template-columns: 1fr;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
