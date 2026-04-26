<script lang="ts">
  import type { RoomState } from './types';

  interface Props {
    room: RoomState;
  }

  let { room }: Props = $props();

  const progress = $derived(room.status.kind === 'active' ? room.status.progress : 0);
  const raised = $derived(Math.round(room.price * progress));

  function formatEuros(amount: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }
</script>

<div class="room-progress">
  <div class="room-name">Currently funding: <strong>{room.name}</strong></div>
  <div class="bar-track">
    <div class="bar-fill" style="width: {progress * 100}%"></div>
  </div>
  <div class="labels">
    <span>{formatEuros(raised)}</span>
    <span>{formatEuros(room.price)}</span>
  </div>
</div>

<style>
  .room-progress {
    padding: 0.5rem 0.75rem;
    border-top: 1px solid #e0e0e0;
    font-size: 0.85rem;
  }

  .room-name {
    margin-bottom: 0.3rem;
    color: #444;
  }

  .bar-track {
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: #2196f3;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .labels {
    display: flex;
    justify-content: space-between;
    color: #666;
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }
</style>
