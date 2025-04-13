<template>
  <div class="container">
    <header class="sticky-top bg-light">
      <h1 class="text-center m-5">回饋查詢小工具</h1>
      <div class="search-bar">
        <input type="text" placeholder="查詢要消費的店家" class="form-control" v-model="searchQuery" />
      </div>
    </header>

    <div class="row">
      <section v-for="campaign in filteredCampaigns" :key="campaign.campaignName" class="col-12 col-md-6 mb-4">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title" v-html="highlightText(campaign.campaignName)"></h5>
            <p>
              <small>{{ campaign.card }} | {{ campaign.period }}</small>
            </p>
            <p v-for="rate in campaign.rewardRates" :key="rate" v-html="highlightText(rate)"
              class="reward-summary text-success font-weight-bold"></p>
            <p v-for="detail in campaign.details" :key="detail" v-html="highlightText(detail)"></p>
            <p>
              <a v-for="(link, index) in campaign.link" :key="index" :href="link" target="_blank" class="btn btn-sm btn-outline-secondary mt-2 me-2">
              🔗 查看詳情
              </a>
            </p>

          </div>
        </div>
      </section>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, computed } from 'vue';
import campaigns from './assets/campaigns.json';

const searchQuery = ref<string>('');

const filteredCampaigns = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return campaigns;
  return campaigns.filter((campaign) =>
    [campaign.campaignName, campaign.card, ...campaign.rewardRates, ...campaign.details]
      .some((field) => field.toLowerCase().includes(query))
  );
});

const highlightRegex = computed(() => {
  const query = searchQuery.value.trim();
  return query ? new RegExp(`(${query})`, 'gi') : null;
});

const highlightText = (text: string) => {
  if (!highlightRegex.value) {
    return text;
  }
  return text.replace(highlightRegex.value, '<span class="highlight">$1</span>');
};
</script>