<script lang="ts">
  import type { Swot } from '$lib/types/analysis';

  export let swot: Swot;

  function parseEvidence(value: string): { tag: string | null; text: string } {
    const match = value.match(/^\[(model-estimate|inferred|rule-based)\]\s*/i);
    if (!match) return { tag: null, text: value };
    return { tag: match[1].toLowerCase(), text: value.replace(match[0], '').trim() };
  }
</script>

<section class="panel-solid swot">
  <h3>SWOT Snapshot</h3>
  <div class="swot-grid">
    <article>
      <h4>Strengths</h4>
      <ul>
        {#each swot.strengths as item}
          {@const parsed = parseEvidence(item)}
          <li>{#if parsed.tag}<small class="evidence">{parsed.tag}</small>{/if}{parsed.text}</li>
        {/each}
      </ul>
    </article>
    <article>
      <h4>Weaknesses</h4>
      <ul>
        {#each swot.weaknesses as item}
          {@const parsed = parseEvidence(item)}
          <li>{#if parsed.tag}<small class="evidence">{parsed.tag}</small>{/if}{parsed.text}</li>
        {/each}
      </ul>
    </article>
    <article>
      <h4>Opportunities</h4>
      <ul>
        {#each swot.opportunities as item}
          {@const parsed = parseEvidence(item)}
          <li>{#if parsed.tag}<small class="evidence">{parsed.tag}</small>{/if}{parsed.text}</li>
        {/each}
      </ul>
    </article>
    <article>
      <h4>Threats</h4>
      <ul>
        {#each swot.threats as item}
          {@const parsed = parseEvidence(item)}
          <li>{#if parsed.tag}<small class="evidence">{parsed.tag}</small>{/if}{parsed.text}</li>
        {/each}
      </ul>
    </article>
  </div>
</section>

<style>
  .swot {
    padding: 1.05rem;
  }

  h3 {
    margin-bottom: 0.75rem;
  }

  .swot-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  article {
    background: linear-gradient(165deg, #fbfdff, #f2f8ff);
    border: 1px solid #d2deea;
    border-radius: 0.75rem;
    padding: 0.72rem 0.78rem;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  article:hover {
    transform: translateY(-2px);
    border-color: #afc8dd;
  }

  h4 {
    font-size: 0.9rem;
    margin-bottom: 0.35rem;
  }

  ul {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.25rem;
    font-size: 0.87rem;
  }

  .evidence {
    display: inline-flex;
    margin-right: 0.32rem;
    margin-bottom: 0.12rem;
    padding: 0.1rem 0.32rem;
    border-radius: 999px;
    font-size: 0.63rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #36587b;
    background: #edf4fb;
    border: 1px solid #c8d9e8;
  }

  @media (max-width: 680px) {
    .swot-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
