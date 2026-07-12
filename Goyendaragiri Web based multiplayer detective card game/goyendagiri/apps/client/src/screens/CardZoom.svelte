<script lang="ts">
  import { zoomedCard } from '../lib/cardZoom';
  import { lang, t } from '../lib/lang';
  const close = () => zoomedCard.set(null);
</script>

{#if $zoomedCard}
  <!-- Backdrop: tap anywhere outside the card to dismiss (all screens) -->
  <div class="zoom-back" role="button" tabindex="-1"
       on:click={close}
       on:keydown={(e) => e.key === 'Escape' && close()}>
    <div class="zoom-card {$zoomedCard.type === 'evidence' ? 'ev' : 'mn'}"
         on:click|stopPropagation role="presentation">
      <b>{$lang === 'bn' ? $zoomedCard.bn : $zoomedCard.en}</b>
      {#if $zoomedCard.icon}
        <img class="card-ic" src="/icons/{$zoomedCard.icon}.svg" alt="" draggable="false" />
      {:else}
        <span class="zoom-ic">{$zoomedCard.type === 'evidence' ? '🔍' : '🗡'}</span>
      {/if}
      <span class="card-en">{$lang === 'bn' ? $zoomedCard.en : $zoomedCard.bn}</span>
    </div>
    <div class="zoom-hint">{$t('ট্যাপ করুন · tap anywhere to close')}</div>
  </div>
{/if}
