<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import CompareIdeasForm from '$lib/components/forms/CompareIdeasForm.svelte';
  import IdeaForm from '$lib/components/forms/IdeaForm.svelte';
  import { intakePrefill, latestCompareReport, latestReport } from '$lib/stores/analysis';
  import type { CompareIdeasInput, CompareIdeasReport, IdeaInput, VentureReport } from '$lib/types/analysis';

  let mode: 'single' | 'compare' = 'single';
  let loadingSingle = false;
  let loadingCompare = false;
  let errorSingle = '';
  let errorCompare = '';
  let singleFieldErrors: Record<string, string> = {};
  let compareFieldErrors: Record<string, string> = {};

  onMount(() => {
    if (!browser || $intakePrefill) return;
    const raw = sessionStorage.getItem('lv:intake-prefill');
    if (!raw) return;
    try {
      intakePrefill.set(JSON.parse(raw) as IdeaInput);
    } catch {
      sessionStorage.removeItem('lv:intake-prefill');
    }
  });

  function handlePrefillConsumed() {
    intakePrefill.set(null);
    if (browser) {
      sessionStorage.removeItem('lv:intake-prefill');
    }
  }

  async function analyzeIdea(event: CustomEvent<IdeaInput>) {
    loadingSingle = true;
    errorSingle = '';
    singleFieldErrors = {};

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event.detail)
      });

      const payload = await response.json();

      if (!response.ok) {
        errorSingle = payload?.message || payload?.error || 'Unable to analyze idea right now.';
        singleFieldErrors = payload?.fieldErrors ?? {};
        return;
      }

      latestReport.set(payload as VentureReport);
      await goto('/result');
    } catch {
      errorSingle = 'Network error while analyzing. Please try again.';
    } finally {
      loadingSingle = false;
    }
  }

  async function compareIdeas(event: CustomEvent<CompareIdeasInput>) {
    loadingCompare = true;
    errorCompare = '';
    compareFieldErrors = {};

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event.detail)
      });

      const payload = await response.json();

      if (!response.ok) {
        errorCompare = payload?.message || payload?.error || 'Unable to compare ideas right now.';
        compareFieldErrors = payload?.fieldErrors ?? {};
        return;
      }

      latestCompareReport.set(payload as CompareIdeasReport);
      await goto('/compare');
    } catch {
      errorCompare = 'Network error while comparing ideas. Please try again.';
    } finally {
      loadingCompare = false;
    }
  }
</script>

<main class="page-shell">
  <section class="hero">
    <span class="chip">LaunchVerdict AI</span>
    <h1>AI Startup Idea Critic and Validator</h1>
    <p>
      Enter your startup idea and get simple feedback: scores, risks, blind spots, and clear ways to improve.
    </p>
  </section>

  <section class="hero-strip no-print">
    <span>5 review perspectives</span>
    <span>Clear scoring</span>
    <span>Brutal honesty mode</span>
    <span>Compare two ideas</span>
    <span>Rewrite + pivot suggestions</span>
  </section>

  <section class="mode-tabs panel no-print">
    <button class:active={mode === 'single'} on:click={() => (mode = 'single')}>Analyze One Idea</button>
    <button class:active={mode === 'compare'} on:click={() => (mode = 'compare')}>Compare Two Ideas</button>
  </section>

  {#if mode === 'single'}
    <IdeaForm
      loading={loadingSingle}
      serverError={errorSingle}
      fieldErrors={singleFieldErrors}
      prefillIdea={$intakePrefill}
      on:prefillConsumed={handlePrefillConsumed}
      on:submit={analyzeIdea}
    />
  {:else}
    <CompareIdeasForm
      loading={loadingCompare}
      serverError={errorCompare}
      fieldErrors={compareFieldErrors}
      on:submit={compareIdeas}
    />
  {/if}

  <section class="panel feature-list">
    <h2>How It Works</h2>
    <p class="muted">Fill the form -> AI reviews your idea -> you get scores, risks, and better positioning</p>
  </section>
</main>

<style>
  .hero-strip {
    margin-top: 0.9rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .hero-strip span {
    display: inline-flex;
    padding: 0.4rem 0.68rem;
    border-radius: 999px;
    border: 1px solid #e4c8ad;
    background: linear-gradient(135deg, #fff2e5, #fff8ef);
    color: #785742;
    font-weight: 700;
    font-size: 0.83rem;
  }

  .mode-tabs {
    margin-top: 1rem;
    padding: 0.4rem;
    display: inline-flex;
    gap: 0.3rem;
  }

  .mode-tabs button {
    border: none;
    background: transparent;
    border-radius: 0.7rem;
    padding: 0.55rem 0.85rem;
    font: inherit;
    font-weight: 800;
    color: #6f5544;
    cursor: pointer;
  }

  .mode-tabs button.active {
    background: linear-gradient(120deg, #e89d74, #f4c68f);
    color: #5b3a2a;
    box-shadow: 0 7px 16px #b17d5e66;
  }

  .feature-list {
    margin-top: 1rem;
    padding: 1rem 1.1rem;
  }

  .feature-list p {
    margin-top: 0.35rem;
  }
</style>
