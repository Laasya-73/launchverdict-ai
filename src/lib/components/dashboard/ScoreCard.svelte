<script lang="ts">
  export let label: string;
  export let score: number | string;
  export let hint = '';

  $: scoreValue = typeof score === 'number' ? score : Number.NaN;
  $: tone =
    Number.isNaN(scoreValue) ? '#4a6079' : scoreValue >= 7 ? '#166534' : scoreValue >= 5 ? '#9a5b0a' : '#a11f2d';
  $: toneSoft =
    Number.isNaN(scoreValue) ? '#d9e4f2' : scoreValue >= 7 ? '#d9f3e4' : scoreValue >= 5 ? '#f8ead2' : '#f7dce0';
</script>

<article class="panel-solid card" style={`--tone:${tone}; --tone-soft:${toneSoft}`}>
  <div class="accent"></div>
  <p class="label">{label}</p>
  <p class="value" style={`color:${tone}`}>{typeof score === 'number' ? `${score.toFixed(1)}/10` : score}</p>
  {#if typeof score === 'number'}
    <div class="meter" aria-hidden="true">
      <span style={`width:${Math.max(10, score * 10)}%; background:${tone}`}></span>
    </div>
  {/if}
  {#if hint}
    <p class="hint">{hint}</p>
  {/if}
</article>

<style>
  .card {
    padding: 1rem;
    min-height: 7.2rem;
    display: grid;
    align-content: start;
    gap: 0.35rem;
    position: relative;
    overflow: hidden;
    background: linear-gradient(155deg, #ffffff, var(--tone-soft));
  }

  .accent {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, var(--tone), #ffffff40 70%);
  }

  .card::after {
    content: '';
    position: absolute;
    right: -2.2rem;
    top: -2.2rem;
    width: 6.5rem;
    height: 6.5rem;
    border-radius: 50%;
    background: radial-gradient(circle, var(--tone) 0%, transparent 70%);
    opacity: 0.12;
    pointer-events: none;
  }

  .label {
    font-size: 0.84rem;
    color: #4b5f78;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .value {
    font-family: 'Sora', sans-serif;
    font-size: 1.8rem;
    font-weight: 800;
    line-height: 1;
  }

  .hint {
    color: #4b5f78;
    font-size: 0.85rem;
  }

  .meter {
    margin-top: 0.1rem;
    height: 0.5rem;
    border-radius: 999px;
    background: #e7eef6;
    overflow: hidden;
  }

  .meter span {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width 0.6s ease;
  }
</style>
