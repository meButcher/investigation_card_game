<script lang="ts">
  import { createRoom, joinRoom, connError } from '../lib/net';
  let name = '';
  let code = new URLSearchParams(location.search).get('room') ?? '';
  let busy = false;
  async function create() { busy = true; await createRoom(name || 'Player'); busy = false; }
  async function join() { busy = true; await joinRoom(code, name || 'Player'); busy = false; }
</script>

<div class="screen" style="align-items:center;justify-content:center">
  <div class="panel" style="width:min(420px,92vw)">
    <h1 style="color:var(--gold);font-size:1.8rem;text-align:center;margin-bottom:2px">🎩 গোয়েন্দাগিরি</h1>
    <p class="dim" style="text-align:center;font-size:.8rem;margin-bottom:18px">Detect. Deceive. Discover. · সত্যের সন্ধানে</p>

    <label class="dim" for="playerName" style="font-size:.75rem">তোমার নাম · Your name</label>
    <input class="input" id="playerName" bind:value={name} maxlength="20" placeholder="e.g. Kisholoy" style="margin:4px 0 14px" />

    <button class="btn gold big" on:click={create} disabled={busy || !name.trim()}>
      🕯 নতুন রুম · Create room
    </button>

    <div class="dim" style="text-align:center;margin:12px 0;font-size:.75rem">— অথবা · or —</div>

    <div style="display:flex;gap:8px">
      <input class="input" bind:value={code} placeholder="রুম কোড · room code" style="text-transform:none" />
      <button class="btn ghost" on:click={join} disabled={busy || !code.trim() || !name.trim()}>Join</button>
    </div>

    {#if $connError}
      <p style="color:var(--danger);font-size:.78rem;margin-top:10px">{$connError}</p>
    {/if}
    <p class="dim" style="font-size:.68rem;margin-top:16px">🎙 ভয়েসের জন্য Discord কল ব্যবহার করো · use a Discord call for voice — this game is the shared board.</p>
  </div>
</div>
