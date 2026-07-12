<script lang="ts">
  import { view, leave, resetLobby } from '../lib/net';
  import Card from './Card.svelte';
  import { t } from '../lib/lang';
  $: v = $view!;
  $: investigatorsWon = v.winner === 'investigators';
  const roleLabel: Record<string, string> = {
    detective: 'গোয়েন্দা · Detective', murderer: 'খুনী · Murderer',
    accomplice: 'সহযোগী · Accomplice', witness: 'সাক্ষী · Witness', investigator: 'তদন্তকারী · Investigator',
  };
  const roleColor: Record<string, string> = {
    detective: 'var(--gold)', murderer: 'var(--danger)', accomplice: '#e08a3c', witness: '#9b6dd6', investigator: 'var(--good)',
  };
  $: killerSeat = v.secret.murdererSeat !== undefined ? v.seats.find(s => s.seat === v.secret.murdererSeat) : null;
  $: accSeat = v.secret.accompliceSeat !== undefined ? v.seats.find(s => s.seat === v.secret.accompliceSeat) : null;
  $: solCards = v.secret.solution && killerSeat
    ? [...killerSeat.evidence, ...killerSeat.means].filter(c => c.id === v.secret.solution!.evidenceId || c.id === v.secret.solution!.meansId)
    : [];
</script>

<div class="screen endbg">
  <div class="scroll" style="display:flex;flex-direction:column;align-items:center;padding:20px">
    <div class="end-center">
    <h1 class="serif" style="font-size:1.9rem;font-weight:800;text-align:center;color:{investigatorsWon ? 'var(--good)' : 'var(--danger)'}">
      {investigatorsWon ? $t('✅ তদন্তকারীরা জয়ী! · Investigators win!') : $t('🗡 খুনী দল জয়ী! · The murderer wins!')}
    </h1>
    <p class="dim" style="margin:8px 0 22px;text-align:center;font-size:.85rem">{v.winReason}</p>

    {#if killerSeat}
      <div class="panel" style="border-color:var(--danger);text-align:center;margin-bottom:22px;max-width:480px;width:100%">
        <h3 style="color:var(--danger)">{$t('🗡 খুনী · The killer: ')}{killerSeat.name}</h3>
        {#if accSeat}<p style="font-size:.8rem;margin:2px 0 8px;color:#e08a3c">{$t('🤝 সহযোগী · Accomplice: ')}{accSeat.name}</p>{/if}
        {#if solCards.length}
          <p class="dim" style="font-size:.7rem;margin-bottom:8px">{$t('অপরাধের সমাধান · the chosen evidence & means')}</p>
          <div style="display:flex;gap:10px;justify-content:center">
            {#each solCards as c}<Card card={c} size="big" />{/each}
          </div>
        {/if}
      </div>
    {/if}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;max-width:680px;width:100%;margin-bottom:22px">
      {#each v.seats as s}
        <div class="panel" style="text-align:center;padding:10px;font-size:.78rem">
          <span class="avatar" style="margin:0 auto 4px">🕵</span>
          <b>{s.name}</b>
          <div style="font-size:.68rem;margin-top:2px;color:{roleColor[s.revealedRole ?? 'investigator']}">{$t(roleLabel[s.revealedRole ?? 'investigator'])}</div>
        </div>
      {/each}
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
      <button class="btn gold" on:click={resetLobby}>{$t('🔁 লবিতে ফিরে যাও · Back to lobby')}</button>
      <button class="btn ghost" on:click={leave}>{$t('🚪 রুম ছাড়ো · Leave room')}</button>
    </div>
    <p class="dim" style="font-size:.68rem;margin-top:14px">{$t('🔁 যে কেউ চাপলে সবাই একসাথে একই লবিতে ফিরবে · any player can bring everyone back to the same lobby for a rematch.')}</p>
    </div>
  </div>
</div>

<style>
  .endbg{background:linear-gradient(rgba(18,10,16,.72),rgba(10,5,9,.88)),url('/art/bg-end.webp') center/cover no-repeat,radial-gradient(ellipse at 50% 20%,#2e1b2c 0%,#0a0509 70%)}
  .end-center{margin:auto;display:flex;flex-direction:column;align-items:center;width:100%}
</style>
