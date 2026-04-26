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

  function readFunds(): void {
    const p = new URLSearchParams(window.location.search).get('progress');
    totalRaised = p !== null
      ? Math.min(1, Math.max(0, parseFloat(p))) * totalGoal(config)
      : 0;
    // TODO: replace with Donorbox API fetch
  }

  onMount(readFunds);
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
