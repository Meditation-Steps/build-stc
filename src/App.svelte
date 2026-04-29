<script lang="ts">
  import { onMount } from 'svelte';
  import rawConfig from './config.json';
  import type { Config, FundingState } from './types';
  import { computeFundingState, totalGoal } from './state';
  import FloorView from './FloorView.svelte';
  import FloorToggle from './FloorToggle.svelte';
  import GlobalProgress from './GlobalProgress.svelte';
  import RoomProgress from './RoomProgress.svelte';

  // ─── Donorbox integration ─────────────────────────────────────────────────────
  const DONORBOX_CAMPAIGN_SLUG = 'construct-stc-maharlika'; // ← edit this
  // ─────────────────────────────────────────────────────────────────────────────

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

  // Scrapes the public Donorbox campaign page via a CORS proxy.
  // The raised total is in <p id="total-raised"> formatted as "€1,234,567".
  // If this ever breaks, inspect the campaign page source and update the selector/parser below.
  async function fetchRaisedAmount(): Promise<number> {
    const campaignUrl = `https://donorbox.org/${DONORBOX_CAMPAIGN_SLUG}`;
    // corsproxy.io is free and requires no key; swap the prefix if it becomes unreliable.
    const proxied = `https://corsproxy.io/?${encodeURIComponent(campaignUrl)}`;

    const response = await fetch(proxied);
    if (!response.ok) throw new Error(`Proxy returned HTTP ${response.status}`);
    const html = await response.text();

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const el = doc.getElementById('total-raised');
    if (!el) throw new Error('Donorbox: #total-raised element not found — check the campaign slug');

    // Strip the € symbol and comma thousands separators, then parse.
    const amount = parseFloat((el.textContent ?? '').replace(/[€,\s]/g, ''));
    if (isNaN(amount)) throw new Error(`Donorbox: could not parse amount from "${el.textContent}"`);
    return amount;
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
