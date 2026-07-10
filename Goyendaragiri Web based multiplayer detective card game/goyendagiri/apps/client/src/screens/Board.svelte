<script lang="ts">
  import { view, chat, send } from '../lib/net';
  import { onDestroy } from 'svelte';

  $: v = $view!;
  $: me = v.seats.find(s => s.seat === v.seat)!;
  $: role = v.yourRole;
  $: isDet = role === 'detective';
  $: suspects = v.seats.filter(s => !s.isDetective);
  $: currentSeat = v.presentation?.currentSeat ?? null;
  $: myTurn = currentSeat === v.seat;
  $: canChat = v.phase !== 'presentation' ? !isDet : myTurn;
  $: pending = v.pendingAccusation;
  $: cardById = (id: string) => v.seats.flatMap(s => [...s.evidence, ...s.means]).find(c => c.id === id);
  $: nameOf = (seat: number) => v.seats.find(s => s.seat === seat)?.name ?? '?';

  // final vote round (v1.6)
  $: isFinal = v.phase === 'finalVote';
  $: awaitingVoters = v.seats.filter(s => !s.isDetective && s.hasInvestigationCard && s.connected && !v.finalActed.includes(s.seat));
  $: iMustVote = isFinal && me.hasInvestigationCard && !v.finalActed.includes(v.seat) && !isDet;

  // ── detective marker two-step confirm ──
  let pendingMark: { tileIdx: number; wordIdx: number } | null = null;
  function tapWord(tileIdx: number, wordIdx: number) {
    if (!isDet || v.phase !== 'evidence' || v.tray.markers[tileIdx] !== null || !v.swapDoneThisRound) return;
    pendingMark = pendingMark?.tileIdx === tileIdx && pendingMark?.wordIdx === wordIdx ? null : { tileIdx, wordIdx };
  }
  function confirmMarker() { if (pendingMark) { send('placeMarker', pendingMark); pendingMark = null; } }

  // ── v1.6 tile-swap overlay: deck → draw 2 → choose 1 → pick replaced tile ──
  $: needSwap = isDet && v.phase === 'evidence' && v.round > 1 && !v.swapDoneThisRound;
  let swapOpen = false;
  let chosenIdx: number | null = null;
  let replaceIdx: number | null = null;
  $: if (!needSwap && swapOpen) { swapOpen = false; chosenIdx = null; replaceIdx = null; }
  function confirmSwap() {
    if (chosenIdx === null || replaceIdx === null) return;
    send('swapChoose', { chosenIdx, discardTileIdx: replaceIdx });
    swapOpen = false; chosenIdx = null; replaceIdx = null;
  }

  // ── local presentation countdown (server authoritative) ──
  let remaining = 0; let iv: any = null;
  $: if (v.phase === 'presentation' && v.settings.timerSec !== null) restartCountdown(currentSeat);
  function restartCountdown(_seat: number | null) {
    clearInterval(iv); remaining = v.settings.timerSec ?? 0;
    iv = setInterval(() => { remaining = Math.max(0, remaining - 1); }, 1000);
  }
  onDestroy(() => clearInterval(iv));

  // ── overlays ──
  let showEasy = false;
  let showChat = false;
  let solveOpen = false;
  let sSuspect: number | null = null; let sEv: string | null = null; let sMn: string | null = null;
  $: sSeat = sSuspect !== null ? v.seats.find(x => x.seat === sSuspect) : null;
  function openSolve() { sSuspect = null; sEv = null; sMn = null; solveOpen = true; }
  function accuse() {
    if (sSuspect === null || !sEv || !sMn) return;
    send('accuse', { suspectSeat: sSuspect, evidenceId: sEv, meansId: sMn });
    solveOpen = false;
  }
  $: canSolve = !isDet && me.hasInvestigationCard && !pending &&
    (v.phase === 'evidence' || v.phase === 'presentation' || (isFinal && iMustVote));

  let chatText = '';
  function sendChat() { if (chatText.trim()) { send('chat', { text: chatText }); chatText = ''; } }

  let openSuspect: number | null = null;
  $: openSeat = openSuspect !== null ? v.seats.find(x => x.seat === openSuspect) : null;

  // witness hunt
  let huntPick: number | null = null;
  $: murdererSeatPub = v.seats.find(s => s.revealedRole === 'murderer');
  $: accompliceSeatPub = v.seats.find(s => s.revealedRole === 'accomplice');
  $: huntTargets = v.seats.filter(s => !s.isDetective && s.revealedRole !== 'murderer' && s.revealedRole !== 'accomplice');
</script>

<div class="screen">
  <div class="topbar">
    <span class="logo">🎩 গোয়েন্দাগিরি</span>
    <span class="chip">
      {v.phase === 'evidence' ? `তদন্ত · Round ${v.round} — Evidence` :
       v.phase === 'presentation' ? `Round ${v.round} — Presentation` :
       isFinal ? '⚖️ চূড়ান্ত সিদ্ধান্ত · Final decision' : '🕯 Witness hunt!'}
    </span>
    <span style="display:flex;gap:4px">
      {#each Array(v.settings.rounds) as _, i}
        <i style="width:8px;height:8px;border-radius:50%;background:{i < v.round ? 'var(--gold)' : 'var(--line)'}"></i>
      {/each}
    </span>
    {#if pending}
      <span class="timer warn">⏸ গোয়েন্দা সিদ্ধান্ত নিচ্ছেন · Detective is deciding…</span>
    {:else if v.phase === 'presentation'}
      <span class="timer" class:warn={remaining <= 10 && v.settings.timerSec !== null}>
        🎤 {nameOf(currentSeat ?? -1)}
        {v.settings.timerSec === null ? '· ∞' : `· 0:${String(remaining).padStart(2, '0')}`}
      </span>
    {:else if isFinal}
      <span class="timer">🗳 {awaitingVoters.length} vote{awaitingVoters.length === 1 ? '' : 's'} left</span>
    {:else}
      <span class="timer">{isDet ? (needSwap ? '🔄 টাইল বদলাও · swap a tile' : 'মার্কার বসাও · place markers') : 'আলোচনা চলছে · discuss freely'}</span>
    {/if}
  </div>

  <div class="board-wrap">
    <div class="board-col scroll">
      {#if v.phase === 'witnessHunt'}
        <div class="panel" style="border-color:var(--danger);margin:12px 14px 0">
          <h3 style="color:var(--danger)">🕯 সাক্ষী শিকার · The witness hunt</h3>
          <p style="font-size:.8rem">অপরাধ সমাধান হয়েছে! <b>{murdererSeatPub?.name}</b> (খুনী){#if accompliceSeatPub}&nbsp;ও <b>{accompliceSeatPub.name}</b> (সহযোগী){/if} প্রকাশিত। তারা সাক্ষীকে খুঁজে পেলে খুনী দল জিতবে।</p>
          {#if role === 'murderer'}
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
              {#each huntTargets as t}
                <button class="btn ghost" style="border-color:{huntPick === t.seat ? 'var(--danger)' : 'var(--line)'}"
                  on:click={() => huntPick = t.seat}>{t.name}</button>
              {/each}
            </div>
            <button class="btn danger" style="margin-top:10px" disabled={huntPick === null}
              on:click={() => send('pickWitness', { targetSeat: huntPick })}>এই সেই সাক্ষী! · Accuse the witness</button>
          {:else if role === 'accomplice'}
            <p class="dim" style="font-size:.75rem;margin-top:8px">খুনীকে চ্যাটে পরামর্শ দাও — চূড়ান্ত সিদ্ধান্ত খুনীর।</p>
          {/if}
        </div>
      {/if}

      {#if isFinal}
        <div class="panel" style="border-color:var(--gold);margin:12px 14px 0">
          <h3>⚖️ চূড়ান্ত সিদ্ধান্ত · Final decision round</h3>
          <p style="font-size:.8rem">তিন রাউন্ড শেষ। যাদের তদন্ত কার্ড অব্যবহৃত, তারা এখন ভোট দেবে — অথবা বিরত থাকবে। All rounds are over: unspent investigation cards must now vote or abstain.</p>
          <p class="dim" style="font-size:.72rem;margin-top:6px">অপেক্ষায় · waiting on:
            {#each awaitingVoters as w, i}{i > 0 ? ', ' : ' '}<b class="goldtext">{w.name}</b>{/each}
          </p>
          {#if iMustVote}
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
              <button class="btn danger" disabled={!!pending} on:click={openSolve}>🔍 ভোট দাও · Cast my vote</button>
              <button class="btn ghost" disabled={!!pending} on:click={() => send('abstain')}>🤐 বিরত থাকো · Abstain</button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- tile board -->
      <div class="tiles">
        {#each v.tray.tiles as tile, ti}
          <div class="tile" class:special={tile.kind !== 'scene'} class:replace-target={swapOpen && chosenIdx !== null && ti >= 2}>
            <h4>{tile.bn} <em>{tile.en}</em></h4>
            <div class="clues">
              {#each tile.words as w, wi}
                <span class="clue"
                  class:marked={v.tray.markers[ti] === wi}
                  class:pending-confirm={pendingMark?.tileIdx === ti && pendingMark?.wordIdx === wi}
                  class:pickable={isDet && v.phase === 'evidence' && v.tray.markers[ti] === null && v.swapDoneThisRound}
                  role="button" tabindex="0"
                  on:click={() => tapWord(ti, wi)} on:keydown={e => e.key === 'Enter' && tapWord(ti, wi)}>
                  {w.bn}<small>{w.en}</small>
                </span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      {#if needSwap}
        <div style="padding:0 14px"><button class="btn gold" on:click={() => swapOpen = true}>🃏 নতুন টাইল তোলো · Draw new tiles</button></div>
      {/if}
      {#if isDet && pendingMark}
        <div style="padding:8px 14px"><button class="btn gold" on:click={confirmMarker}>🎩 মার্কার নিশ্চিত করো · Confirm marker (final!)</button></div>
      {/if}
      {#if isDet && v.phase === 'presentation'}
        <div style="padding:8px 14px"><button class="btn ghost" on:click={() => send('forcePass')}>⏭ Force-pass current presenter</button></div>
      {/if}
      {#if myTurn}
        <div style="padding:8px 14px"><button class="btn gold" on:click={() => send('pass')}>✋ শেষ · Pass — end my presentation</button></div>
      {/if}

      <p class="dim rail-label">সন্দেহভাজন · Suspects</p>
      <div class="suspect-grid">
        {#each suspects as s}
          <div class="seat-card" class:speaking={s.seat === currentSeat}
            role="button" tabindex="0" on:click={() => openSuspect = openSuspect === s.seat ? null : s.seat}
            on:keydown={e => e.key === 'Enter' && (openSuspect = s.seat)}>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:.78rem">
              <span class="avatar">🕵</span><b>{s.name}</b>
              {#if s.seat === currentSeat}<span style="font-size:.62rem">🎤</span>{/if}
              {#if s.revealedRole}<span class="badge spent">{s.revealedRole}</span>{/if}
              <span class="badge" class:spent={!s.hasInvestigationCard} class:you={s.seat === v.seat} style="margin-left:auto">
                {s.seat === v.seat ? 'YOU' : s.hasInvestigationCard ? '🔍' : '🔍✗'}
              </span>
            </div>
            <div style="display:flex;gap:3px;flex-wrap:wrap">
              {#each [...s.evidence, ...s.means] as c}
                <div class="mini-card {c.type === 'evidence' ? 'ev' : 'mn'}"><b>{c.bn}</b>{c.en}</div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      {#if v.secret.solution}
        <div class="hud panel">
          <span class="dim" style="font-size:.6rem">🗂 CASE MEMO</span>
          {#each [v.secret.solution.evidenceId, v.secret.solution.meansId].map(cardById) as c}
            {#if c}<span style="font-size:.68rem;color:{c.type === 'evidence' ? 'var(--evidence)' : 'var(--means)'}">{c.bn}</span>{/if}
          {/each}
          {#if v.secret.murdererSeat !== undefined}<span class="dim" style="font-size:.62rem">🗡 {nameOf(v.secret.murdererSeat)}</span>{/if}
        </div>
      {:else if role === 'witness' && v.secret.murdererSeat !== undefined}
        <div class="hud panel"><span class="dim" style="font-size:.6rem">🕯 YOU SAW:</span><span style="font-size:.7rem;color:var(--danger)">{nameOf(v.secret.murdererSeat)}</span></div>
      {/if}
    </div>

    <div class="side-col">
      <div class="chatlog scroll">
        {#each v.log.slice(-30) as line}<div class="sys">{line}</div>{/each}
        {#each $chat as m}<div class="msg"><b class="goldtext">{m.name}:</b> {m.text}</div>{/each}
      </div>
      <div style="display:flex;gap:6px;padding:10px;border-top:1px solid var(--line)">
        <input class="input" bind:value={chatText} placeholder={canChat ? 'লিখুন… / type…' : '🔇 muted'} disabled={!canChat}
          on:keydown={e => e.key === 'Enter' && sendChat()} />
        <button class="btn gold" on:click={sendChat} disabled={!canChat}>➤</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;padding:10px;border-top:1px solid var(--line)">
        <button class="btn ghost" on:click={() => showEasy = true}>🧿 সহজ তদন্ত · Easy Investigate</button>
        {#if canSolve}
          <button class="btn danger" on:click={openSolve}>🔍 অপরাধের সমাধান · Solve the crime</button>
        {/if}
      </div>
    </div>
  </div>

  <div class="bottom-bar">
    {#if canSolve}<button class="btn danger" on:click={openSolve}>🔍</button>{/if}
    {#if iMustVote}<button class="btn ghost" on:click={() => send('abstain')}>🤐</button>{/if}
    <button class="btn ghost" on:click={() => showEasy = true}>🧿</button>
    <button class="btn ghost" on:click={() => showChat = !showChat}>💬</button>
  </div>
  {#if showChat}
    <div class="mobile-chat panel">
      <div class="chatlog scroll" style="max-height:30vh">
        {#each v.log.slice(-10) as line}<div class="sys">{line}</div>{/each}
        {#each $chat.slice(-20) as m}<div class="msg"><b class="goldtext">{m.name}:</b> {m.text}</div>{/each}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <input class="input" bind:value={chatText} disabled={!canChat} placeholder={canChat ? 'লিখুন…' : '🔇 muted'} on:keydown={e => e.key === 'Enter' && sendChat()} />
        <button class="btn gold" on:click={sendChat} disabled={!canChat}>➤</button>
      </div>
    </div>
  {/if}
  {#if openSeat}
    <div class="mobile-sheet panel">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.85rem">
        <span class="avatar">🕵</span><b>{openSeat.name}</b>
        <button class="btn ghost" style="margin-left:auto;padding:2px 10px" on:click={() => openSuspect = null}>✕</button>
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        {#each [...openSeat.evidence, ...openSeat.means] as c}
          <div class="mini-card {c.type === 'evidence' ? 'ev' : 'mn'}" style="width:56px;height:76px;font-size:.56rem"><b>{c.bn}</b>{c.en}</div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- v1.6 VERDICT POPUP — detective only -->
  {#if pending && isDet}
    <div class="modal-back">
      <div class="modal" role="dialog" tabindex="-1" style="border-color:var(--gold)">
        <h2>⚖️ তোমার রায় · Your verdict, Detective</h2>
        <p style="font-size:.9rem;margin:10px 0">
          <b class="goldtext">{nameOf(pending.bySeat)}</b> votes
          <b style="color:var(--danger)">{nameOf(pending.suspectSeat)}</b> as the killer, with:
        </p>
        <div style="display:flex;gap:10px;margin-bottom:14px">
          {#each [pending.evidenceId, pending.meansId].map(cardById) as c}
            {#if c}<div class="big-card {c.type === 'evidence' ? 'ev' : 'mn'}"><b>{c.bn}</b>{c.en}</div>{/if}
          {/each}
        </div>
        <p class="dim" style="font-size:.75rem;margin-bottom:14px">তুমি কি একমত? Do you agree? তোমার কথাই শেষ কথা — the game will not overrule you.</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn ghost" on:click={() => send('verdict', { agree: false })}>✗ না · No</button>
          <button class="btn gold" on:click={() => send('verdict', { agree: true })}>✓ হ্যাঁ · Yes</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- v1.6 TILE-SWAP OVERLAY — detective only -->
  {#if swapOpen && needSwap}
    <div class="modal-back">
      <div class="modal" role="dialog" tabindex="-1" style="max-width:720px;text-align:center">
        <h2>🃏 নতুন সূত্র · Draw new scene tiles</h2>
        {#if !v.swapDraw}
          <p class="dim" style="font-size:.78rem;margin:10px 0 16px">ডেকে চাপ দাও — দুটি টাইল উঠবে, একটি বেছে নেবে। Tap the deck: two tiles rise, you keep one.</p>
          <button class="deck" on:click={() => send('swapDraw')} aria-label="draw from deck">
            <span class="deck-card c3"></span><span class="deck-card c2"></span><span class="deck-card c1">🎩</span>
          </button>
        {:else}
          <p class="dim" style="font-size:.78rem;margin:8px 0">১ · একটি টাইল বাছো · pick ONE tile to keep</p>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
            {#each v.swapDraw as t, i}
              <div class="draw-tile" class:chosen={chosenIdx === i} role="button" tabindex="0"
                on:click={() => chosenIdx = i} on:keydown={e => e.key === 'Enter' && (chosenIdx = i)}
                style="animation-delay:{i * 0.25}s">
                <h4 style="color:var(--gold);font-size:.85rem;margin-bottom:6px">{t.bn} <em class="dim" style="font-style:normal;font-size:.65rem">{t.en}</em></h4>
                <div class="clues" style="text-align:left">
                  {#each t.words as w}<span class="clue">{w.bn}<small>{w.en}</small></span>{/each}
                </div>
              </div>
            {/each}
          </div>
          {#if chosenIdx !== null}
            <p class="dim" style="font-size:.78rem;margin:14px 0 8px">২ · কোন টাইলের জায়গায় বসবে? · which scene tile does it replace?</p>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
              {#each v.tray.tiles as t, ti}
                {#if ti >= 2}
                  <button class="btn ghost" style="border-color:{replaceIdx === ti ? 'var(--gold)' : 'var(--line)'};color:{replaceIdx === ti ? 'var(--gold)' : 'var(--ink)'}"
                    on:click={() => replaceIdx = ti}>{t.bn}</button>
                {/if}
              {/each}
            </div>
            <button class="btn gold" style="margin-top:16px;min-width:220px" disabled={replaceIdx === null} on:click={confirmSwap}>
              🔄 বদলে দাও · Swap it in
            </button>
          {/if}
        {/if}
      </div>
    </div>
  {/if}

  <!-- Easy Investigate overlay -->
  {#if showEasy}
    <div class="modal-back" role="button" tabindex="0" on:click={() => showEasy = false} on:keydown={e => e.key === 'Escape' && (showEasy = false)}>
      <div class="modal" style="max-width:900px" role="dialog" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
        <h2>🧿 সহজ তদন্ত · Easy Investigate <button class="btn ghost" style="float:right;padding:2px 10px" on:click={() => showEasy = false}>✕</button></h2>
        <p class="dim" style="font-size:.7rem;margin-bottom:10px">গোয়েন্দার সূত্র · only the marked words:</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
          {#each v.tray.tiles as t, i}
            <span class="chip" style="border-style:{v.tray.markers[i] === null ? 'dashed' : 'solid'}">
              <small class="dim">{t.bn}</small> → <b>{v.tray.markers[i] !== null ? `${t.words[v.tray.markers[i]].bn} / ${t.words[v.tray.markers[i]].en}` : '…'}</b>
            </span>
          {/each}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">
          {#each suspects as s}
            <div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:8px">
              <div style="font-size:.76rem;margin-bottom:6px"><b>{s.name}</b> {#if !s.hasInvestigationCard}<span class="badge spent">🔍✗</span>{/if}</div>
              <div style="display:flex;flex-wrap:wrap;gap:3px">
                {#each [...s.evidence, ...s.means] as c}
                  <span style="font-size:.6rem;border-radius:5px;padding:2px 6px;color:#141007;background:{c.type === 'evidence' ? 'var(--evidence)' : 'var(--means)'}">{c.bn}</span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Solve modal -->
  {#if solveOpen}
    <div class="modal-back" role="button" tabindex="0" on:click={() => solveOpen = false} on:keydown={e => e.key === 'Escape' && (solveOpen = false)}>
      <div class="modal" role="dialog" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
        <h2>🔍 অপরাধের সমাধান · Solve the crime</h2>
        <p style="font-size:.75rem;color:var(--danger);margin-bottom:12px">⚠️ এটি তোমার একমাত্র তদন্ত কার্ড খরচ করবে — ভুল হলে চিরতরে। Consumes your only Investigation Card.</p>
        <p class="dim" style="font-size:.72rem;margin-bottom:6px">১ · সন্দেহভাজন · suspect (self-accusation allowed)</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          {#each suspects as s}
            <button class="btn ghost" style="border-color:{sSuspect === s.seat ? 'var(--gold)' : 'var(--line)'};color:{sSuspect === s.seat ? 'var(--gold)' : 'var(--ink)'}"
              on:click={() => { sSuspect = s.seat; sEv = null; sMn = null; }}>{s.name}{s.seat === v.seat ? ' (you)' : ''}</button>
          {/each}
        </div>
        {#if sSeat}
          <p class="dim" style="font-size:.72rem;margin-bottom:6px">২ · তার ১টি প্রমাণ · one evidence</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
            {#each sSeat.evidence as c}
              <div class="big-card ev" class:selected={sEv === c.id} style="width:84px;height:112px" role="button" tabindex="0"
                on:click={() => sEv = c.id} on:keydown={e => e.key === 'Enter' && (sEv = c.id)}><b>{c.bn}</b>{c.en}</div>
            {/each}
          </div>
          <p class="dim" style="font-size:.72rem;margin-bottom:6px">৩ · তার ১টি পদ্ধতি · one means</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            {#each sSeat.means as c}
              <div class="big-card mn" class:selected={sMn === c.id} style="width:84px;height:112px" role="button" tabindex="0"
                on:click={() => sMn = c.id} on:keydown={e => e.key === 'Enter' && (sMn = c.id)}><b>{c.bn}</b>{c.en}</div>
            {/each}
          </div>
        {/if}
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">
          <button class="btn ghost" on:click={() => solveOpen = false}>বাতিল · Cancel</button>
          <button class="btn danger" disabled={sSuspect === null || !sEv || !sMn} on:click={accuse}>অভিযোগ! · Accuse!</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .board-wrap{flex:1;display:flex;min-height:0}
  .board-col{flex:1;min-width:0;position:relative;display:flex;flex-direction:column}
  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 14px}
  .rail-label{font-size:.68rem;padding:2px 14px;text-transform:uppercase;letter-spacing:1px}
  .suspect-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:4px 14px 14px;overflow-y:auto;max-height:250px}
  .seat-card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px;min-width:0;cursor:pointer}
  .seat-card.speaking{border-color:var(--gold);box-shadow:0 0 12px rgba(224,168,60,.25)}
  .side-col{width:300px;border-left:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;flex-shrink:0}
  .chatlog{flex:1;padding:10px 12px;display:flex;flex-direction:column;gap:7px}
  .chatlog .sys{font-size:.68rem;color:var(--dim);font-style:italic;border-left:2px solid var(--gold-dim);padding-left:8px}
  .chatlog .msg{font-size:.76rem;line-height:1.35}
  .hud{position:absolute;top:8px;right:8px;display:flex;gap:6px;align-items:center;padding:6px 10px;border-color:var(--danger);z-index:10}
  /* deck + draw animation */
  .deck{position:relative;width:150px;height:200px;margin:8px auto 18px;background:none;border:none;cursor:pointer;display:block}
  .deck-card{position:absolute;inset:0;border-radius:12px;border:2px solid var(--gold-dim);
    background:repeating-linear-gradient(45deg,#2b1c28,#2b1c28 8px,#3a2636 8px,#3a2636 16px);
    display:flex;align-items:center;justify-content:center;font-size:2rem}
  .deck-card.c2{transform:translate(5px,-5px) rotate(2deg)}
  .deck-card.c3{transform:translate(10px,-10px) rotate(4deg)}
  .deck:hover .deck-card.c1{transform:translateY(-6px);box-shadow:0 10px 24px rgba(217,169,78,.3)}
  .deck-card{transition:transform .2s}
  .draw-tile{background:linear-gradient(160deg,var(--panel2),var(--panel));border:2px solid var(--line);border-radius:12px;padding:12px;width:260px;cursor:pointer;
    animation:riseIn .6s cubic-bezier(.3,.7,.3,1) backwards}
  .draw-tile.chosen{border-color:var(--gold);box-shadow:0 0 20px rgba(217,169,78,.4)}
  @keyframes riseIn{from{transform:translateY(60px) rotateX(50deg);opacity:0}to{transform:none;opacity:1}}
  .tile.replace-target{outline:1px dashed var(--gold-dim)}
  .bottom-bar{display:none}
  .mobile-chat,.mobile-sheet{display:none}
  @media (max-width:1023px){
    .side-col{display:none}
    .tiles{grid-template-columns:repeat(2,1fr);gap:8px;padding:10px}
    .suspect-grid{grid-template-columns:repeat(2,1fr);max-height:none}
    .bottom-bar{display:flex;gap:8px;padding:10px;background:var(--panel);border-top:1px solid var(--line)}
    .bottom-bar .btn{flex:1;padding:11px 4px}
    .mobile-chat{display:block;position:fixed;bottom:64px;left:8px;right:8px;z-index:40}
    .mobile-sheet{display:block;position:fixed;bottom:64px;left:8px;right:8px;z-index:39}
    .hud{position:static;margin:8px 14px}
  }
</style>
