<template>
  <div class="container">
    <header class="sticky-top bg-light">
      <h1 class="text-center pt-5">現在要刷哪張卡？</h1>
      <div class="search-bar position-relative">
        <i class="bi bi-search position-absolute bottom-50 start-0 ms-3"></i>
        <input type="text" placeholder="請輸入消費地點，如momo、屈臣氏、Booking.com…" class="form-control ps-5"
          v-model="searchQuery" />
      </div>
    </header>

    <div v-if="Object.keys(groupedCampaigns).length === 0" class="text-center mt-5">
      <p>找不到 <strong>{{ searchQuery }}</strong> 有回饋的信用卡，要不要試試看LINE Pay、街口支付？</p>
    </div>

    <div v-else>
      <div v-for="(campaigns, card) in groupedCampaigns" :key="card">
        <div class="row">
          <section v-for="campaign in campaigns" :key="campaign" class="col-12 col-md-6 mb-4">
            <div class="card h-100">
              <div class="card-body">
                <div
                  class="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center">
                  <h4 class="card-title mb-2" v-html="highlightText(campaign.card)"></h4>
                  <small class="text-muted mb-2">{{ campaign.campaignName }}｜{{ campaign.period }}</small>
                </div>
                <div class="reward-tags mb-2">
                  <div v-for="(rate, index) in campaign.rewardRates" :key="index" v-html="highlightText(rate)"
                    class="badge bg-success-subtle text-success me-1"></div>
                </div>
                <ul class="small text-body-secondary ps-3 mb-2">
                  <li v-for="detail in campaign.details" :key="detail" v-html="highlightText(detail)"></li>
                </ul>
                <!-- <p>
                  <span v-for="(rate, index) in campaign.rewardRates" :key="index" v-html="highlightText(rate)"
                    class="text-success d-block fw-bold"></span>
                </p>
                <p v-for="detail in campaign.details" :key="detail" v-html="highlightText(detail)"></p> -->
                <p>
                  <a v-for="(link, index) in campaign.link" :key="index" :href="link" target="_blank"
                    class="btn btn-sm btn-outline-secondary mt-2 me-2">
                    🔗 查看詳情
                  </a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <footer class="footer text-center mt-5 bg-light">
      <p class="fs-3 fw-bold">謹慎理財 信用至上</p>
      <p>最後更新 2025年4月14日 © 2025 Tingli 保留所有權利</p>
      <p>
        <a href="https://line.me/ti/p/wS8xxwAxjG" class="text-decoration-none text-body">線上客服</a>｜
        <span href="/privacy-policy">服務專線 0973-033525（付費電話）</span>
      </p>
    </footer>
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
      .some((field: string) => field.toLowerCase().includes(query))
  );
});

const groupedCampaigns = computed(() => {
  const groups: Record<string, typeof campaigns> = {};
  filteredCampaigns.value.forEach((campaign) => {
    if (!groups[campaign.card]) {
      groups[campaign.card] = [];
    }
    groups[campaign.card].push(campaign);
  });
  return groups;
});

const highlightRegex = computed(() => {
  const query = searchQuery.value.trim();
  return query ? new RegExp(`(${query})`, 'gi') : null;
});

const highlightText = (text: string) => {
  if (!highlightRegex.value) return text;
  return text.replace(highlightRegex.value, '<span class="highlight">$1</span>');
};
</script>