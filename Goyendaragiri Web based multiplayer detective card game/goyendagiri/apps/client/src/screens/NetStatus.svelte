<script lang="ts">
  import { connStatus, view } from '../lib/net';
  import { t } from '../lib/lang';
  $: v = $view;
  const icon: Record<string, string> = { connected: '🟢', connecting: '🟡', reconnecting: '🟠', offline: '🔴' };
  const label: Record<string, string> = {
    connected: 'সংযুক্ত · online', connecting: 'সংযোগ হচ্ছে · connecting…',
    reconnecting: 'পুনঃসংযোগ হচ্ছে · reconnecting…', offline: 'বিচ্ছিন্ন · offline',
  };
</script>

<span class="net-chip" title={$t(label[$connStatus])}>
  {icon[$connStatus]}
  {#if v && v.seats.length}
    <span class="pdots">
      {#each v.seats as s}
        <i class="pdot" class:on={s.connected} title="{s.name} — {s.connected ? 'connected · সংযুক্ত' : 'disconnected · বিচ্ছিন্ন'}"></i>
      {/each}
    </span>
  {/if}
</span>

<style>
  .net-chip{display:inline-flex;align-items:center;gap:6px;background:var(--panel3);border:1px solid var(--line);border-radius:999px;padding:3px 9px;font-size:.7rem;cursor:default}
  .pdots{display:inline-flex;gap:3px}
  .pdot{width:7px;height:7px;border-radius:50%;background:var(--danger);display:inline-block}
  .pdot.on{background:var(--good)}
</style>
