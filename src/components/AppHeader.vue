<template>
  <header class="app-header sticky-top" :class="{ 'is-compact': isScrolled }">
    <div class="container">
      <h1 class="app-title text-center">現在要刷哪張卡？</h1>
      <div class="search-bar position-relative">
        <AppIcon name="search" class="search-icon position-absolute top-50 start-0 translate-middle-y" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="搜尋消費地點，如 momo、屈臣氏"
          aria-label="搜尋消費地點"
          class="form-control"
        />
      </div>
      <div class="chip-row" role="group" aria-label="熱門關鍵字">
        <button
          v-for="keyword in hotKeywords"
          :key="keyword"
          type="button"
          class="chip"
          :class="{ active: isActive(keyword) }"
          :aria-pressed="isActive(keyword)"
          @click="toggleKeyword(keyword)"
        >
          {{ keyword }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useScrolled } from '../composables/useScrolled';
import AppIcon from './AppIcon.vue';

const searchQuery = defineModel<string>({ required: true });

const hotKeywords = ['全家', 'LINE Pay', '日本', '蝦皮', 'momo', 'Uber Eats', '高鐵', '星巴克'];

// 捲動後收起標題，只留搜尋列
const isScrolled = useScrolled();

const isActive = (keyword: string) => searchQuery.value.trim() === keyword;
const toggleKeyword = (keyword: string) => {
  searchQuery.value = isActive(keyword) ? '' : keyword;
};
</script>
