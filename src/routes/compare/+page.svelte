<script lang="ts">
  import { goto } from '$app/navigation';
  import ScoreCard from '$lib/components/dashboard/ScoreCard.svelte';
  import { latestCompareReport, latestReport } from '$lib/stores/analysis';

  $: report = $latestCompareReport;

  function backToForm() {
    goto('/');
  }

  async function openSingleReportView() {
    if (!report) return;
    const winnerReport = report.winner === 'Idea B' ? report.ideaB : report.ideaA;
    latestReport.set(winnerReport);
    await goto('/result');
  }

  $: winnerIsA = report?.winner === 'Idea A';
  $: winnerIsB = report?.winner === 'Idea B';
  $: heroLead = '';
  $: heroConfidence = '';
  $: heroCloseCall = '';
  $: if (report?.winnerReason) {
    const marker = 'Confidence:';
    const idx = report.winnerReason.indexOf(marker);
    if (idx >= 0) {
      heroLead = report.winnerReason.slice(0, idx).trim();
      const afterMarker = report.winnerReason.slice(idx).trim();
      const closeCallMarker = 'This is a close call';
      const closeIdx = afterMarker.indexOf(closeCallMarker);
      if (closeIdx >= 0) {
        heroConfidence = afterMarker.slice(0, closeIdx).trim();
        heroCloseCall = afterMarker.slice(closeIdx).trim();
      } else {
        heroConfidence = afterMarker;
        heroCloseCall = '';
      }
    } else {
      heroLead = report.winnerReason;
      heroConfidence = '';
      heroCloseCall = '';
    }
  }

  function scoreBand(score: number): 'strong' | 'mid' | 'weak' {
    if (score >= 7.5) return 'strong';
    if (score >= 5.8) return 'mid';
    return 'weak';
  }
</script>

<main class="page-shell">
  {#if report}
    <section class="hero">
      <span class="chip">Compare Mode</span>
      <h1>Idea A vs Idea B</h1>
      <p class="hero-summary">
        <span>{heroLead}</span>
        {#if heroConfidence}
          <br />
          <span class="hero-summary-next">{heroConfidence}</span>
        {/if}
        {#if heroCloseCall}
          <br />
          <span class="hero-summary-next">{heroCloseCall}</span>
        {/if}
      </p>
      <p class="mode-note">Feedback style: {report.critiqueMode === 'brutal' ? 'Brutal Honesty Mode' : 'Normal Mode'}</p>
    </section>

    <div class="action-row no-print">
      <button class="btn btn-secondary" on:click={backToForm}>Compare new ideas</button>
      <button class="btn btn-primary" on:click={openSingleReportView}>Open single report view</button>
    </div>

    <div class="compare-stack">
      <section class="panel score-panel">
        <h2 class="section-title">Recommended Idea</h2>
        <p class="winner">{report.winner}</p>
        <p class="confidence">Confidence: {report.confidence.toFixed(2)}</p>
        <p class="confidence-band">{report.confidenceBand}</p>
        <p class="muted">{report.recommendation}</p>
      </section>

      <section class={`panel-solid vs-board ${winnerIsA ? 'winner-a' : 'winner-b'}`}>
        <article>
          <p class="label">Idea A</p>
          <h3>{report.ideaA.parsedIdea.startupIdea}</h3>
          {#if winnerIsA}
            <p class="winner-tag">Winner</p>
          {/if}
          <span>{report.ideaA.scores.overallVentureScore.toFixed(1)}/10</span>
        </article>
        <div class="vs">VS</div>
        <article>
          <p class="label">Idea B</p>
          <h3>{report.ideaB.parsedIdea.startupIdea}</h3>
          {#if winnerIsB}
            <p class="winner-tag">Winner</p>
          {/if}
          <span>{report.ideaB.scores.overallVentureScore.toFixed(1)}/10</span>
        </article>
      </section>

      <section class="panel-solid matrix">
        <h3>Side-by-Side Scores</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Idea A</th>
                <th>Idea B</th>
                <th>Edge</th>
              </tr>
            </thead>
            <tbody>
              {#each report.matrix as row}
                <tr class:win-a={row.winner === 'A'} class:win-b={row.winner === 'B'}>
                  <td>{row.metric}</td>
                  <td class={`score-cell ${scoreBand(row.ideaA)}`}>{row.ideaA.toFixed(1)}</td>
                  <td class={`score-cell ${scoreBand(row.ideaB)}`}>{row.ideaB.toFixed(1)}</td>
                  <td>{row.winner === 'A' ? 'Idea A' : 'Idea B'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid grid-2 snapshot-grid">
        <section class={`panel-solid snapshot-card ${winnerIsA ? 'is-winner' : ''}`}>
          <h3>Idea A Snapshot</h3>
          <p class="idea-title">{report.ideaA.parsedIdea.startupIdea}</p>
          <div class="grid grid-2">
            <ScoreCard label="Overall Score" score={report.ideaA.scores.overallVentureScore} />
            <ScoreCard label="Differentiation" score={report.ideaA.scores.differentiation} />
          </div>
        </section>
        <section class={`panel-solid snapshot-card ${winnerIsB ? 'is-winner' : ''}`}>
          <h3>Idea B Snapshot</h3>
          <p class="idea-title">{report.ideaB.parsedIdea.startupIdea}</p>
          <div class="grid grid-2">
            <ScoreCard label="Overall Score" score={report.ideaB.scores.overallVentureScore} />
            <ScoreCard label="Differentiation" score={report.ideaB.scores.differentiation} />
          </div>
        </section>
      </div>

      <section class="panel-solid tradeoffs">
        <h3>Key Tradeoffs</h3>
        <ul>
          {#each report.tradeoffs as item}
            <li>{item}</li>
          {/each}
        </ul>
      </section>
    </div>
  {:else}
    <section class="panel empty">
      <h2>No comparison report yet</h2>
      <p class="muted">Use Compare Two Ideas from the intake page first.</p>
      <button class="btn btn-primary no-print" on:click={backToForm}>Go to intake</button>
    </section>
  {/if}
</main>

<style>
  .action-row {
    margin-top: 1rem;
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .mode-note {
    margin-top: 0.55rem;
    font-weight: 700;
    color: #dff2ff;
  }

  .hero h1 {
    margin-top: 0.45rem;
  }

  .hero-summary {
    margin-top: 0.85rem;
    line-height: 1.28;
    max-width: none !important;
    width: 100%;
  }

  .hero-summary-next {
    display: inline-block;
    margin-top: 0.18rem;
  }

  .hero .mode-note {
    max-width: none !important;
  }

  .compare-stack {
    margin-top: 1rem;
    display: grid;
    gap: 1.15rem;
  }

  .compare-stack > * {
    position: relative;
  }

  .compare-stack > *:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 0.65rem;
    right: 0.65rem;
    bottom: -0.62rem;
    border-bottom: 1px dashed #cddbeb;
    pointer-events: none;
  }

  .score-panel {
    padding: 1rem;
  }

  .winner {
    font-size: 1.4rem;
    font-weight: 800;
    margin: 0.2rem 0 0.4rem;
  }

  .confidence {
    margin: 0 0 0.35rem;
    font-weight: 800;
    color: #1e5b8d;
  }

  .confidence-band {
    margin: 0 0 0.35rem;
    display: inline-flex;
    padding: 0.22rem 0.5rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 800;
    color: #744c2f;
    background: #ffe8d3;
    border: 1px solid #efc8a2;
  }

  .matrix {
    padding: 1rem;
  }

  .vs-board {
    margin-top: 1rem;
    padding: 1rem;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.7rem;
    align-items: center;
  }

  .vs-board article {
    border: 1px solid #c6d7e8;
    border-radius: 0.85rem;
    padding: 0.75rem;
    background: linear-gradient(160deg, #f7fcff, #eef6ff);
  }

  .vs-board article h3 {
    font-size: 1rem;
    margin: 0.2rem 0 0.45rem;
    color: #183e61;
  }

  .winner-tag {
    display: inline-flex;
    margin: 0 0 0.45rem;
    padding: 0.2rem 0.45rem;
    border-radius: 999px;
    font-size: 0.74rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 800;
    color: #ffffff;
    background: linear-gradient(135deg, #0c7b67, #0aa67f);
  }

  .vs-board article span {
    font-size: 1rem;
    font-weight: 800;
    color: #0f4f7f;
  }

  .vs-board.winner-a article:first-child,
  .vs-board.winner-b article:last-child {
    border-color: #8ecfbf;
    box-shadow: 0 10px 22px #0d78521f;
    background: linear-gradient(160deg, #f1fff9, #ebfaf2);
  }

  .vs-board .label {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #3b6085;
    font-weight: 800;
  }

  .vs {
    width: 2.8rem;
    height: 2.8rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-weight: 800;
    background: linear-gradient(135deg, #0d4977, #0d876f);
    box-shadow: 0 10px 20px #0b355934;
  }

  .table-wrap {
    overflow-x: auto;
    margin-top: 0.65rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    text-align: left;
    padding: 0.66rem 0.55rem;
    border-bottom: 1px solid #d7e2ee;
  }

  tbody tr.win-a {
    background: #eefaf3;
  }

  tbody tr.win-b {
    background: #eef5ff;
  }

  .score-cell.strong {
    color: #12663e;
    font-weight: 700;
  }

  .score-cell.mid {
    color: #8e5a09;
    font-weight: 700;
  }

  .score-cell.weak {
    color: #9d1e2f;
    font-weight: 700;
  }

  th {
    text-transform: uppercase;
    font-size: 0.78rem;
    color: #406183;
  }

  .idea-title {
    margin: 0.35rem 0 0.8rem;
    font-weight: 700;
  }

  .snapshot-grid {
    align-items: start;
  }

  .snapshot-card {
    padding: 0.95rem;
    border-width: 1.5px;
  }

  .snapshot-card.is-winner {
    border-color: #8ecfbf;
    box-shadow: 0 14px 30px #0f6e4e24;
    background: linear-gradient(160deg, #f5fff9, #f0faf5);
  }

  .tradeoffs {
    padding: 1rem;
  }

  .tradeoffs ul {
    margin: 0.5rem 0 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.35rem;
  }

  .empty {
    margin-top: 1rem;
    padding: 1.2rem;
    display: grid;
    gap: 0.8rem;
    justify-items: start;
  }

  @media (max-width: 900px) {
    .vs-board {
      grid-template-columns: 1fr;
    }

    .vs {
      justify-self: center;
    }
  }
</style>
