<template>
  <footer class="footer container text-center">
    <p class="footer-slogan">謹慎理財 信用至上</p>
    <p class="footer-meta">最後更新 {{ updatedAt }} © 2025 Tingli</p>
  </footer>
</template>

<script setup lang="ts">
// __DATA_UPDATED_AT__ 由 vite.config.ts 在建置時注入（campaigns.json 最後一次 commit 的時間）
const updatedAt = new Date(__DATA_UPDATED_AT__).toLocaleDateString('zh-TW', { dateStyle: 'long' });
</script>
