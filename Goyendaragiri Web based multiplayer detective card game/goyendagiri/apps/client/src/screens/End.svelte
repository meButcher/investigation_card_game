<script lang="ts">
  import { view, leave } from '../lib/net';
  $: v = $view!;
  $: investigatorsWon = v.winner === 'investigators';
  const roleLabel: Record<string, string> = {
    detective: 'গোয়েন্দা · Detective', murderer: 'খুনী · Murderer',
    accomplice: 'সহযোগী · Accomplice', witness: 'সাক্ষী · Witness', investigator: 'তদন্তকারী · Investigator',
  };
  const roleColor: Record<string, string> = {
    detective: 'var(--gold)', murderer: 'var(--danger)', accomplice: '#e08a3c', witness: '#9b6dd6', investigator: 'var(--good)',
  };
</script>

<div class="screen endbg">
  <div class="scroll" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px">
    <h1 class="serif" style="font-size:1.9rem;font-weight:800;text-align:center;color:{investigatorsWon ? 'var(--good)' : 'var(--danger)'}">
      {investigatorsWon ? '✅ তদন্তকারীরা জয়ী! · Investigators win!' : '🗡 খুনী দল জয়ী! · The murderer wins!'}
    </h1>
    <p class="dim" style="margin:8px 0 22px;text-align:center;font-size:.85rem">{v.winReason}</p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;max-width:680px;width:100%;margin-bottom:22px">
      {#each v.seats as s}
        <div class="panel" style="text-align:center;padding:10px;font-size:.78rem">
          <span class="avatar" style="margin:0 auto 4px">🕵</span>
          <b>{s.name}</b>
          <div style="font-size:.68rem;margin-top:2px;color:{roleColor[s.revealedRole ?? 'investigator']}">{roleLabel[s.revealedRole ?? 'investigator']}</div>
        </div>
      {/each}
    </div>

    <div style="display:flex;gap:10px">
      <button class="btn ghost" on:click={leave}>🚪 রুম ছাড়ো · Leave room</button>
    </div>
    <p class="dim" style="font-size:.68rem;margin-top:14px">🔁 Rematch: host creates a fresh room and reshares the link (one-tap rematch is on the roadmap).</p>
  </div>
</div>

<style>
  .endbg{background:linear-gradient(rgba(18,10,16,.72),rgba(10,5,9,.88)),url('/art/bg-end.webp') center/cover no-repeat,radial-gradient(ellipse at 50% 20%,#2e1b2c 0%,#0a0509 70%)}
</style>
