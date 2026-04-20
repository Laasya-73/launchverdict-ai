<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import LensSpotlight from '$lib/components/dashboard/LensSpotlight.svelte';
  import RiskList from '$lib/components/dashboard/RiskList.svelte';
  import ScoreCard from '$lib/components/dashboard/ScoreCard.svelte';
  import ScoreHeatmap from '$lib/components/dashboard/ScoreHeatmap.svelte';
  import SwotCard from '$lib/components/dashboard/SwotCard.svelte';
  import VerdictCard from '$lib/components/dashboard/VerdictCard.svelte';
  import VentureDial from '$lib/components/dashboard/VentureDial.svelte';
  import { latestReport } from '$lib/stores/analysis';

  $: report = $latestReport;
  let reportNode: HTMLElement | null = null;
  let exportingPdf = false;

  function backToForm() {
    goto('/');
  }

  function parseEvidence(value: string): { tag: string | null; text: string } {
    const match = value.match(/^\[(model-estimate|inferred|rule-based)\]\s*/i);
    if (!match) return { tag: null, text: value };
    return { tag: match[1].toLowerCase(), text: value.replace(match[0], '').trim() };
  }

  async function printReport() {
    if (!reportNode || !report || exportingPdf) return;
    exportingPdf = true;
    await tick();

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      await document.fonts.ready;

      const clone = reportNode.cloneNode(true) as HTMLElement;
      clone.classList.add('pdf-export-clone');
      clone.setAttribute('aria-hidden', 'true');
      clone.style.position = 'fixed';
      clone.style.left = '-10000px';
      clone.style.top = '0';
      clone.style.width = `${Math.ceil(reportNode.getBoundingClientRect().width)}px`;
      clone.style.maxWidth = 'none';
      clone.style.background = '#fffaf4';
      clone.style.zIndex = '-1';
      clone.style.pointerEvents = 'none';
      clone.querySelectorAll('.no-print').forEach((node) => node.remove());
      document.body.appendChild(clone);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const margin = 8;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fffaf4',
        scrollX: 0,
        scrollY: 0,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
        logging: false
      });

      if (!canvas.width || !canvas.height) {
        throw new Error('Empty canvas');
      }

      const cloneHeight = Math.max(1, clone.scrollHeight);
      const pxPerMm = canvas.width / usableWidth;
      const canvasPerDomPx = canvas.height / cloneHeight;
      const pagePxHeight = Math.floor(usableHeight * pxPerMm);
      const minPageDomHeight = 320;
      const safetyPadDom = 24;
      const blockBottomsDom = new Set<number>();
      const blockSelector = [
        '.panel',
        '.panel-solid',
        '.glance',
        '.top-bento > *',
        '.grid > *',
        '.report-grid > *',
        '.glance-grid > *'
      ].join(', ');

      clone.querySelectorAll(blockSelector).forEach((node) => {
        const el = node as HTMLElement;
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (bottom > 0) blockBottomsDom.add(bottom);
      });

      const sortedBottomsDom = [...blockBottomsDom].sort((a, b) => a - b);
      let offsetPx = 0;
      let firstPage = true;

      while (offsetPx < canvas.height) {
        const remainingPx = canvas.height - offsetPx;
        let slicePx = Math.min(pagePxHeight, remainingPx);

        if (remainingPx > pagePxHeight) {
          const currentDomTop = offsetPx / canvasPerDomPx;
          const suggestedDomBottom = currentDomTop + pagePxHeight / canvasPerDomPx;
          const minAllowed = currentDomTop + minPageDomHeight;

          let chosenBottom = 0;
          for (const bottom of sortedBottomsDom) {
            if (bottom < minAllowed) continue;
            if (bottom <= suggestedDomBottom - safetyPadDom) chosenBottom = bottom;
            if (bottom > suggestedDomBottom - safetyPadDom) break;
          }

          if (chosenBottom > 0) {
            const preferredPx = Math.floor((chosenBottom - currentDomTop) * canvasPerDomPx);
            if (preferredPx >= Math.floor(pagePxHeight * 0.55) && preferredPx <= remainingPx) {
              slicePx = preferredPx;
            }
          }
        }

        const sliceMm = slicePx / pxPerMm;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = slicePx;

        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) break;
        ctx.drawImage(canvas, 0, offsetPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

        if (!firstPage) pdf.addPage();
        firstPage = false;

        const imageData = sliceCanvas.toDataURL('image/png');
        pdf.addImage(imageData, 'PNG', margin, margin, usableWidth, sliceMm, undefined, 'FAST');

        offsetPx += slicePx;
      }

      if (clone.parentNode) clone.parentNode.removeChild(clone);
      pdf.save(`${report.reportSlug || 'launchverdict-report'}.pdf`);
    } catch {
      window.print();
    } finally {
      const staleClone = document.body.querySelector('.pdf-export-clone');
      if (staleClone && staleClone.parentNode) staleClone.parentNode.removeChild(staleClone);
      exportingPdf = false;
    }
  }

  $: scoreTone =
    report && report.scores.overallVentureScore >= 7
      ? 'good'
      : report && report.scores.overallVentureScore >= 5
        ? 'caution'
        : 'risk';
  $: parsedCompetitorDisclaimer = parseEvidence(report?.competitorDisclaimer ?? '');
  $: parsedDifferentiationWhy = parseEvidence(report?.structuredCritique.differentiationWhy ?? '');
  $: competitorSignal = report
    ? [...new Set([...(report.parsedIdea.competitorsList || []), ...(report.parsedIdea.inferredCompetitors || [])])].slice(0, 8)
    : [];
</script>

<main class="page-shell">
  {#if report}
    <div class="report-export" bind:this={reportNode}>
      <section class="hero">
        <span class="chip">Idea Report</span>
        <h1>{report.parsedIdea.startupIdea}</h1>
        <p>For: {report.parsedIdea.targetUsers}</p>
        <p class="mode-note">
          Feedback style: {report.critiqueMode === 'brutal' ? 'Brutal Honesty Mode' : 'Normal Mode'}
        </p>
      </section>

      <div class="action-row no-print">
        <button class="btn btn-secondary" on:click={backToForm}>Analyze another idea</button>
        <button class="btn btn-primary" disabled={exportingPdf} on:click={printReport}>
          {exportingPdf ? 'Generating PDF...' : 'Download report (PDF)'}
        </button>
      </div>

      <div class="dashboard-stack">
        <section class={`pulse-strip ${scoreTone}`} aria-hidden="true"></section>

      <section class="glance-grid">
        <article class="glance score">
          <p>Overall Score</p>
          <h3>{report.scores.overallVentureScore.toFixed(1)}/10</h3>
        </article>
        <article class="glance diff">
          <p>Uniqueness</p>
          <h3>{report.scores.differentiation.toFixed(1)}/10</h3>
        </article>
        <article class="glance exec">
          <p>Build Difficulty</p>
          <h3>{report.scores.executionComplexity}</h3>
        </article>
        <article class="glance mode">
          <p>Feedback</p>
          <h3>{report.critiqueMode === 'brutal' ? 'Brutal' : 'Normal'}</h3>
        </article>
        <article class="glance confidence">
          <p>Confidence Level</p>
          <h3>{report.confidence.toFixed(2)}</h3>
          <small>{report.confidenceExplanation}</small>
        </article>
      </section>

      <section class="top-bento">
        <VentureDial
          score={report.scores.overallVentureScore}
          verdict={report.finalVerdict}
          mode={report.critiqueMode}
        />
        <section class="panel-solid dna">
          <p class="section-eyebrow">Idea Summary</p>
          <h3>Quick Context</h3>
          <div class="dna-grid">
            <article>
              <h4>Main Problem</h4>
              <p>{report.parsedIdea.painPoint}</p>
            </article>
            <article>
              <h4>Business Model</h4>
              <p>{report.parsedIdea.businessModel}</p>
            </article>
            <article class="wide">
              <h4>Competition</h4>
              <p class="muted disclaimer">
                {#if parsedCompetitorDisclaimer.tag}<small class="evidence">{parsedCompetitorDisclaimer.tag}</small>{/if}
                {parsedCompetitorDisclaimer.text}
              </p>
              {#if competitorSignal.length}
                <div class="chip-row">
                  {#each competitorSignal as item}
                    <span>{item}</span>
                  {/each}
                </div>
              {:else}
                <p class="muted">No clear competitors found yet.</p>
              {/if}
            </article>
          </div>
        </section>
      </section>

      <VerdictCard
        verdict={report.finalVerdict}
        verdictLabel={report.scores.verdictLabel}
        portfolioAngle={report.portfolioAngle}
        score={report.scores.overallVentureScore}
        mode={report.critiqueMode}
      />

      <section class="panel score-panel">
        <p class="section-eyebrow">Scores</p>
        <div class="score-head">
          <h2 class="section-title">Score Summary</h2>
          <p class="muted">Simple scoring across problem, money, market, and build difficulty.</p>
        </div>
        <div class="grid grid-3">
          <ScoreCard label="Problem Strength" score={report.scores.problemStrength} />
          <ScoreCard label="Differentiation" score={report.scores.differentiation} />
          <ScoreCard label="Monetization Potential" score={report.scores.monetizationPotential} />
          <ScoreCard
            label="Founder Risk (Lower Is Better)"
            score={report.scores.founderRisk}
            hint="0 = lower execution risk, 10 = high execution risk."
          />
          <ScoreCard label="Execution Complexity" score={report.scores.executionComplexity} />
          <ScoreCard label="Overall Venture Score" score={report.scores.overallVentureScore} />
        </div>
      </section>

      <div class="report-grid">
        <ScoreHeatmap scores={report.scores.dimensionScores} />
        <section class="panel-solid critique">
          <p class="section-eyebrow">Details</p>
          <h3>What We Found</h3>
          <ul>
            <li><strong>Problem clarity:</strong> {report.structuredCritique.clarityOfProblem}</li>
            <li><strong>Pain level:</strong> {report.structuredCritique.customerPainLevel}</li>
            <li><strong>Uniqueness:</strong> {report.structuredCritique.differentiation}</li>
            <li>
              <strong>Why uniqueness is weak:</strong>
              {#if parsedDifferentiationWhy.tag}<small class="evidence">{parsedDifferentiationWhy.tag}</small>{/if}
              {parsedDifferentiationWhy.text}
            </li>
            <li><strong>Can you build it?:</strong> {report.structuredCritique.feasibility}</li>
            <li><strong>Can it make money?:</strong> {report.structuredCritique.monetizationStrength}</li>
            <li><strong>How hard to get customers?:</strong> {report.structuredCritique.goToMarketDifficulty}</li>
            <li><strong>Moat strength:</strong> {report.structuredCritique.defensibility}</li>
            <li><strong>Growth potential:</strong> {report.structuredCritique.scalability}</li>
            <li><strong>Confidence note:</strong> {report.confidenceExplanation}</li>
          </ul>
        </section>
      </div>

      <div class="grid grid-3">
        {#if report.critiqueMode === 'brutal'}
          <RiskList title="Main Risks" items={report.failureRisks} tone="danger" />
          <RiskList title="Biggest Weaknesses" items={report.topWeaknesses} tone="danger" />
          <RiskList title="Fix This Now" items={report.improvementSuggestions} tone="danger" />
        {:else}
          <RiskList title="Top Strengths" items={report.topStrengths} tone="success" />
          <RiskList title="Main Risks" items={report.failureRisks} tone="danger" />
          <RiskList title="How to Improve" items={report.improvementSuggestions} />
        {/if}
      </div>

      <section class="panel-solid no-build">
        <p class="section-eyebrow">Before You Build</p>
        <h3>Reasons to pause first</h3>
        <ul>
          {#each report.whyNotToBuildThis as line}
            {@const parsed = parseEvidence(line)}
            <li>
              {#if parsed.tag}<small class="evidence">{parsed.tag}</small>{/if}
              {parsed.text}
            </li>
          {/each}
        </ul>
      </section>

      <LensSpotlight lenses={report.lenses} />
      <SwotCard swot={report.swot} />

      <section class="panel-solid rewrite">
        <p class="section-eyebrow">Idea Upgrade</p>
        <h3>Better Version of Your Idea</h3>
        <div class="grid grid-2">
          <article>
            <h4>Improved Idea</h4>
            <p>{report.rewrite.improvedIdea}</p>
          </article>
          <article>
            <h4>Narrower Target</h4>
            <p>{report.rewrite.sharperNiche}</p>
          </article>
          <article>
            <h4>Clearer Positioning</h4>
            <p>{report.rewrite.betterPositioning}</p>
          </article>
          <article>
            <h4>How to Present It</h4>
            <p>{report.rewrite.repositioning}</p>
          </article>
          <article>
            <h4>Pivot Suggestion</h4>
            <p>{report.rewrite.pivotSuggestion}</p>
          </article>
          <article>
            <h4>New One-Line Pitch</h4>
            <p>{report.rewrite.revisedPitch}</p>
          </article>
          <article>
            <h4>Landing Page Headline</h4>
            <p>{report.rewrite.revisedHeadline}</p>
          </article>
        </div>
        <p class="icp"><strong>Target customer focus:</strong> {report.rewrite.icpRefinement}</p>
        <article class="pivot-object">
          <h4>Simple Pivot Plan</h4>
          <p><strong>Best customer to target:</strong> {report.rewrite.pivot.newTarget}</p>
          <p><strong>First workflow to ship:</strong> {report.rewrite.pivot.firstWorkflow}</p>
          <p><strong>Success metric:</strong> {report.rewrite.pivot.successMetric}</p>
          <p><strong>How to position it:</strong> {report.rewrite.pivot.newPositioning}</p>
          <p><strong>Why this is better:</strong> {report.rewrite.pivot.whyBetter}</p>
          <p><strong>Simple pitch:</strong> {report.rewrite.pivot.revisedPitch}</p>
        </article>
        <div class="why-better">
          <h4>Why this version should work better</h4>
          <ul>
            {#each report.rewrite.whyBetter as line}
              {@const parsed = parseEvidence(line)}
              <li>
                {#if parsed.tag}<small class="evidence">{parsed.tag}</small>{/if}
                {parsed.text}
              </li>
            {/each}
          </ul>
        </div>
      </section>
      </div>
    </div>
  {:else}
    <section class="panel empty">
      <h2>No analysis report yet</h2>
      <p class="muted">Submit an idea from the intake page first.</p>
      <button class="btn btn-primary no-print" on:click={backToForm}>Go to idea intake</button>
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

  .pulse-strip {
    height: 0.45rem;
    border-radius: 999px;
    opacity: 0.8;
    box-shadow: inset 0 0 0 1px #ffffff80;
    background-size: 180% 100%;
    animation: pulseMove 6s linear infinite;
  }

  .pulse-strip.good {
    background-image: linear-gradient(90deg, #0f935f, #48cf94, #0f935f);
  }

  .pulse-strip.caution {
    background-image: linear-gradient(90deg, #bc7a14, #e1b45c, #bc7a14);
  }

  .pulse-strip.risk {
    background-image: linear-gradient(90deg, #b72d2d, #d67878, #b72d2d);
  }

  .glance-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .glance {
    border-radius: 0.9rem;
    padding: 0.7rem 0.8rem;
    color: #0f2d47;
    border: 1px solid #bdd2e4;
    background: linear-gradient(145deg, #f7fcff, #ebf5ff);
    box-shadow: 0 8px 20px #0c274220;
  }

  .glance h3 {
    font-size: 1.2rem;
    margin-top: 0.15rem;
  }

  .glance p {
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #3e6287;
  }

  .glance small {
    display: block;
    margin-top: 0.3rem;
    font-size: 0.72rem;
    color: #486786;
    line-height: 1.25;
  }

  .glance.score {
    background: linear-gradient(145deg, #d8fff2, #ecfff8);
  }

  .glance.diff {
    background: linear-gradient(145deg, #e9f4ff, #f4f9ff);
  }

  .glance.exec {
    background: linear-gradient(145deg, #fff2dc, #fff8ea);
  }

  .glance.mode {
    background: linear-gradient(145deg, #ffecef, #fff5f7);
  }

  .glance.confidence {
    background: linear-gradient(145deg, #e9f5ff, #f4faff);
  }

  .top-bento {
    display: grid;
    grid-template-columns: 1.06fr 1fr;
    gap: 0.9rem;
  }

  .dna {
    padding: 1rem;
  }

  .dna h3 {
    margin-top: 0.2rem;
    margin-bottom: 0.7rem;
  }

  .dna-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.62rem;
  }

  .dna article {
    border: 1px solid #c8daea;
    border-radius: 0.78rem;
    padding: 0.62rem 0.68rem;
    background: linear-gradient(155deg, #f8fcff, #edf6ff);
  }

  .dna article.wide {
    grid-column: span 2;
  }

  .dna article h4 {
    margin-bottom: 0.28rem;
    font-size: 0.9rem;
  }

  .dna article p {
    margin: 0;
    font-size: 0.9rem;
    color: #28496b;
    line-height: 1.35;
  }

  .dna .disclaimer {
    margin-bottom: 0.38rem;
    font-size: 0.8rem;
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
    vertical-align: middle;
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chip-row span {
    display: inline-flex;
    padding: 0.24rem 0.5rem;
    border-radius: 999px;
    border: 1px solid #b8d2e7;
    background: #f6fbff;
    color: #214d73;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .score-panel {
    padding: 1.05rem;
  }

  .score-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.8rem;
    flex-wrap: wrap;
  }

  .score-head p {
    font-size: 0.9rem;
  }

  .mode-note {
    margin-top: 0.4rem;
    font-weight: 700;
    color: #dff2ff;
  }

  .critique {
    padding: 1.05rem;
    position: relative;
    overflow: hidden;
  }

  .critique::before {
    content: '';
    position: absolute;
    right: -2.8rem;
    top: -2.8rem;
    width: 8rem;
    height: 8rem;
    border-radius: 50%;
    background: radial-gradient(circle, #8ed8de54, transparent 70%);
    pointer-events: none;
  }

  .critique ul {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.4rem;
    position: relative;
    z-index: 1;
  }

  .rewrite {
    padding: 1rem;
    display: grid;
    gap: 0.8rem;
  }

  .rewrite h4 {
    margin-bottom: 0.35rem;
  }

  .rewrite article {
    background: #f7fbff;
    border: 1px solid #d7e4ef;
    border-radius: 0.8rem;
    padding: 0.75rem;
  }

  .icp {
    margin-top: 0.2rem;
  }

  .pivot-object {
    margin-top: 0.15rem;
    background: linear-gradient(145deg, #f2f9ff, #f8fcff);
    border: 1px solid #cfdfee;
    border-radius: 0.8rem;
    padding: 0.78rem;
    display: grid;
    gap: 0.25rem;
  }

  .pivot-object p {
    margin: 0;
    font-size: 0.9rem;
    color: #24486d;
  }

  .why-better {
    border-top: 1px dashed #c9d8e8;
    padding-top: 0.75rem;
  }

  .why-better h4 {
    margin-bottom: 0.35rem;
  }

  .why-better ul {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.3rem;
  }

  .empty {
    margin-top: 1rem;
    padding: 1.2rem;
    display: grid;
    gap: 0.8rem;
    justify-items: start;
  }

  .no-build {
    padding: 1rem;
    border-left: 6px solid #b02a2a;
  }

  .no-build ul {
    margin: 0.55rem 0 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.36rem;
  }

  .dashboard-stack > * {
    animation: riseIn 0.5s ease both;
  }

  .dashboard-stack > *:nth-child(2) {
    animation-delay: 0.05s;
  }

  .dashboard-stack > *:nth-child(3) {
    animation-delay: 0.09s;
  }

  .dashboard-stack > *:nth-child(4) {
    animation-delay: 0.13s;
  }

  .dashboard-stack > *:nth-child(5) {
    animation-delay: 0.17s;
  }

  .dashboard-stack > *:nth-child(6) {
    animation-delay: 0.21s;
  }

  .dashboard-stack > *:nth-child(7) {
    animation-delay: 0.25s;
  }

  @media (max-width: 900px) {
    .top-bento {
      grid-template-columns: 1fr;
    }

    .glance-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 620px) {
    .glance-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @keyframes pulseMove {
    0% {
      background-position: 0% 50%;
    }
    100% {
      background-position: 180% 50%;
    }
  }

  @keyframes riseIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
