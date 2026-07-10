<script lang="ts">
  import { view, roomCode, send, leave } from '../lib/net';
  $: v = $view!;
  $: isCreator = v.seat === v.creatorSeat;
  $: canStart = v.seats.length >= 4 && v.seats.length <= 12;
  $: volunteerMode = v.settings.detectiveMode === 'volunteer';
  $: emptySlots = Math.max(0, 12 - v.seats.length);
  const timers = [30, 45, 60, null];
  let copied = false;
  function copyLink() {
    navigator.clipboard?.writeText(`${location.origin}?room=${$roomCode}`);
    copied = true; setTimeout(() => copied = false, 1800);
  }
  function tapPlayer(seat) {
    if (isCreator && volunteerMode) send('updateSettings', { volunteerSeat: v.volunteerSeat === seat ? null : seat });
  }
</script>

<div class="screen">
  <div class="topbar">
    <span class="logo">🎩 গোয়েন্দাগিরি</span>
    <span class="chip">লবি · Lobby</span>
    <span class="timer">{v.seats.length} / 12 players</span>
    <span class="chip" style="color:var(--dim);border-color:var(--line)">বাং | EN</span>
  </div>
  <div class="scroll" style="padding:16px;display:flex;flex-wrap:wrap;gap:14px;align-content:flex-start">
    <div style="flex:2;min-width:300px;display:flex;flex-direction:column;gap:12px">
      <div class="panel">
        <h3>রুম কোড · Room code</h3>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:var(--panel3);border:1px dashed var(--gold-dim);border-radius:10px;padding:10px 16px">
          <b class="serif" style="font-size:2rem;letter-spacing:5px;color:var(--gold);text-shadow:0 0 18px rgba(217,169,78,.45),0 2px 2px rgba(0,0,0,.6)">{$roomCode}</b>
          <span class="dim" style="font-size:.72rem">share this link with friends</span>
          <button class="btn ghost" style="margin-left:auto" on:click={copyLink}>{copied ? '✓ copied!' : '📋 Copy link'}</button>
        </div>
      </div>
      <div class="panel" style="flex:1">
        <h3>খেলোয়াড় · Players ({v.seats.length}/12)
          {#if isCreator && volunteerMode}
            <span class="dim" style="font-weight:400;font-size:.68rem"> — tap a player to make them the Detective 🎩</span>
          {/if}
        </h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
          {#each v.seats as s}
            <div role="button" tabindex="0"
              style="display:flex;align-items:center;gap:8px;background:var(--panel2);border:1px solid {v.volunteerSeat === s.seat ? 'var(--gold)' : 'var(--line)'};border-radius:9px;padding:7px 10px;font-size:.8rem;opacity:{s.connected ? 1 : 0.5};cursor:{isCreator && volunteerMode ? 'pointer' : 'default'}"
              on:click={() => tapPlayer(s.seat)} on:keydown={e => e.key === 'Enter' && tapPlayer(s.seat)}>
              <span class="avatar">🕵</span>{s.name}
              {#if v.volunteerSeat === s.seat}<span title="volunteer detective">🎩</span>{/if}
              {#if s.seat === v.creatorSeat}<span class="badge you">HOST</span>{/if}
              {#if s.seat === v.seat}<span class="badge">you</span>{/if}
              {#if !s.connected}<span class="badge spent">⚠︎</span>{/if}
            </div>
          {/each}
          {#each Array(emptySlots) as _}
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;border:1px dashed var(--line);border-radius:9px;padding:7px 10px;font-size:.75rem;color:var(--dim);opacity:.45">
              waiting…
            </div>
          {/each}
        </div>
      </div>
    </div>
    <div style="flex:1;min-width:280px;display:flex;flex-direction:column;gap:12px">
      <div class="panel">
        <h3>⚙ সেটিংস · Game settings</h3>
        <div class="setting"><span>Difficulty</span>
          <span class="seg">
            {#each [3, 4, 5] as d}
              <button class:on={v.settings.difficulty === d} disabled={!isCreator}
                on:click={() => send('updateSettings', { difficulty: d })}>{d === 3 ? 'সহজ' : d === 4 ? 'সাধারণ' : 'কঠিন'} {d}</button>
            {/each}
          </span>
        </div>
        <div class="setting"><span>Rounds</span><span class="goldtext" style="font-weight:600">{v.settings.rounds}</span></div>
        <div class="setting"><span>Accomplice + Witness</span>
          <span class="goldtext" style="font-weight:600">{v.seats.length >= 6 ? 'Auto (6+ players)' : 'No (4–5)'}</span>
        </div>
        <div class="setting"><span>Presentation timer</span>
          <span class="seg">
            {#each timers as t}
              <button class:on={v.settings.timerSec === t} disabled={!isCreator}
                on:click={() => send('updateSettings', { timerSec: t })}>{t === null ? '∞' : t + 's'}</button>
            {/each}
          </span>
        </div>
        <div class="setting"><span>⚖️ Verdict</span>
          <span class="seg">
            <button class:on={v.settings.verdictMode === 'auto'} disabled={!isCreator}
              on:click={() => send('updateSettings', { verdictMode: 'auto' })}>Auto</button>
            <button class:on={v.settings.verdictMode === 'detective'} disabled={!isCreator}
              on:click={() => send('updateSettings', { verdictMode: 'detective' })}>Detective</button>
          </span>
        </div>
        <div class="setting" style="border-bottom:none"><span>🎩 Detective</span>
          <span class="seg">
            <button class:on={v.settings.detectiveMode === 'random'} disabled={!isCreator}
              on:click={() => send('updateSettings', { detectiveMode: 'random' })}>Random</button>
            <button class:on={v.settings.detectiveMode === 'volunteer'} disabled={!isCreator}
              on:click={() => send('updateSettings', { detectiveMode: 'volunteer' })}>Volunteer</button>
          </span>
        </div>
        {#if volunteerMode && v.volunteerSeat === null}
          <p class="dim" style="font-size:.68rem;margin-top:6px">No volunteer chosen yet — {isCreator ? 'tap a player on the left' : 'the host will pick one'}. Falls back to random if unset.</p>
        {/if}
        {#if v.settings.verdictMode === 'detective'}
          <p class="dim" style="font-size:.68rem;margin-top:6px">⚖️ Orchestrated mode: the game will NOT auto-judge accusations — the Detective clicks Yes/No, like the tabletop.</p>
        {/if}
      </div>
      <div class="panel dim" style="font-size:.75rem">🎙 Voice: create a Discord call and share it here. In-game text chat is always available.</div>
      {#if isCreator}
        <button class="btn gold big" disabled={!canStart} on:click={() => send('start')}>
          খেলা শুরু করুন · Start investigation{v.seats.length < 4 ? ` (need ${4 - v.seats.length} more)` : ''}
        </button>
      {:else}
        <div class="panel dim" style="text-align:center;font-size:.8rem">Waiting for the host to start…</div>
      {/if}
      <button class="btn ghost" on:click={leave}>🚪 Leave</button>
    </div>
  </div>
</div>

<style>
  .setting{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.82rem;flex-wrap:wrap}
</style>
