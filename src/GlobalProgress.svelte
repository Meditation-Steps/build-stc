<script lang="ts">
  interface Props {
    caption: string;
    totalRaised: number;
    totalGoal: number;
    progress: number;
  }

  let { caption, totalRaised, totalGoal, progress }: Props = $props();

  function formatEuros(amount: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }
</script>

<div class="global-progress">
  <p class="caption">{caption}</p>
  <div class="bar-row">
    <div class="bar-track">
      <div class="bar-fill" style="width: {progress * 100}%"></div>
    </div>
    <span class="amounts">{formatEuros(totalRaised)} / {formatEuros(totalGoal)}</span>
  </div>
</div>

<style>
  .global-progress {
    padding: 0.6rem 0.75rem 0.4rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .caption {
    font-size: 0.8rem;
    color: #555;
    margin-bottom: 0.35rem;
  }

  .bar-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .bar-track {
    flex: 1;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: #4caf50;
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  .amounts {
    white-space: nowrap;
    font-size: 0.75rem;
    color: #666;
  }
</style>
