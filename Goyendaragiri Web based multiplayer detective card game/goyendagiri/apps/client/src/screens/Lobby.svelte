<script lang="ts">
  import { view, roomCode, send, leave } from '../lib/net';
  import NetStatus from './NetStatus.svelte';
  import { lang, t } from '../lib/lang';
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
    if (v.seats.find(x => x.seat === seat)?.isBot) return;
    if (isCreator && volunteerMode) send('updateSettings', { volunteerSeat: v.volunteerSeat === seat ? null : seat });
  }
  function cycleRounds() {
    if (!isCreator) return;
    const current = v.settings.rounds;
    const next = current === 3 ? 4 : current === 4 ? 5 : current === 5 ? 2 : 3;
    send('updateSettings', { rounds: next });
  }
  // ART HOOK: /art/avatars/av1..av12.png — the img hides itself if the file is missing (docs/ART-ASSETS.md)
  const hideImg = (e: Event) => ((e.currentTarget as HTMLImageElement).style.display = 'none');
</script>

<div class="screen lobby-bg">
  <div class="topbar">
    <span class="logo">🎩 গোয়েন্দাগিরি</span>
    <span class="chip">{$t('লবি · Lobby')}</span>
    <NetStatus />
    <span class="timer">{v.seats.length} / 12 players</span>
    <span class="seg" title={$t('তোমার নিজের ভাষা-ক্রম · your own language order — only affects your screen')}>
      <button class:on={$lang === 'bn'} on:click={() => lang.set('bn')}>বাং</button>
      <button class:on={$lang === 'en'} on:click={() => lang.set('en')}>EN</button>
    </span>
  </div>
  <div class="scroll" style="padding:16px;display:flex;flex-wrap:wrap;gap:14px;align-content:flex-start">
    <div style="flex:2;min-width:300px;display:flex;flex-direction:column;gap:12px">
      <div class="panel">
        <h3>{$t('রুম কোড · Room code')}</h3>
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
              <span class="avatar pav">🕵<img src="/art/avatars/av{(s.seat % 12) + 1}.png" alt="" loading="lazy" on:error={hideImg} /></span>{s.name}
              {#if v.volunteerSeat === s.seat}<span title="volunteer detective">🎩</span>{/if}
              {#if s.seat === v.creatorSeat}<span class="badge you">HOST</span>{/if}
              {#if s.isBot}<span class="badge">🤖 bot</span>{/if}
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
        {#if isCreator}
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
            {#if v.seats.length < 12}
              <button class="btn ghost" on:click={() => send('addBot')}>{$t('🤖 বট যোগ করো · Add a bot')}</button>
            {/if}
            {#if v.seats.some(s => s.isBot)}
              <button class="btn ghost" on:click={() => send('removeBot')}>{$t('➖ বট সরাও · Remove a bot')}</button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    <div style="flex:1;min-width:280px;display:flex;flex-direction:column;gap:12px">
      <div class="settings-card">
        <h3>⚙ সেটিংস • GAME SETTINGS</h3>
        
        <div class="setting">
          <span class="setting-label">📊 DIFFICULTY</span>
          <span class="seg">
            {#each [3, 4, 5] as d}
              <button class:on={v.settings.difficulty === d} disabled={!isCreator}
                on:click={() => send('updateSettings', { difficulty: d })}>{d === 3 ? 'সহজ ৩' : d === 4 ? 'মধ্যম ৪' : 'কঠিন ৫'}</button>
            {/each}
          </span>
        </div>
        
        <div class="setting">
          <span class="setting-label">🔄 ROUNDS</span>
          <button class="cycle-btn" disabled={!isCreator} on:click={cycleRounds}>
            {v.settings.rounds} <span class="chevron">›</span>
          </button>
        </div>
        
        <div class="setting">
          <span class="setting-label">👥 ACCOMPLICE + WITNESS</span>
          <span class="dropdown-style">
            {v.seats.length >= 6 ? 'Auto (6+)' : 'No (4-5)'} <span class="arrow">▼</span>
          </span>
        </div>
        
        <div class="setting">
          <span class="setting-label">⏱ PRESENTATION TIMER</span>
          <span class="seg">
            {#each timers as t}
              <button class:on={v.settings.timerSec === t} disabled={!isCreator}
                on:click={() => send('updateSettings', { timerSec: t })}>{t === null ? '∞' : t + 's'}</button>
            {/each}
          </span>
        </div>
        
        <div class="setting">
          <span class="setting-label">🎩 DETECTIVE</span>
          <span class="seg">
            <button class:on={v.settings.detectiveMode === 'random'} disabled={!isCreator}
              on:click={() => send('updateSettings', { detectiveMode: 'random' })}>RANDOM</button>
            <button class:on={v.settings.detectiveMode === 'volunteer'} disabled={!isCreator}
              on:click={() => send('updateSettings', { detectiveMode: 'volunteer' })}>VOLUNTEER</button>
          </span>
        </div>

        <div class="setting" style="border-bottom:none">
          <span class="setting-label">⚖️ VERDICT</span>
          <span class="seg">
            <button class:on={v.settings.verdictMode === 'auto'} disabled={!isCreator}
              on:click={() => send('updateSettings', { verdictMode: 'auto' })}>AUTO</button>
            <button class:on={v.settings.verdictMode === 'detective'} disabled={!isCreator}
              on:click={() => send('updateSettings', { verdictMode: 'detective' })}>DETECTIVE</button>
          </span>
        </div>

        {#if volunteerMode && v.volunteerSeat === null}
          <p class="warn-text">No volunteer chosen yet — {isCreator ? 'tap a player on the left' : 'the host will pick one'}. Falls back to random if unset.</p>
        {/if}
      </div>
      <div class="panel dim" style="font-size:.75rem">🎙 Voice: create a Discord call and share it here. In-game text chat is always available.</div>
      {#if isCreator}
        <button class="btn gold big start-plate" disabled={!canStart} on:click={() => send('start')}>
          {$t('খেলা শুরু করুন · Start investigation')}{v.seats.length < 4 ? ` (need ${4 - v.seats.length} more)` : ''}
        </button>
      {:else}
        <div class="panel dim" style="text-align:center;font-size:.8rem">Waiting for the host to start…</div>
      {/if}
      <button class="btn ghost" on:click={leave}>🚪 Leave</button>
    </div>
  </div>
</div>

<style>
  /* ── ART HOOKS (docs/ART-ASSETS.md) — all degrade gracefully when the file is absent ── */
  /* lobby scene: drop /art/bg-lobby.png to replace the default desk backdrop */
  .lobby-bg{background:
    linear-gradient(rgba(18,10,16,.55),rgba(10,5,9,.78)),
    url('/art/bg-lobby.png') center/cover no-repeat fixed}
  /* player avatars: /art/avatars/av1..av12.png over the 🕵 fallback */
  .pav{position:relative;overflow:hidden}
  .pav :global(img){position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%}
  /* brass start plate: /art/ui/btn-brass.png stretches over the gold gradient */
  .start-plate{background:
    url('/art/ui/btn-brass.png') center/100% 100% no-repeat,
    linear-gradient(180deg,var(--gold-hi),var(--gold) 55%,var(--gold-lo));
    font-family:'Noto Serif Bengali','Hind Siliguri',serif;letter-spacing:.5px;text-shadow:0 1px 0 rgba(255,255,255,.35)}

  .settings-card {
    position: relative;
    background: #ded6c5; /* Antique warm paper/parchment background */
    border: 1px solid #c9c0ae;
    color: #352e25;
    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    border-radius: 12px;
    padding: 24px 20px 20px 20px;
    margin-top: 14px; /* Space for top tab clip */
  }
  
  /* The dark brown top clip/handle of the notepad */
  .settings-card::before {
    content: "";
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 90px;
    height: 24px;
    background: linear-gradient(180deg, #44362d, #2c201a);
    border-radius: 6px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.25);
    border: 1px solid #231914;
    z-index: 10;
  }
  
  .settings-card h3 {
    font-family: 'Noto Serif Bengali', 'Hind Siliguri', serif;
    font-size: 1.15rem;
    font-weight: 800;
    color: #2b251f !important;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1.5px solid #c9c0ac;
    padding-bottom: 12px;
    letter-spacing: 0.5px;
  }
  
  .settings-card .setting {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #cbbfa9;
    font-size: 0.85rem;
    font-weight: bold;
    color: #554d3f;
  }
  
  .settings-card .setting-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
    color: #554d3f;
    letter-spacing: 0.5px;
  }
  
  .settings-card .seg {
    display: inline-flex;
    background: #cebfad; /* Beige base of segment control */
    border-radius: 8px;
    padding: 3px;
    border: 1px solid rgba(0,0,0,0.04);
  }
  
  .settings-card .seg button {
    font-family: inherit;
    font-size: 0.76rem;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 6px;
    color: #5e5445;
    border: none;
    background: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .settings-card .seg button:hover:not(:disabled) {
    color: #352e25;
  }
  
  .settings-card .seg button.on {
    background: #e2ae3c; /* Selected button gold/mustard background */
    color: #1a1206;
    font-weight: bold;
    box-shadow: 0 2px 5px rgba(0,0,0,0.18);
  }
  
  .settings-card .seg button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .settings-card .cycle-btn {
    background: none;
    border: none;
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: bold;
    color: #2b251f;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-radius: 6px;
    transition: background 0.15s ease;
  }
  
  .settings-card .cycle-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
  }
  
  .settings-card .cycle-btn:disabled {
    cursor: default;
  }
  
  .settings-card .cycle-btn .chevron {
    color: #6d6455;
    font-size: 1.1rem;
    font-weight: normal;
  }
  
  .settings-card .dropdown-style {
    font-size: 0.9rem;
    font-weight: bold;
    color: #2b251f;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    cursor: default;
  }
  
  .settings-card .dropdown-style .arrow {
    font-size: 0.62rem;
    color: #6d6455;
  }
  
  .settings-card .warn-text {
    font-size: 0.72rem;
    color: #72624e;
    margin-top: 8px;
    line-height: 1.35;
  }
</style>
