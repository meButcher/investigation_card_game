<script lang="ts">
  import { view, send } from '../lib/net';
  import Card from './Card.svelte';
  import NetStatus from './NetStatus.svelte';
  import { onDestroy } from 'svelte';
  import { t } from '../lib/lang';
  $: v = $view!;
  $: isDet = v.yourRole === 'detective';
  $: players = v.seats.filter(s => !s.isDetective);

  // local cosmetic countdown — the server clock (5 min) is authoritative
  let remaining = 300;
  const iv = setInterval(() => { remaining = Math.max(0, remaining - 1); }, 1000);
  onDestroy(() => clearInterval(iv));
  $: mm = Math.floor(remaining / 60); $: ss = String(remaining % 60).padStart(2, '0');

  const roleShort: Record<string, string> = {
    detective: '🎩 গোয়েন্দা', murderer: '🗡 খুনী', accomplice: '🤝 সহযোগী', witness: '🕯 সাক্ষী', investigator: '🔎 তদন্তকারী',
  };
</script>

<div class="screen">
  <div class="topbar">
    <span class="logo">🎩 গোয়েন্দাগিরি</span>
    <span class="chip">{$t('🃏 পর্যবেক্ষণ · Study the table')}</span>
    <NetStatus />
    <span class="timer" class:warn={remaining <= 30}>⏳ {mm}:{ss}</span>
  </div>
  <div class="scroll" style="display:flex;flex-direction:column;align-items:center;padding:16px">
    <div class="study-center">
      <p class="dim" style="font-size:.78rem;text-align:center;max-width:560px;margin-bottom:14px">
        সবার কার্ড ভালো করে দেখে নাও — রাত নামার আগে। Memorize everyone's cards before night falls. Hold a card to zoom.
      </p>
      {#if isDet}
        <button class="btn gold big" style="max-width:420px;margin-bottom:14px" on:click={() => send('beginNight')}>
          {$t('⏩ রাত শুরু করো · Skip the timer — start the night')}
        </button>
      {:else}
        <p class="dim" style="font-size:.72rem;margin-bottom:12px">{$t('সময় শেষ হলে বা গোয়েন্দা চাইলে রাত নামবে · night begins when the timer ends or the Detective starts it')}</p>
      {/if}
      {#each players as s}
        <div class="study-row">
          <p class="dim rail-label">🕵 <b style="color:var(--ink)">{s.name}</b>{s.seat === v.seat ? ' — you' : ''}
            {#if s.seat === v.seat}<span class="badge" style="margin-left:6px;border-color:var(--gold);color:var(--gold);text-transform:none">{roleShort[v.yourRole]}</span>{/if}
          </p>
          <div class="study-cards" style="--k:{v.settings.difficulty}">
            {#each [...s.evidence, ...s.means] as c}
              <Card card={c} size="hand" />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .study-center{margin:auto;display:flex;flex-direction:column;align-items:center;width:100%;max-width:860px}
  .study-row{width:100%;margin-bottom:10px;display:flex;flex-direction:column;align-items:center}
  .rail-label{font-size:.7rem;padding:2px 0 6px;text-transform:uppercase;letter-spacing:1px;text-align:center}
  .study-cards{display:grid;grid-template-columns:repeat(var(--k,4),max-content);gap:8px;justify-content:center}
  @media (max-width:1023px){.study-cards{display:flex;flex-wrap:wrap}}
  .timer.warn{color:var(--danger);border-color:var(--danger)}
</style>
