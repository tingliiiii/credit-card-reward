import { computed } from 'vue';
import type { Campaign } from '../types/campaign';
import { enrichCampaigns, searchCampaigns } from '../utils/campaign';
import { useQueryParam } from './useQueryParam';
import { useToday } from './useToday';

export function useCampaignSearch(campaigns: Campaign[]) {
  const today = useToday();
  const searchQuery = useQueryParam('q');
  const selectedCard = useQueryParam('card');

  const cardNames = [...new Set(campaigns.map((c) => c.card))];
  // 網址帶了已不存在的卡名（例如卡片下架）就改回全部
  if (selectedCard.value && !cardNames.includes(selectedCard.value)) selectedCard.value = '';

  const trimmedQuery = computed(() => searchQuery.value.trim());
  const activeCampaigns = computed(() => enrichCampaigns(campaigns, today.value));
  const results = computed(() => searchCampaigns(activeCampaigns.value, trimmedQuery.value, selectedCard.value));

  return { searchQuery, selectedCard, trimmedQuery, cardNames, results };
}
