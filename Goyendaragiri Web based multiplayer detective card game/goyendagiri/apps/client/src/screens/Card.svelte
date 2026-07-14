<script lang="ts">
  import { zoomable } from '../lib/cardZoom';
  import { lang } from '../lib/lang';
  import type { Card } from '@goyendagiri/rules';
  export let card: Card;
  export let size: 'mini' | 'hand' | 'big' = 'mini';
  export let selected = false;
  let iconBroken = false;
  $: if (card.id) iconBroken = false;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<div class="gcard {size} {card.type === 'evidence' ? 'ev' : 'mn'}" class:selected
     use:zoomable={card} on:click on:keydown>
  <b>{$lang === 'bn' ? card.bn : card.en}</b>
  <span class="card-mid">
    {#if card.icon && !iconBroken}<img class="card-ic" src="/icons/{card.icon}.svg" alt="" draggable="false" loading="lazy" on:error={() => iconBroken = true} />{:else}{card.type === 'evidence' ? '🔍' : '🗡'}{/if}
  </span>
  <span class="card-en">{$lang === 'bn' ? card.en : card.bn}</span>
</div>
