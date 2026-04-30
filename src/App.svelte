<script lang="ts">
  import { onMount } from 'svelte';
  import rawConfig from './config.json';
  import type { Config, FundingState } from './types';
  import { computeFundingState, totalGoal } from './state';
  import FloorView from './FloorView.svelte';
  import FloorToggle from './FloorToggle.svelte';
  import GlobalProgress from './GlobalProgress.svelte';
  import RoomProgress from './RoomProgress.svelte';

  const config = rawConfig as Config;

  let totalRaised = $state(0);
  const fundingState: FundingState = $derived(computeFundingState(totalRaised, config));

  let selectedFloorId = $state<number | null>(null);
  let userChoseFloor = $state(false);

  const effectiveFloorId = $derived(
    userChoseFloor
      ? (selectedFloorId ?? fundingState.activeFloorId)
      : fundingState.activeFloorId
  );

  const selectedFloor = $derived(
    fundingState.floors.find(f => f.id === effectiveFloorId) ?? fundingState.floors[0]
  );

  function selectFloor(floorId: number): void {
    selectedFloorId = floorId;
    userChoseFloor = true;
  }

  const WORKER_URL = 'https://donorbox-proxy.funbotan.workers.dev/';

  async function fetchRaisedAmount(): Promise<number> {
    const response = await fetch(WORKER_URL);
    if (!response.ok) throw new Error(`Worker returned HTTP ${response.status}`);
    const { raised } = await response.json();
    return raised;
  }

  async function readFunds(): Promise<void> {
    // Dev override: ?progress=0..1 skips the Donorbox fetch (useful for testing).
    const p = new URLSearchParams(window.location.search).get('progress');
    if (p !== null) {
      totalRaised = Math.min(1, Math.max(0, parseFloat(p))) * totalGoal(config);
      return;
    }

    try {
      totalRaised = await fetchRaisedAmount();
    } catch (e) {
      console.error('[Donorbox]', e);
      totalRaised = 0;
    }
  }

  onMount(() => { readFunds(); });
</script>

<div class="widget">
  <GlobalProgress
    caption={selectedFloor?.caption ?? ''}
    totalRaised={fundingState.totalRaised}
    totalGoal={fundingState.totalGoal}
    progress={fundingState.globalProgress}
  />
  <FloorToggle
    floors={fundingState.floors}
    activeFloorId={effectiveFloorId}
    onSelect={selectFloor}
  />
  {#if selectedFloor}
    <FloorView floor={selectedFloor} />
  {/if}
  {#if fundingState.activeRoom}
    <RoomProgress room={fundingState.activeRoom} />
  {/if}
</div>

<style>
  .widget {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    font-family: sans-serif;
    background: white;
  }
</style>
