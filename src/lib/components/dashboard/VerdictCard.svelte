<script lang="ts">
  export let verdict: string;
  export let verdictLabel = '';
  export let portfolioAngle = '';
  export let score = 0;
  export let mode: 'normal' | 'brutal' = 'normal';

  $: tone = score >= 7 ? 'good' : score >= 5 ? 'caution' : 'risk';
  $: nextStepLabel = mode === 'brutal' ? 'Fix this first' : 'Best next step';
  $: chipLabel = mode === 'brutal' ? 'Brutal Verdict' : 'Final Result';
</script>

<section class={`panel verdict ${tone}`}>
  <div class="row">
    <span class="chip">{chipLabel}</span>
    <span class="score-badge">{score.toFixed(1)}/10</span>
  </div>
  {#if verdictLabel}
    <p class="label">{verdictLabel}</p>
  {/if}
  <h3>{verdict}</h3>
  <p class="muted"><strong>{nextStepLabel}:</strong> {portfolioAngle}</p>
</section>

<style>
  .verdict {
    padding: 1.1rem 1.2rem;
    display: grid;
    gap: 0.7rem;
    border-left: 7px solid #245277;
    position: relative;
    overflow: hidden;
  }

  .verdict::after {
    content: '';
    position: absolute;
    right: -2.8rem;
    top: -2.5rem;
    width: 8.5rem;
    height: 8.5rem;
    border-radius: 50%;
    background: radial-gradient(circle, #7dd4c742 0%, transparent 70%);
    pointer-events: none;
  }

  .verdict.good {
    border-left-color: #166534;
  }

  .verdict.caution {
    border-left-color: #a84f09;
  }

  .verdict.risk {
    border-left-color: #a11f2d;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h3 {
    font-size: 1.3rem;
  }

  .label {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #3c5f7e;
  }
</style>
