<script lang="ts">
  import { view, send } from '../lib/net';
  $: v = $view!;
  $: me = v.seats.find(s => s.seat === v.seat)!;
  $: role = v.yourRole;
  $: hasExtras = v.seats.length >= 6;
  $: n = v.night;

  // murderer's linked pick view
  let pickEv: string | null = null;
  let pickMn: string | null = null;
  $: canConfirm = pickEv && pickMn;

  // detective console beats
  $: beats = [
    { label: 'ভূমিকা ঘোষণা · Detective announced', done: true },
    { label: 'খুনীকে ডাকা · Call the killer', done: n.killerDone, action: () => send('callRole', { target: 'murderer' }) },
    ...(hasExtras ? [
      { label: 'সহযোগীকে ডাকা · Call the accomplice', done: n.accompliceDone, action: () => send('callRole', { target: 'accomplice' }) },
      { label: 'সাক্ষীকে ডাকা · Call the witness', done: n.witnessDone, action: () => send('callRole', { target: 'witness' }) },
    ] : []),
    { label: 'তদন্ত শুরু · Begin investigation', done: false, action: () => send('beginDay') },
  ];
  $: nightDone = hasExtras ? n.killerDone && n.accompliceDone && n.witnessDone : n.killerDone;
  $: nextBeat = beats.find(b => !b.done && b.action);
  $: solutionCards = v.secret.solution
    ? v.seats.flatMap(s => [...s.evidence, ...s.means]).filter(c => c.id === v.secret.solution!.evidenceId || c.id === v.secret.solution!.meansId)
    : [];
  $: murdererName = v.secret.murdererSeat !== undefined ? v.seats.find(s => s.seat === v.secret.murdererSeat)?.name : null;
</script>

<div class="screen night-bg">
  <div class="topbar">
    <span class="logo">🎩 গোয়েন্দাগিরি</span>
    <span class="chip">খুন পর্ব · Night</span>
  </div>
  <div class="scroll" style="display:flex;flex-direction:column;align-items:center;padding:22px 16px">

    {#if role === 'detective'}
      <!-- Detective console -->
      <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;max-width:900px;width:100%">
        <div class="panel" style="flex:1.2;min-width:280px">
          <h3>🌙 রাতের ধারা · Night script — you set the pace</h3>
          {#each beats as b, i}
            <div style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:9px;font-size:.8rem;
              opacity:{b.done ? 0.55 : 1};background:{!b.done && b === nextBeat ? 'var(--panel3)' : 'transparent'}">
              <span style="width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:700;
                background:{b.done ? 'var(--good)' : 'var(--line)'};color:{b.done ? '#04150c' : 'var(--ink)'}">{b.done ? '✓' : i + 1}</span>
              {b.label}
            </div>
          {/each}
          {#if v.phase === 'nightIntro' && !n.awaitingReveal}
            {#if !nightDone && nextBeat}
              <button class="btn gold big" style="margin-top:10px" on:click={nextBeat.action}>📣 {nextBeat.label}</button>
            {:else if nightDone}
              <button class="btn gold big" style="margin-top:10px" on:click={() => send('beginDay')}>🌅 তদন্ত শুরু · Begin investigation</button>
            {/if}
          {:else if v.phase === 'nightIntro' && n.awaitingReveal}
            <p class="dim" style="font-size:.75rem;margin-top:10px">Waiting for the {n.awaitingReveal} to tap Reveal…</p>
          {:else if v.phase === 'nightKiller'}
            <p class="dim" style="font-size:.75rem;margin-top:10px">খুনী কার্ড বাছছে · The killer is choosing…</p>
            {#if v.secret.solution}
              <button class="btn gold big" style="margin-top:8px" on:click={() => send('dismiss')}>🙈 চোখ বন্ধ করাও · Dismiss the killer</button>
            {/if}
          {:else if v.phase === 'nightAccomplice' || v.phase === 'nightWitness'}
            <button class="btn gold big" style="margin-top:10px" on:click={() => send('dismiss')}>🙈 বিদায় দাও · Dismiss</button>
          {/if}
        </div>
        {#if v.secret.solution && murdererName}
          <div class="panel" style="flex:1;min-width:240px;border-color:var(--danger)">
            <h3 style="color:var(--danger)">🗂 কেস মেমো · Case memo</h3>
            <p style="font-size:.85rem;margin-bottom:8px"><span class="avatar">🗡</span> <b>{murdererName}</b> <span class="dim">— the killer</span></p>
            <div style="display:flex;gap:5px">
              {#each solutionCards as c}
                <div class="mini-card {c.type === 'evidence' ? 'ev' : 'mn'}"><b>{c.bn}</b>{c.en}</div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

    {:else if v.night.awaitingYou}
      <!-- called player: reveal button ONLY on their screen -->
      <div class="moon">🌙</div>
      <h2 class="goldtext" style="margin-bottom:6px">গোয়েন্দা তোমাকে ডাকছেন…</h2>
      <p class="dim" style="font-size:.8rem;margin-bottom:18px">The detective calls on you. Open your eyes.</p>
      <button class="btn gold" style="min-width:220px" on:click={() => send('revealAck')}>👁 নিজেকে প্রকাশ করো · Reveal</button>

    {:else if v.phase === 'nightKiller' && role === 'murderer'}
      <!-- killer's linked pick view -->
      <h2 class="goldtext">তোমার অপরাধ সাজাও · Pick the solution</h2>
      <p class="dim" style="font-size:.75rem;margin:4px 0 14px">১টি প্রমাণ + ১টি পদ্ধতি — শুধু গোয়েন্দা (ও সহযোগী) দেখবে। Only the detective (and accomplice) will see this.</p>
      <p class="dim" style="font-size:.72rem;margin-bottom:6px">তোমার প্রমাণ · Your evidence — pick 1</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
        {#each me.evidence as c}
          <div class="big-card ev" class:selected={pickEv === c.id} role="button" tabindex="0"
            on:click={() => pickEv = c.id} on:keydown={e => e.key === 'Enter' && (pickEv = c.id)}>
            <b>{c.bn}</b>{c.en}<small class="dim">প্রমাণ · Evidence</small>
          </div>
        {/each}
      </div>
      <p class="dim" style="font-size:.72rem;margin:12px 0 6px">খুনের পদ্ধতি · Your means — pick 1</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
        {#each me.means as c}
          <div class="big-card mn" class:selected={pickMn === c.id} role="button" tabindex="0"
            on:click={() => pickMn = c.id} on:keydown={e => e.key === 'Enter' && (pickMn = c.id)}>
            <b>{c.bn}</b>{c.en}<small>পদ্ধতি · Means</small>
          </div>
        {/each}
      </div>
      <button class="btn gold" style="margin-top:18px;min-width:220px" disabled={!canConfirm}
        on:click={() => send('pickSolution', { evidenceId: pickEv, meansId: pickMn })}>নিশ্চিত করো · Confirm</button>

    {:else if v.phase === 'nightAccomplice' && role === 'accomplice' && v.secret.solution}
      <h2 class="goldtext">🗂 কেস মেমো · Your case memo</h2>
      <p style="margin:8px 0"><b>{murdererName}</b> <span class="dim">is the killer</span></p>
      <div style="display:flex;gap:6px">
        {#each solutionCards as c}
          <div class="big-card {c.type === 'evidence' ? 'ev' : 'mn'}"><b>{c.bn}</b>{c.en}</div>
        {/each}
      </div>
      <p class="dim" style="font-size:.72rem;margin-top:12px">মনে রেখো — এই মেমো খেলার শেষ পর্যন্ত তোমার HUD-এ থাকবে। This stays on your HUD all game.</p>

    {:else if v.phase === 'nightWitness' && role === 'witness' && murdererName}
      <h2 class="goldtext">🕯 তুমি দেখে ফেলেছ…</h2>
      <p style="margin:10px 0;font-size:1.1rem"><b>{murdererName}</b> <span class="dim">— খুনী · is the murderer</span></p>
      <p class="dim" style="font-size:.72rem;max-width:360px;text-align:center">তুমি জানো কে — কিন্তু কীভাবে নয়। পরিচয় গোপন রাখো: ধরা পড়লে খুনী দল জেতে। You know WHO, not HOW. Stay hidden — if they find you at the end, they win.</p>

    {:else}
      <!-- uniform waiting screen: identical for every bystander (§3.4) -->
      <div class="moon">🌙</div>
      <h2 class="goldtext" style="text-align:center">গোয়েন্দা ঘটনাস্থল বিশ্লেষণ করছেন…</h2>
      <p class="dim" style="font-size:.8rem">Detective is analyzing the scene of murder</p>
    {/if}
  </div>
</div>

<style>
  .night-bg{background:linear-gradient(rgba(18,10,16,.78),rgba(10,5,9,.9)),url('/art/bg-night.webp') center/cover no-repeat,radial-gradient(ellipse at 50% 0%,#241426 0%,#0a0509 70%)}
  .moon{font-size:2.4rem;margin-bottom:8px;filter:drop-shadow(0 0 18px rgba(224,200,120,.5))}
</style>
