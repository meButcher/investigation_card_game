<script lang="ts">
  import { view, send } from '../lib/net';
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
  <div class="scroll" style="display:flex;flex-direction:column;align-items:center;padding:18px;position:relative">
    <div class="panel" style="position:absolute;top:12px;left:12px;padding:8px;font-size:.66rem;max-height:44%;overflow-y:auto;z-index:5">
      <div class="dim" style="text-transform:uppercase;letter-spacing:1px;font-size:.6rem;margin-bottom:4px">প্রস্তুত? · Ready</div>
      {#each v.seats as s}
        <div style="display:flex;align-items:center;gap:6px;min-width:120px;padding:1px 0">
          <span class="avatar" style="width:18px;height:18px;font-size:.6rem">🕵</span>{s.name}
          <span style="margin-left:auto;color:{s.ready ? 'var(--good)' : 'var(--dim)'}">{s.ready ? '✓' : '…'}</span>
        </div>
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
      <p class="dim" style="font-size:.72rem;margin:10px 0 6px">তোমার টেবিলের কার্ড · Your face-up cards</p>
      <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:center;max-width:560px">
        {#each [...me.evidence, ...me.means] as c, i}
          <div class="mini-card {c.type === 'evidence' ? 'ev' : 'mn'}" style="animation:dealIn .5s ease {i * 0.12}s backwards">
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
  .flip-card{width:150px;height:210px;perspective:900px;margin-top:26px}
  .flip-inner{width:100%;height:100%;position:relative;transform-style:preserve-3d;animation:twirl 1.8s cubic-bezier(.3,.7,.3,1) forwards}
  @keyframes twirl{0%{transform:rotateY(540deg) scale(.55)}70%{transform:rotateY(0) scale(1.07)}100%{transform:rotateY(0) scale(1)}}
  .face{position:absolute;inset:0;backface-visibility:hidden;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:10px}
  .face.back{background:repeating-linear-gradient(45deg,#2b1c28,#2b1c28 8px,#3a2636 8px,#3a2636 16px);border:2px solid var(--gold-dim);transform:rotateY(180deg)}
  .face.front{background:linear-gradient(165deg,#422b3e,#241722);border:2px solid var(--gold);box-shadow:0 0 26px rgba(217,169,78,.3)}
  @keyframes dealIn{from{transform:translateY(-40px) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}
</style>
