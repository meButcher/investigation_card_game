<script lang="ts">
  import { onMount } from 'svelte';
  import { view, toast, tryReconnect } from './lib/net';
  import Landing from './screens/Landing.svelte';
  import Lobby from './screens/Lobby.svelte';
  import Initiation from './screens/Initiation.svelte';
  import Night from './screens/Night.svelte';
  import Board from './screens/Board.svelte';
  import End from './screens/End.svelte';
  import CardZoom from './screens/CardZoom.svelte';

  // Auto-reconnect to a previous session — but NEVER when the player arrived via an
  // invite link (?room=...): their intent is to join THAT room, not their old one.
  onMount(() => {
    if (!new URLSearchParams(location.search).get('room')) tryReconnect();
  });

  $: phase = $view?.phase ?? null;
  $: isNight = phase !== null && phase.startsWith('night');
  $: isDay = phase === 'evidence' || phase === 'presentation' || phase === 'finalVote' || phase === 'witnessHunt';
</script>

{#if !$view}
  <Landing />
{:else if phase === 'lobby'}
  <Lobby />
{:else if phase === 'initiation'}
  <Initiation />
{:else if isNight}
  <Night />
{:else if isDay}
  <Board />
{:else if phase === 'gameOver'}
  <End />
{/if}

{#if $toast}
  <div class="toast">{$toast}</div>
{/if}

<!-- Global card-zoom overlay: long-press any card anywhere to enlarge it -->
<CardZoom />
