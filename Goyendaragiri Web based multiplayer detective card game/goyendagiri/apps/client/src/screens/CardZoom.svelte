<script lang="ts">
  import { zoomedCard } from '../lib/cardZoom';
  const close = () => zoomedCard.set(null);
</script>

{#if $zoomedCard}
  <!-- Backdrop: tap anywhere outside the card to dismiss (all screens) -->
  <div class="zoom-back" role="button" tabindex="-1"
       on:click={close}
       on:keydown={(e) => e.key === 'Escape' && close()}>
    <div class="zoom-card {$zoomedCard.type === 'evidence' ? 'ev' : 'mn'}"
         on:click|stopPropagation role="presentation">
      <b>{$zoomedCard.bn}</b>
      <span class="card-en">{$zoomedCard.en}</span>
      {#if $zoomedCard.icon}
        <img class="card-ic" src="/icons/{$zoomedCard.icon}.svg" alt="" draggable="false" />
      {:else}
        <span class="zoom-ic">{$zoomedCard.type === 'evidence' ? '🔍' : '🗡'}</span>
      {/if}
    </div>
    <div class="zoom-hint">ট্যাপ করুন · tap anywhere to close</div>
  </div>
{/if}
