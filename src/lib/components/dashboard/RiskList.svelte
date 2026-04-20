<script lang="ts">
  export let title: string;
  export let items: string[] = [];
  export let tone: 'neutral' | 'danger' | 'success' = 'neutral';

  $: accent = tone === 'danger' ? '#a11f2d' : tone === 'success' ? '#166534' : '#245277';

  function parseEvidence(value: string): { tag: string | null; text: string } {
    const match = value.match(/^\[(model-estimate|inferred|rule-based)\]\s*/i);
    if (!match) return { tag: null, text: value };
    return { tag: match[1].toLowerCase(), text: value.replace(match[0], '').trim() };
  }
</script>

<section class="panel-solid list" style={`--accent:${accent}`}>
  <h3>{title}</h3>
  {#if items.length}
    <ul>
      {#each items as item}
        {@const parsed = parseEvidence(item)}
        <li>
          {#if parsed.tag}<small class="evidence">{parsed.tag}</small>{/if}
          <span>{parsed.text}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">No items generated.</p>
  {/if}
</section>

<style>
  .list {
    padding: 1rem;
    border-top: 4px solid var(--accent);
    position: relative;
    overflow: hidden;
  }

  .list::after {
    content: '';
    position: absolute;
    right: -1.8rem;
    bottom: -2rem;
    width: 6.5rem;
    height: 6.5rem;
    background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
    opacity: 0.16;
    border-radius: 50%;
    pointer-events: none;
  }

  h3 {
    font-size: 1rem;
    margin-bottom: 0.6rem;
  }

  ul {
    margin: 0;
    padding: 0 0 0 1rem;
    display: grid;
    gap: 0.45rem;
  }

  li {
    color: #1f2f45;
    position: relative;
    padding-left: 0.12rem;
  }

  li span {
    position: relative;
    z-index: 1;
  }

  .evidence {
    display: inline-flex;
    margin-right: 0.35rem;
    margin-bottom: 0.16rem;
    padding: 0.14rem 0.38rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #36587b;
    background: #edf4fb;
    border: 1px solid #c8d9e8;
  }
</style>
