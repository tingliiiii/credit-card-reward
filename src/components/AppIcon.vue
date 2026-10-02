<template>
  <svg class="icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path :d="paths[name]" fill-rule="evenodd" />
  </svg>
</template>

<script setup lang="ts">
// 只用到少數幾個圖示，直接內嵌 Bootstrap Icons 的 SVG path，不必載入整套字型（woff2 約 130 KB）
const paths = {
  search:
    'M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0',
  'check-circle-fill':
    'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z',
  'arrow-right':
    'M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8',
} as const;

defineProps<{ name: keyof typeof paths }>();
</script>
