<script lang="ts">
  import type { LensAssessment } from '$lib/types/analysis';

  export let lenses: LensAssessment[] = [];
</script>

<section class="panel-solid table-wrap">
  <h3>Multi-Agent Critique Lenses</h3>
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>Lens</th>
          <th>Summary</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>
        {#each lenses as lens}
          <tr>
            <td><strong>{lens.lens}</strong></td>
            <td>{lens.summary}</td>
            <td>{lens.verdict}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .table-wrap {
    padding: 1.05rem;
  }

  h3 {
    margin-bottom: 0.7rem;
  }

  .table-scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    border-radius: 0.8rem;
    overflow: hidden;
  }

  th,
  td {
    text-align: left;
    padding: 0.72rem 0.6rem;
    border-bottom: 1px solid #dde5ef;
    vertical-align: top;
  }

  th {
    font-size: 0.78rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #445977;
    background: #eef5fc;
    position: sticky;
    top: 0;
  }

  tbody tr {
    transition: background 0.18s ease;
  }

  tbody tr:hover {
    background: #f6fbff;
  }
</style>
