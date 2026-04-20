<script lang="ts">
  export let score = 0;
  export let verdict = '';
  export let mode: 'normal' | 'brutal' = 'normal';

  $: normalized = Math.max(0, Math.min(10, score));
  $: percent = normalized * 10;
  $: tone = normalized >= 7 ? '#0f8f5f' : normalized >= 5 ? '#b77918' : '#b02a2a';
  $: radius = 49;
  $: circumference = 2 * Math.PI * radius;
  $: dashOffset = circumference * (1 - percent / 100);
</script>

<section class="panel-solid dial-card" style={`--tone:${tone}; --score:${percent}`}>
  <p class="section-eyebrow">Venture Dial</p>
  <div class="dial-wrap">
    <div class="dial" aria-label={`Overall venture score ${normalized.toFixed(1)} out of 10`}>
      <svg class="dial-svg" viewBox="0 0 120 120" role="presentation" aria-hidden="true">
        <circle class="track" cx="60" cy="60" r={radius}></circle>
        <circle
          class="progress"
          cx="60"
          cy="60"
          r={radius}
          style={`stroke:${tone}; stroke-dasharray:${circumference}; stroke-dashoffset:${dashOffset}`}
        ></circle>
      </svg>
      <div class="inner">
        <strong>{normalized.toFixed(1)}</strong>
        <span>/10</span>
      </div>
    </div>
    <div class="meta">
      <h3>{verdict}</h3>
      <p>{mode === 'brutal' ? 'Brutal honesty enabled' : 'Normal critique enabled'}</p>
      <div class="legend">
        <span><i class="good"></i>Strong</span>
        <span><i class="mid"></i>Needs work</span>
        <span><i class="bad"></i>High risk</span>
      </div>
    </div>
  </div>
</section>

<style>
  .dial-card {
    padding: 1rem;
  }

  .dial-wrap {
    margin-top: 0.55rem;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 1rem;
  }

  .dial {
    width: 8.8rem;
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #ffffff;
    border: 1px solid #dbe5f0;
    box-shadow: inset 0 0 0 8px #f5faff, 0 10px 24px #0f2b431f;
    animation: spinIn 0.65s ease both;
    position: relative;
  }

  .dial-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .dial-svg .track {
    fill: none;
    stroke: #dbe8f5;
    stroke-width: 14;
  }

  .dial-svg .progress {
    fill: none;
    stroke-width: 14;
    stroke-linecap: round;
    transform-origin: 60px 60px;
    transform: rotate(-90deg);
  }

  .inner {
    display: grid;
    place-items: center;
    line-height: 1;
    position: relative;
    z-index: 1;
  }

  .inner strong {
    font-size: 1.7rem;
    font-family: 'Sora', sans-serif;
    color: #17324d;
  }

  .inner span {
    color: #4d6786;
    font-size: 0.78rem;
    margin-top: 0.18rem;
  }

  .meta h3 {
    font-size: 1.08rem;
    margin-bottom: 0.26rem;
  }

  .meta p {
    color: #44617f;
    margin: 0;
  }

  .legend {
    margin-top: 0.6rem;
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    font-size: 0.78rem;
    color: #3a5879;
    font-weight: 700;
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: #edf4fb;
    border-radius: 999px;
    padding: 0.2rem 0.45rem;
  }

  .legend i {
    width: 0.52rem;
    height: 0.52rem;
    border-radius: 50%;
    display: inline-block;
  }

  .legend i.good {
    background: #0f8f5f;
  }

  .legend i.mid {
    background: #b77918;
  }

  .legend i.bad {
    background: #b02a2a;
  }

  @media (max-width: 720px) {
    .dial-wrap {
      grid-template-columns: 1fr;
      justify-items: center;
      text-align: center;
    }
  }

  @keyframes spinIn {
    from {
      opacity: 0;
      transform: scale(0.82) rotate(-35deg);
    }
    to {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }
</style>
