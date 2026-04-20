<script lang="ts">
  import type { DimensionScores } from '$lib/types/analysis';

  export let scores: DimensionScores;

  const labels: Record<keyof DimensionScores, string> = {
    problemClarity: 'Problem Clarity',
    customerPain: 'Customer Pain',
    differentiation: 'Differentiation',
    feasibility: 'Feasibility',
    monetization: 'Monetization',
    goToMarket: 'Go-To-Market',
    defensibility: 'Defensibility',
    scalability: 'Scalability'
  };

  function colorFor(score: number): string {
    if (score >= 7) return '#15803d';
    if (score >= 5.5) return '#a16207';
    return '#b91c1c';
  }

  $: rows = (Object.keys(scores) as Array<keyof DimensionScores>).map((key) => ({
    key,
    label: labels[key],
    score: scores[key]
  }));
</script>

<section class="panel-solid heatmap">
  <h3>Rubric Score Heatmap</h3>
  <div class="rows">
    {#each rows as row, i}
      <div class="row">
        <span>{row.label}</span>
        <div class="bar-wrap">
          <div
            class="bar"
            style={`--delay:${i * 70}ms; width:${Math.max(8, row.score * 10)}%; background:${colorFor(row.score)}`}
          ></div>
        </div>
        <b>{row.score.toFixed(1)}</b>
      </div>
    {/each}
  </div>
</section>

<style>
  .heatmap {
    padding: 1.05rem;
    position: relative;
    overflow: hidden;
  }

  .heatmap::before {
    content: '';
    position: absolute;
    left: -2rem;
    top: -2rem;
    width: 7rem;
    height: 7rem;
    border-radius: 50%;
    background: radial-gradient(circle, #8aceca40 0%, transparent 72%);
    pointer-events: none;
  }

  h3 {
    margin-bottom: 0.8rem;
  }

  .rows {
    display: grid;
    gap: 0.5rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1.2fr 1fr auto;
    align-items: center;
    gap: 0.65rem;
    font-size: 0.9rem;
  }

  .bar-wrap {
    background: #e7edf4;
    border-radius: 999px;
    overflow: hidden;
    height: 0.58rem;
  }

  .bar {
    height: 100%;
    border-radius: 999px;
    animation: grow 0.65s ease both;
    animation-delay: var(--delay);
    transform-origin: left center;
  }

  b {
    min-width: 2.5rem;
    text-align: right;
  }

  @media (max-width: 680px) {
    .row {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }
    b {
      text-align: left;
    }
  }

  @keyframes grow {
    from {
      transform: scaleX(0.3);
      opacity: 0.35;
    }
    to {
      transform: scaleX(1);
      opacity: 1;
    }
  }
</style>
