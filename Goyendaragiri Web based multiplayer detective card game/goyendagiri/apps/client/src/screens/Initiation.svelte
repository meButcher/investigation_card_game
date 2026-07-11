<script lang="ts">
  import { view, send } from '../lib/net';
  import { zoomable } from '../lib/cardZoom';
  $: v = $view!;
  $: me = v.seats.find(s => s.seat === v.seat)!;
  $: amReady = me.ready;
  const roleInfo: Record<string, { icon: string; bn: string; en: string }> = {
    detective: { icon: '🔍', bn: 'গোয়েন্দা', en: 'Detective — guide them with markers; you may not chat' },
    murderer: { icon: '🗡', bn: 'খুনী', en: 'Murderer — you will secretly pick the solution' },
    accomplice: { icon: '🎭', bn: 'খুনীর সহযোগী', en: 'Accomplice — you will learn the killer & solution' },
    witness: { icon: '🕯', bn: 'সাক্ষী', en: 'Witness — you will learn WHO, stay hidden' },
    investigator: { icon: '🧐', bn: 'তদন্তকারী', en: 'Investigator — find the exact card pair' },
  };
  $: info = roleInfo[v.yourRole];
</script>

<div class="screen">
  <div class="topbar">
    <span class="logo">🎩 গোয়েন্দাগিরি</span>
    <span class="chip">প্রস্তুতি · Initiation</span>
    <span class="timer">{v.seats.filter(s => s.ready).length} / {v.seats.length} ready</span>
  </div>
  <div class="scroll init-scroll">
    <div class="ready-bar panel">
      <span class="ready-title">প্রস্তুত? · Ready — {v.seats.filter(s => s.ready).length}/{v.seats.length}</span>
      {#each v.seats as s}
        <span class="ready-chip">
          <span class="avatar">🕵</span>{s.name}
          <span style="color:{s.ready ? 'var(--good)' : 'var(--dim)'}">{s.ready ? '✓' : '…'}</span>
        </span>
      {/each}
    </div>

    <div class="flip-card"><div class="flip-inner">
      <div class="face back"><span style="font-size:2rem">🎩</span></div>
      <div class="face front">
        <span style="font-size:2.4rem">{info.icon}</span>
        <span class="serif" style="font-weight:800;color:var(--gold);font-size:1.05rem">{info.bn}</span>
        <span class="dim" style="font-size:.64rem;text-align:center">{info.en}</span>
      </div>
    </div></div>

    {#if v.yourRole !== 'detective'}
      <p class="dim" style="font-size:.8rem;margin:14px 0 8px">তোমার টেবিলের কার্ড · Your face-up cards <span style="font-size:.66rem">— hold to zoom</span></p>
      <div class="hand">
        {#each [...me.evidence, ...me.means] as c, i}
          <div class="hand-card {c.type === 'evidence' ? 'ev' : 'mn'}"
               use:zoomable={c}
               style="animation:dealIn .5s ease {i * 0.12}s backwards">
            <b>{c.bn}</b>{c.en}
          </div>
        {/each}
      </div>
    {:else}
      <p class="dim" style="font-size:.75rem;max-width:400px;text-align:center;margin-top:10px">
        গোয়েন্দা কার্ড পায় না — সবার কার্ড দেখে রাখো। You receive no cards; study everyone's layouts.
      </p>
    {/if}

    <button class="btn gold" style="margin-top:20px;min-width:220px" disabled={amReady} on:click={() => send('ready')}>
      {amReady ? '✓ অপেক্ষা করছি · waiting for others' : '✓ প্রস্তুত · I\'m ready'}
    </button>
  </div>
</div>

<style>
  .init-scroll{display:flex;flex-direction:column;align-items:center;padding:16px;gap:4px}
  .ready-bar{width:100%;max-width:940px;display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;padding:8px 12px}
  .ready-title{width:100%;font-size:.6rem;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-bottom:2px}
  .ready-chip{display:inline-flex;align-items:center;gap:5px;font-size:.72rem;
    background:var(--panel3);border:1px solid var(--line);border-radius:999px;padding:3px 9px;white-space:nowrap}
  .ready-chip .avatar{width:18px;height:18px;font-size:.6rem}
  .flip-card{width:clamp(150px,40vw,190px);aspect-ratio:5/7;perspective:900px;margin-top:14px}
  .flip-inner{width:100%;height:100%;position:relative;transform-style:preserve-3d;animation:twirl 1.8s cubic-bezier(.3,.7,.3,1) forwards}
  @keyframes twirl{0%{transform:rotateY(540deg) scale(.55)}70%{transform:rotateY(0) scale(1.07)}100%{transform:rotateY(0) scale(1)}}
  .face{position:absolute;inset:0;backface-visibility:hidden;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:10px}
  .face.back{background:repeating-linear-gradient(45deg,#2b1c28,#2b1c28 8px,#3a2636 8px,#3a2636 16px);border:2px solid var(--gold-dim);transform:rotateY(180deg)}
  .face.front{background:linear-gradient(165deg,#422b3e,#241722);border:2px solid var(--gold);box-shadow:0 0 26px rgba(217,169,78,.3)}
  @keyframes dealIn{from{transform:translateY(-40px) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}
</style>
