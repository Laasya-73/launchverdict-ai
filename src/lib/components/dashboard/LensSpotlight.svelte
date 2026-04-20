<script lang="ts">
  import type { LensAssessment } from '$lib/types/analysis';

  export let lenses: LensAssessment[] = [];

  function avgScore(lens: LensAssessment): number {
    const values = Object.values(lens.dimensionScores);
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round((total / values.length) * 10) / 10;
  }

  function tone(score: number): string {
    if (score >= 7) return 'good';
    if (score >= 5) return 'mid';
    return 'bad';
  }

  function parseEvidence(value: string): { tag: string | null; text: string } {
    const match = value.match(/^\[(model-estimate|inferred|rule-based)\]\s*/i);
    if (!match) return { tag: null, text: value };
    return { tag: match[1].toLowerCase(), text: value.replace(match[0], '').trim() };
  }
</script>

<section class="panel-solid lens-zone">
  <p class="section-eyebrow">AI Reviews</p>
  <h3>What Each Reviewer Said</h3>
  <div class="track">
    {#each lenses as lens}
      {@const score = avgScore(lens)}
      {@const summary = parseEvidence(lens.summary)}
      {@const verdict = parseEvidence(lens.verdict)}
      <article class={`lens ${tone(score)}`}>
        <header>
          <span class="name">{lens.lens}</span>
          <strong>{score.toFixed(1)}</strong>
        </header>
        <p class="summary">
          {#if summary.tag}<small class="evidence">{summary.tag}</small>{/if}
          {summary.text}
        </p>
        <p class="verdict">
          {#if verdict.tag}<small class="evidence">{verdict.tag}</small>{/if}
          {verdict.text}
        </p>
      </article>
    {/each}
  </div>
</section>

<style>
  .lens-zone {
    padding: 1rem;
  }

  h3 {
    margin-top: 0.2rem;
    margin-bottom: 0.7rem;
  }

  .track {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 0.72rem;
  }

  .lens {
    border-radius: 0.85rem;
    border: 1px solid #c5d9ea;
    padding: 0.7rem 0.72rem;
    background: linear-gradient(160deg, #f7fcff, #eef6ff);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    min-height: 9rem;
  }

  .lens.good {
    border-color: #a8dbc5;
    background: linear-gradient(160deg, #e9fff5, #f4fffb);
  }

  .lens.mid {
    border-color: #ead8b5;
    background: linear-gradient(160deg, #fff8e9, #fffdf4);
  }

  .lens.bad {
    border-color: #efc6ca;
    background: linear-gradient(160deg, #fff2f4, #fff9fa);
  }

  .lens:hover {
    transform: translateY(-3px);
    box-shadow: 0 11px 24px #0e2a4217;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.45rem;
    margin-bottom: 0.45rem;
  }

  .name {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #2a5379;
    font-weight: 800;
  }

  strong {
    font-family: 'Sora', sans-serif;
    font-size: 1.03rem;
    color: #173c61;
  }

  .summary {
    margin: 0;
    color: #294a6e;
    font-size: 0.88rem;
    line-height: 1.35;
  }

  .verdict {
    margin-top: 0.52rem;
    padding-top: 0.45rem;
    border-top: 1px dashed #bfd3e6;
    font-size: 0.84rem;
    color: #173c61;
    font-weight: 700;
  }

  .evidence {
    display: inline-flex;
    margin-right: 0.35rem;
    margin-bottom: 0.16rem;
    padding: 0.12rem 0.34rem;
    border-radius: 999px;
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #36587b;
    background: #edf4fb;
    border: 1px solid #c8d9e8;
  }
</style>
