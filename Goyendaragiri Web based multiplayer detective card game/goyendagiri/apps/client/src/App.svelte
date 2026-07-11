<script lang="ts">
  import { onMount } from 'svelte';
  import { view, toast, tryReconnect, resetLobby } from './lib/net';
  import { sfx, muted, toggleMute, unlockAudio } from './lib/sound';
  import Landing from './screens/Landing.svelte';
  import Lobby from './screens/Lobby.svelte';
  import Initiation from './screens/Initiation.svelte';
  import Night from './screens/Night.svelte';
  import Board from './screens/Board.svelte';
  import End from './screens/End.svelte';
  import CardZoom from './screens/CardZoom.svelte';

  let showReset = false;

  onMount(() => {
    if (!new URLSearchParams(location.search).get('room')) tryReconnect();
    // Unlock audio on the first gesture; play a soft click for every button press.
    const onFirst = () => { unlockAudio(); window.removeEventListener('pointerdown', onFirst); };
    window.addEventListener('pointerdown', onFirst, { once: true });
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el && el.closest('button')) sfx('click');
    };
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  });

  $: phase = $view?.phase ?? null;
  $: isNight = phase !== null && phase.startsWith('night');
  $: isDay = phase === 'evidence' || phase === 'presentation' || phase === 'finalVote' || phase === 'witnessHunt';
  $: isHost = !!$view && $view.seat === $view.creatorSeat;

  // Phase-change sound cues.
  let prevPhase: string | null = null;
  $: if (phase !== prevPhase) {
    if (prevPhase !== null && phase !== null) {
      if (phase === 'gameOver') {
        const myTeam = $view && ($view.yourRole === 'murderer' || $view.yourRole === 'accomplice') ? 'murderer' : 'investigators';
        sfx($view?.winner === myTeam ? 'win' : 'lose');
      } else {
        sfx('phase');
      }
    }
    prevPhase = phase;
  }

  function confirmReset() { resetLobby(); showReset = false; }
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

<!-- Fixed host + sound controls, available on every screen -->
<div class="corner-ctl">
  <button class="ctl-btn" title={$muted ? 'Unmute' : 'Mute'} aria-label="Toggle sound"
    on:click={() => { unlockAudio(); toggleMute(); }}>{$muted ? '🔇' : '🔊'}</button>
  {#if isHost && phase !== 'lobby'}
    <button class="ctl-btn danger" title="Reset room to lobby" on:click={() => (showReset = true)}>⏏ Exit</button>
  {/if}
</div>

{#if showReset}
  <div class="modal-back" role="button" tabindex="-1" on:click={() => (showReset = false)} on:keydown={(e) => e.key === 'Escape' && (showReset = false)}>
    <div class="modal" style="max-width:420px" on:click|stopPropagation role="presentation">
      <h2>রুম রিসেট? · Reset the room?</h2>
      <p class="dim" style="font-size:.85rem;margin:8px 0 4px">
        This ends the current game and returns everyone to the lobby. Connected players keep their seats and the
        <b>same room code</b>; disconnected players are dropped. Use this if the game is stuck on a player who left.
      </p>
      <div class="row" style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
        <button class="btn ghost" on:click={() => (showReset = false)}>বাতিল · Cancel</button>
        <button class="btn danger" on:click={confirmReset}>⏏ রিসেট · Reset to lobby</button>
      </div>
    </div>
  </div>
{/if}

{#if $toast}
  <div class="toast">{$toast}</div>
{/if}

<!-- Global card-zoom overlay: long-press any card anywhere to enlarge it -->
<CardZoom />

<style>
  .corner-ctl{position:fixed;top:8px;right:8px;z-index:70;display:flex;gap:6px}
  .ctl-btn{font-family:inherit;font-size:.8rem;font-weight:600;cursor:pointer;
    background:var(--panel3);color:var(--ink);border:1px solid var(--gold-dim);
    border-radius:8px;padding:5px 9px;box-shadow:0 2px 8px rgba(0,0,0,.4);opacity:.9}
  .ctl-btn:hover{opacity:1}
  .ctl-btn.danger{border-color:var(--danger);color:var(--danger)}
</style>
