<script lang="ts">
  import { onDestroy } from 'svelte';
  import { tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import type { IdeaInput } from '$lib/types/analysis';

  type FieldKey =
    | 'startupIdea'
    | 'targetUsers'
    | 'painPoint'
    | 'solution'
    | 'businessModel'
    | 'competitors'
    | 'whyNow'
    | 'marketCategory';

  type FieldConfig = {
    key: FieldKey;
    label: string;
    placeholder: string;
    optional?: boolean;
    hint?: string;
  };

  export let loading = false;
  export let serverError = '';
  export let fieldErrors: Record<string, string> = {};
  export let prefillIdea: IdeaInput | null = null;

  const dispatch = createEventDispatcher<{ submit: IdeaInput; prefillConsumed: void }>();
  const vaguePattern =
    /\b(ai assistant|automation tool|assistant app|ai app|tool for everyone|solution for everyone|automation platform)\b/i;

  let form: IdeaInput = {
    startupIdea: '',
    targetUsers: '',
    painPoint: '',
    solution: '',
    businessModel: '',
    competitors: '',
    whyNow: '',
    marketCategory: '',
    critiqueMode: 'normal',
    fromImproveRerun: false
  };

  const loadingMessages = [
    'Evaluating problem strength...',
    'Analyzing competition and differentiation...',
    'Scoring monetization and execution risk...',
    'Preparing your venture report...'
  ];

  const fieldMessages: Record<FieldKey, string> = {
    startupIdea: 'Startup idea should be more descriptive (at least 1-2 sentences).',
    targetUsers: 'Please describe your target customers clearly (at least 1-2 sentences).',
    painPoint: 'Please explain the pain point clearly (at least 1-2 sentences).',
    solution: 'Please describe your solution clearly (at least 1-2 sentences).',
    businessModel: 'Please explain how you make money (at least 1-2 sentences).',
    competitors: '',
    whyNow: 'Please explain why now in a specific way (at least 1-2 sentences).',
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
  let appliedPrefillSignature = '';

  const fields: Record<FieldKey, FieldConfig> = {
    startupIdea: {
      key: 'startupIdea',
      label: 'Startup Idea',
      placeholder: 'e.g. AI compliance copilot for regional freight brokers managing shipment paperwork'
    },
    targetUsers: {
      key: 'targetUsers',
      label: 'Target Customers',
      placeholder: 'e.g. Freight broker operations teams with 20-200 employees handling compliance workflows'
    },
    painPoint: {
      key: 'painPoint',
      label: 'Pain Point',
      placeholder: 'What costly or time-consuming problem exists today? (quantify if possible)'
    },
    solution: {
      key: 'solution',
      label: 'How exactly does your product solve the problem? (Be specific)',
      placeholder: 'Describe the exact user workflow, action, and measurable outcome your product delivers',
      hint: 'Recommended: 1-3 sentences for best results.'
    },
    businessModel: {
      key: 'businessModel',
      label: 'Business Model',
      placeholder: 'How do you make money? (subscription, one-time, usage-based, etc.)'
    },
    competitors: {
      key: 'competitors',
      label: 'Competitors',
      placeholder: 'Optional: direct or adjacent alternatives',
      optional: true
    },
    whyNow: {
      key: 'whyNow',
      label: 'Why Now',
      placeholder: 'Why is this idea relevant NOW? (AI trends, regulation, market shift)'
    },
    marketCategory: {
      key: 'marketCategory',
      label: 'Market / Category',
      placeholder: 'Optional: vertical or category',
      optional: true
    }
  };

  const sections: Array<{ title: string; subtitle: string; keys: FieldKey[] }> = [
    {
      title: 'Core Idea',
      subtitle: 'Define the concept and exact buyer profile.',
      keys: ['startupIdea', 'targetUsers']
    },
    {
      title: 'Problem & Solution',
      subtitle: 'Show urgency and how the product resolves it.',
      keys: ['painPoint', 'solution']
    },
    {
      title: 'Business',
      subtitle: 'Explain revenue mechanics and competitive pressure.',
      keys: ['businessModel', 'competitors']
    },
    {
      title: 'Context',
      subtitle: 'Anchor timing and market context.',
      keys: ['whyNow', 'marketCategory']
    }
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

  $: if (prefillIdea) {
    const signature = JSON.stringify(prefillIdea);
    if (signature !== appliedPrefillSignature) {
      form = {
        startupIdea: prefillIdea.startupIdea ?? '',
        targetUsers: prefillIdea.targetUsers ?? '',
        painPoint: prefillIdea.painPoint ?? '',
        solution: prefillIdea.solution ?? '',
        businessModel: prefillIdea.businessModel ?? '',
        competitors: prefillIdea.competitors ?? '',
        whyNow: prefillIdea.whyNow ?? '',
        marketCategory: prefillIdea.marketCategory ?? '',
        critiqueMode: prefillIdea.critiqueMode ?? form.critiqueMode,
        fromImproveRerun: prefillIdea.fromImproveRerun ?? false
      };
      localFieldErrors = {};
      appliedPrefillSignature = signature;
      dispatch('prefillConsumed');
    }
  }

  onDestroy(() => {
    if (loadingTimer) clearInterval(loadingTimer);
  });

  function applyValidity(event: Event, key: FieldKey) {
    const target = event.currentTarget as HTMLTextAreaElement;
    if (target.validity.valueMissing) {
      target.setCustomValidity(fieldMessages[key] || 'Please provide more detail before continuing.');
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

  function validateField(key: FieldKey, value: string): string {
    const trimmed = value.trim();
    const isOptional = Boolean(fields[key].optional);

    if (!trimmed && isOptional) return '';
    if (!trimmed) return fieldMessages[key] || 'Please provide more detail before continuing.';

    const minWords = minWordsByField[key];
    if (!form.fromImproveRerun && minWords && countWords(trimmed) < minWords) {
      if (key === 'painPoint') return 'Please describe the pain point in at least 1 sentence.';
      if (key === 'solution') return 'Solution should explain workflow and outcome (at least 12 words).';
      if (key === 'whyNow') return 'Why now should mention timing, trend, or market shift.';
      return `${fields[key].label} needs more detail (at least ${minWords} words).`;
    }

    if (!isOptional && vaguePattern.test(trimmed)) {
      return `Please be more specific in ${fields[key].label.toLowerCase()}.`;
    }

    return '';
  }

  function validateForm(): boolean {
    const nextErrors: Record<string, string> = {};
    (Object.keys(fields) as FieldKey[]).forEach((key) => {
      const message = validateField(key, form[key] ?? '');
      if (message) nextErrors[key] = message;
    });
    localFieldErrors = nextErrors;
    return Object.keys(nextErrors).length === 0;
  }

  function fieldErrorFor(key: FieldKey): string {
    return localFieldErrors[key] || fieldErrors[key] || '';
  }

  function handleInput(event: Event, key: FieldKey) {
    clearValidity(event);
    if (localFieldErrors[key]) {
      const { [key]: _removed, ...rest } = localFieldErrors;
      localFieldErrors = rest;
    }
  }

  function getField(key: FieldKey): FieldConfig {
    return fields[key];
  }

  function trySampleIdea() {
    form = {
      startupIdea: 'AI compliance copilot that auto-validates shipment documentation for regional freight brokers',
      targetUsers: 'Freight brokerage operations teams with 20-200 employees managing shipment and audit workflows',
      painPoint:
        'Operations staff lose multiple hours each day checking regulation updates and manually fixing documentation errors that trigger delays and penalties.',
      solution:
        'The product ingests shipment data, flags missing compliance items, and auto-generates ready-to-submit documents with an audit trail in one workflow.',
      businessModel:
        'Usage-based SaaS priced per active shipment plus a platform subscription for compliance analytics and export reporting.',
      competitors: 'Descartes, project44, internal spreadsheet workflows',
      whyNow:
        'Regulatory requirements are tightening, AI extraction quality is now reliable, and logistics teams are under pressure to cut operational overhead.',
      marketCategory: 'Logistics compliance automation',
      critiqueMode: form.critiqueMode,
      fromImproveRerun: false
    };
  }

  async function submitForm(event: SubmitEvent) {
    event.preventDefault();
    const formEl = event.currentTarget as HTMLFormElement;
    if (!formEl.reportValidity()) return;
    if (!validateForm()) {
      await tick();
      const firstErrorField = formEl.querySelector('textarea.error-state') as HTMLTextAreaElement | null;
      firstErrorField?.focus();
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    dispatch('submit', form);
  }
</script>

<form class="panel form-shell" on:submit={submitForm} novalidate>
  <div class="head">
    <h2>Idea Intake</h2>
    <p class="muted">Use specific detail in each field (around 10+ words) for reliable scoring.</p>
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
        <small>Balanced feedback with strengths and risks.</small>
      </button>
      <button
        type="button"
        class:active={form.critiqueMode === 'brutal'}
        on:click={() => (form.critiqueMode = 'brutal')}
      >
        <strong>Brutal Honesty Mode</strong>
        <small>Get direct, no-sugarcoating feedback.</small>
      </button>
    </div>
  </section>

  {#each sections as section}
    <section class="input-group">
      <header>
        <h3>{section.title}</h3>
        <p>{section.subtitle}</p>
      </header>
      <div class="grid grid-2 group-grid">
        {#each section.keys as key}
          {@const field = getField(key)}
          <label class="field">
            <span>{field.label} {#if field.optional}<small>(optional)</small>{/if}</span>
            <textarea
              bind:value={form[field.key]}
              rows={field.key === 'startupIdea' || field.key === 'painPoint' ? 3 : 2}
              required={!field.optional}
              placeholder={field.placeholder}
              class:error-state={Boolean(fieldErrorFor(field.key))}
              on:invalid={(event) => applyValidity(event, field.key)}
              on:input={(event) => handleInput(event, field.key)}
            ></textarea>
            {#if fieldErrorFor(field.key)}
              <small class="field-error">{fieldErrorFor(field.key)}</small>
            {/if}
            {#if field.hint}
              <em>{field.hint}</em>
            {/if}
          </label>
        {/each}
      </div>
    </section>
  {/each}

  {#if serverError}
    <p class="error">{serverError}</p>
  {/if}

  <p class="output-hint">Get a venture score, key risks, and improvement suggestions.</p>

  <div class="action-row">
    <button class="btn btn-secondary" type="button" on:click={trySampleIdea} disabled={loading}>Try Sample Idea</button>
    <button class="btn btn-primary" type="submit" disabled={loading}>
      {#if loading}Analyzing your idea...{:else}Analyze Idea{/if}
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

  .input-group {
    border: 1px solid #c9d9e8;
    border-radius: 0.9rem;
    padding: 0.85rem;
    display: grid;
    gap: 0.72rem;
    background: linear-gradient(170deg, #fbfdff, #f5faff);
  }

  .input-group header h3 {
    font-size: 0.98rem;
    margin: 0;
  }

  .input-group header p {
    margin: 0.2rem 0 0;
    font-size: 0.83rem;
    color: #486683;
  }

  .group-grid {
    align-items: start;
  }

  .field {
    display: grid;
    gap: 0.45rem;
  }

  .field span {
    font-size: 0.9rem;
    font-weight: 700;
  }

  .field small {
    color: #708299;
    font-weight: 600;
  }

  .field em {
    font-style: normal;
    font-size: 0.78rem;
    color: #496681;
  }

  textarea {
    width: 100%;
    resize: vertical;
    border-radius: 0.75rem;
    border: 1px solid #ddc4ac;
    padding: 0.65rem 0.75rem;
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
