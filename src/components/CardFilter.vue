<template>
  <div class="segmented" role="group" aria-label="依卡片篩選">
    <button type="button" :class="{ active: !selectedCard }" :aria-pressed="!selectedCard" @click="selectedCard = ''">
      全部
    </button>
    <button
      v-for="card in cards"
      :key="card"
      type="button"
      :class="{ active: selectedCard === card }"
      :aria-pressed="selectedCard === card"
      @click="selectedCard = card"
    >
      {{ card }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ cards: string[] }>();

const selectedCard = defineModel<string>({ required: true });
</script>
