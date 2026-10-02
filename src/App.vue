<template>
  <header class="app-header sticky-top" :class="{ 'is-compact': isScrolled }">
    <div class="container">
      <h1 class="app-title text-center">現在要刷哪張卡？</h1>
      <div class="search-bar position-relative">
        <i class="bi bi-search search-icon position-absolute top-50 start-0 translate-middle-y"></i>
        <input type="search" placeholder="搜尋消費地點，如 momo、屈臣氏" class="form-control"
          v-model="searchQuery" />
      </div>
      <div class="chip-row" aria-label="熱門關鍵字">
        <button v-for="keyword in hotKeywords" :key="keyword" type="button" class="chip"
          :class="{ active: searchQuery.trim() === keyword }" @click="toggleKeyword(keyword)">
          {{ keyword }}
        </button>
      </div>
    </div>
  </header>

  <main class="container">
    <div class="toolbar">
      <div class="segmented" role="tablist" aria-label="依卡片篩選">
        <button type="button" :class="{ active: !selectedCard }" @click="selectedCard = ''">全部</button>
        <button v-for="card in cardNames" :key="card" type="button" :class="{ active: selectedCard === card }"
          @click="selectedCard = card">
          {{ card }}
        </button>
      </div>
      <p class="result-count">
        共 {{ visibleCampaigns.length }} 個優惠<span v-if="hasQuery">，回饋高的排前面</span>
      </p>
    </div>

    <div v-if="visibleCampaigns.length === 0" class="empty-state text-center">
      <p v-if="hasQuery">找不到 <strong>{{ searchQuery }}</strong> 的優惠，換個關鍵字或點上方熱門分類試試？</p>
      <p v-else>目前沒有進行中的優惠</p>
      <button v-if="selectedCard" type="button" class="btn-text" @click="selectedCard = ''">查看全部卡片</button>
    </div>

    <div v-else class="row g-3">
      <section v-for="campaign in visibleCampaigns" :key="campaign.card + campaign.campaignName"
        class="col-12 col-md-6">
        <article class="card h-100">
          <div class="card-body">
            <div class="card-head">
              <div class="card-title-row">
                <h2 class="card-title" v-html="highlightText(campaign.card)"></h2>
                <span v-if="campaign.status" class="status-badge" :class="campaign.status.tone">
                  {{ campaign.status.label }}
                </span>
              </div>
              <p class="card-meta">
                <span class="campaign-name" v-html="highlightText(campaign.campaignName)"></span>
                <span class="period">{{ campaign.period }}</span>
              </p>
            </div>

            <ul class="reward-list" :class="{ 'is-multi': campaign.rewardRates.length > 1 }">
              <li v-for="(rate, index) in campaign.rewardRates" :key="index">
                <span class="reward-rate" v-html="emphasizeRate(highlightText(splitRate(rate).main))"></span>
                <span v-if="splitRate(rate).note" class="reward-note"
                  v-html="highlightText(splitRate(rate).note)"></span>
              </li>
            </ul>

            <!-- 搜尋中：只秀命中的那幾條 -->
            <div v-if="campaign.matches.length" class="match-box">
              <p class="match-label"><i class="bi bi-check-circle-fill"></i> 符合「{{ searchQuery.trim() }}」</p>
              <ul class="channel-list">
                <li v-for="detail in campaign.matches" :key="detail.raw">
                  <span v-if="detail.category" class="channel-name" v-html="highlightText(detail.category)"></span>
                  <span v-html="highlightText(detail.text)"></span>
                </li>
              </ul>
            </div>

            <!-- 未搜尋：通路分類預覽 -->
            <div v-else-if="campaign.channels.length" class="category-tags">
              <span v-for="detail in campaign.channels.slice(0, previewCount)" :key="detail.raw" class="category-tag">
                {{ detail.category }}
              </span>
              <span v-if="campaign.channels.length > previewCount" class="category-tag more">
                +{{ campaign.channels.length - previewCount }}
              </span>
            </div>

            <details v-if="campaign.channels.length" class="detail-group">
              <summary>適用通路<span class="count">{{ campaign.channels.length }}</span></summary>
              <ul class="channel-list">
                <li v-for="detail in campaign.channels" :key="detail.raw">
                  <span class="channel-name" v-html="highlightText(detail.category)"></span>
                  <span v-html="highlightText(detail.text)"></span>
                </li>
              </ul>
            </details>

            <details v-if="campaign.notes.length" class="detail-group" :open="!campaign.channels.length">
              <summary>
                {{ campaign.channels.length ? '注意事項' : '活動說明' }}<span class="count">{{ campaign.notes.length }}</span>
              </summary>
              <ul class="detail-list">
                <li v-for="detail in campaign.notes" :key="detail.raw" v-html="highlightText(detail.text)"></li>
              </ul>
            </details>

            <div class="card-links">
              <a v-for="(link, index) in campaign.link" :key="index" :href="link" target="_blank" rel="noopener">
                查看官網 <i class="bi bi-arrow-right"></i>
              </a>
            </div>
          </div>
        </article>
      </section>
    </div>
  </main>

  <footer class="footer container text-center">
    <p class="footer-slogan">謹慎理財 信用至上</p>
    <p class="footer-meta">最後更新 2026年10月3日 © 2025 Tingli</p>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import campaigns from './assets/campaigns.json';

type Campaign = (typeof campaigns)[number];

interface Detail {
  category: string; // 「日本交通：Suica、PASMO」的「日本交通」；注意事項為空字串
  text: string;
  raw: string;
}

const hotKeywords = ['超商', '日本', 'LINE Pay', '餐飲', '加油', '百貨', 'Uber', '網購'];
const previewCount = 4;
const DAY = 24 * 60 * 60 * 1000;

const searchQuery = ref<string>('');
const selectedCard = ref<string>('');
const isScrolled = ref(false);

const hasQuery = computed(() => searchQuery.value.trim() !== '');
const cardNames = [...new Set(campaigns.map((c) => c.card))];

const toggleKeyword = (keyword: string) => {
  searchQuery.value = searchQuery.value.trim() === keyword ? '' : keyword;
};

// 捲動後收起標題（上下門檻不同，避免在臨界點閃爍）
const onScroll = () => {
  const y = window.scrollY;
  if (!isScrolled.value && y > 80) isScrolled.value = true;
  else if (isScrolled.value && y < 10) isScrolled.value = false;
};
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', onScroll));

// 冒號前 20 字內有「：」視為「分類：通路」，其餘歸為注意事項
const parseDetail = (raw: string): Detail => {
  const i = raw.indexOf('：');
  return i > 0 && i <= 20
    ? { category: raw.slice(0, i), text: raw.slice(i + 1), raw }
    : { category: '', text: raw, raw };
};

// 取回饋文字中最大的百分比，用來排序；沒有 % 的（現折、滿額禮）視為 0
const maxRate = (rates: string[]) =>
  Math.max(0, ...rates.flatMap((r) => [...r.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1]))));

const parseDate = (s: string) => {
  const [y, m, d] = s.trim().split('/').map(Number);
  return new Date(y, m - 1, d);
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const getStatus = (start: Date, end: Date) => {
  if (start > today) return { label: `${start.getMonth() + 1}/${start.getDate()} 開始`, tone: 'upcoming' };
  const daysLeft = Math.round((end.getTime() - today.getTime()) / DAY);
  if (daysLeft === 0) return { label: '今天截止', tone: 'ending' };
  if (daysLeft <= 7) return { label: `剩 ${daysLeft} 天`, tone: 'ending' };
  if (daysLeft <= 30) return { label: `剩 ${daysLeft} 天`, tone: 'soon' };
  return null;
};

const enrichedCampaigns = campaigns
  .map((campaign: Campaign) => {
    const [start, end] = campaign.period.split('~').map(parseDate);
    const details = campaign.details.map(parseDetail);
    return {
      ...campaign,
      channels: details.filter((d) => d.category),
      notes: details.filter((d) => !d.category),
      maxRate: maxRate(campaign.rewardRates),
      isExpired: end < today,
      status: getStatus(start, end),
    };
  })
  .filter((campaign) => !campaign.isExpired);

const visibleCampaigns = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const list = enrichedCampaigns.filter((c) => !selectedCard.value || c.card === selectedCard.value);
  if (!query) return list.map((c) => ({ ...c, matches: [] as Detail[] }));

  return list
    .map((c) => ({
      ...c,
      matches: [...c.channels, ...c.notes].filter((d) => d.raw.toLowerCase().includes(query)),
    }))
    .filter((c) =>
      c.matches.length > 0 ||
      [c.campaignName, c.card, ...c.rewardRates].some((field) => field.toLowerCase().includes(query))
    )
    .sort((a, b) => b.maxRate - a.maxRate);
});

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

// 「3%（分期付款僅適用0.3%）」→ 主數字「3%」＋補充說明
const splitRate = (rate: string) => {
  const m = rate.match(/^(.+?)（(.+)）$/);
  return m ? { main: m[1], note: m[2] } : { main: rate, note: '' };
};

// 把「2.5%」「3%~8%」包起來加粗，多筆回饋時讓數字一眼可見
const emphasizeRate = (html: string) =>
  html.replace(/(\d+(?:\.\d+)?%?(?:\s*[~～]\s*\d+(?:\.\d+)?)?%)/g, '<span class="num">$1</span>');

const highlightText = (text: string) => {
  const safe = escapeHtml(text);
  const q = searchQuery.value.trim();
  if (!q) return safe;
  return safe.replace(
    new RegExp(`(${escapeRegExp(escapeHtml(q))})`, 'gi'),
    '<mark>$1</mark>'
  );
};
</script>