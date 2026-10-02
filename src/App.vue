<template>
  <AppHeader v-model="searchQuery" />

  <main class="container">
    <div class="toolbar">
      <CardFilter v-model="selectedCard" :cards="cardNames" />
      <p class="result-count">共 {{ results.length }} 個優惠<span v-if="trimmedQuery">，回饋高的排前面</span></p>
    </div>

    <div v-if="results.length === 0" class="empty-state text-center">
      <p v-if="trimmedQuery">
        找不到 <strong>{{ searchQuery }}</strong> 的優惠，換個關鍵字或點上方熱門分類試試？
      </p>
      <p v-else>目前沒有進行中的優惠</p>
      <button v-if="selectedCard" type="button" class="btn-text" @click="selectedCard = ''">查看全部卡片</button>
    </div>

    <div v-else class="row g-3">
      <section v-for="campaign in results" :key="campaign.id" class="col-12 col-md-6">
        <CampaignCard :campaign="campaign" :query="trimmedQuery" />
      </section>
    </div>
  </main>

  <AppFooter />
</template>

<script setup lang="ts">
import campaigns from './assets/campaigns.json';
import AppFooter from './components/AppFooter.vue';
import AppHeader from './components/AppHeader.vue';
import CampaignCard from './components/CampaignCard.vue';
import CardFilter from './components/CardFilter.vue';
import { useCampaignSearch } from './composables/useCampaignSearch';

const { searchQuery, selectedCard, trimmedQuery, cardNames, results } = useCampaignSearch(campaigns);
</script>
