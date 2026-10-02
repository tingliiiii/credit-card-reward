<template>
  <article class="card h-100">
    <div class="card-body">
      <div class="card-head">
        <div class="card-title-row">
          <h2 class="card-title" v-html="highlight(campaign.card)"></h2>
          <span v-if="campaign.status" class="status-badge" :class="campaign.status.tone">
            {{ campaign.status.label }}
          </span>
        </div>
        <p class="card-meta">
          <span class="campaign-name" v-html="highlight(campaign.campaignName)"></span>
          <span class="period">{{ campaign.period }}</span>
        </p>
      </div>

      <ul class="reward-list" :class="{ 'is-multi': campaign.rewards.length > 1 }">
        <li v-for="(reward, index) in campaign.rewards" :key="index">
          <span class="reward-rate" v-html="emphasizeRate(highlight(reward.main))"></span>
          <span v-if="reward.note" class="reward-note" v-html="highlight(reward.note)"></span>
        </li>
      </ul>

      <!-- 搜尋中：只秀命中的那幾條 -->
      <div v-if="campaign.matches.length" class="match-box">
        <p class="match-label"><AppIcon name="check-circle-fill" /> 符合「{{ query }}」</p>
        <ul class="channel-list">
          <li v-for="detail in campaign.matches" :key="detail.raw">
            <span v-if="detail.category" class="channel-name" v-html="highlight(detail.category)"></span>
            <span v-html="highlight(detail.text)"></span>
          </li>
        </ul>
      </div>

      <!-- 未搜尋：通路分類預覽 -->
      <div v-else-if="campaign.channels.length" class="category-tags">
        <span v-for="detail in campaign.channels.slice(0, PREVIEW_COUNT)" :key="detail.raw" class="category-tag">
          {{ detail.category }}
        </span>
        <span v-if="campaign.channels.length > PREVIEW_COUNT" class="category-tag more">
          +{{ campaign.channels.length - PREVIEW_COUNT }}
        </span>
      </div>

      <details v-if="campaign.channels.length" class="detail-group">
        <summary>
          適用通路<span class="count">{{ campaign.channels.length }}</span>
        </summary>
        <ul class="channel-list">
          <li v-for="detail in campaign.channels" :key="detail.raw">
            <span class="channel-name" v-html="highlight(detail.category)"></span>
            <span v-html="highlight(detail.text)"></span>
          </li>
        </ul>
      </details>

      <details v-if="campaign.notes.length" class="detail-group" :open="!campaign.channels.length">
        <summary>
          {{ campaign.channels.length ? '注意事項' : '活動說明' }}<span class="count">{{ campaign.notes.length }}</span>
        </summary>
        <ul class="detail-list">
          <li v-for="detail in campaign.notes" :key="detail.raw" v-html="highlight(detail.text)"></li>
        </ul>
      </details>

      <div class="card-links">
        <a v-for="(link, index) in campaign.links" :key="index" :href="link" target="_blank" rel="noopener">
          查看官網 <AppIcon name="arrow-right" />
        </a>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { SearchResult } from '../types/campaign';
import { emphasizeRate, highlightText } from '../utils/highlight';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ campaign: SearchResult; query: string }>();

const PREVIEW_COUNT = 4;

// highlightText 會先跳脫 HTML，下方的 v-html 才安全
const highlight = (text: string) => highlightText(text, props.query);
</script>
