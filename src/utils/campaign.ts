import type { Campaign, CampaignStatus, Detail, EnrichedCampaign, RewardRate, SearchResult } from '../types/campaign';

const DAY = 24 * 60 * 60 * 1000;

// 冒號前 20 字內有「：」視為「分類：通路」，其餘歸為注意事項
export const parseDetail = (raw: string): Detail => {
  const i = raw.indexOf('：');
  return i > 0 && i <= 20
    ? { category: raw.slice(0, i), text: raw.slice(i + 1), raw }
    : { category: '', text: raw, raw };
};

// 取回饋文字中最大的百分比，用來排序；沒有 % 的（現折、滿額禮）視為 0
export const maxRate = (rates: string[]) =>
  Math.max(0, ...rates.flatMap((r) => [...r.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1]))));

export const parseDate = (s: string) => {
  const [y, m, d] = s.trim().split('/').map(Number);
  return new Date(y, m - 1, d);
};

export const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const getStatus = (start: Date, end: Date, today: Date): CampaignStatus | null => {
  if (start > today) return { label: `${start.getMonth() + 1}/${start.getDate()} 開始`, tone: 'upcoming' };
  const daysLeft = Math.round((end.getTime() - today.getTime()) / DAY);
  if (daysLeft === 0) return { label: '今天截止', tone: 'ending' };
  if (daysLeft <= 7) return { label: `剩 ${daysLeft} 天`, tone: 'ending' };
  if (daysLeft <= 30) return { label: `剩 ${daysLeft} 天`, tone: 'soon' };
  return null;
};

// 「3%（分期付款僅適用0.3%）」→ 主數字「3%」＋補充說明
export const splitRate = (rate: string): RewardRate => {
  const m = rate.match(/^(.+?)（(.+)）$/);
  return m ? { main: m[1], note: m[2] } : { main: rate, note: '' };
};

/** 解析成畫面需要的欄位，並濾掉已過期的活動 */
export const enrichCampaigns = (campaigns: Campaign[], today: Date): EnrichedCampaign[] =>
  campaigns.flatMap((campaign, index) => {
    const [start, end] = campaign.period.split('~').map(parseDate);
    if (end < today) return [];
    const details = campaign.details.map(parseDetail);
    return {
      ...campaign,
      id: `${index}-${campaign.card}-${campaign.campaignName}`,
      rewards: campaign.rewardRates.map(splitRate),
      channels: details.filter((d) => d.category),
      notes: details.filter((d) => !d.category),
      maxRate: maxRate(campaign.rewardRates),
      status: getStatus(start, end, today),
    };
  });

/** 依卡片與關鍵字篩選；有關鍵字時附上命中的明細，並把回饋高的排前面 */
export const searchCampaigns = (campaigns: EnrichedCampaign[], query: string, card: string): SearchResult[] => {
  const q = query.trim().toLowerCase();
  const list = campaigns.filter((c) => !card || c.card === card);
  if (!q) return list.map((c) => ({ ...c, matches: [] }));

  return list
    .map((c) => ({
      ...c,
      matches: [...c.channels, ...c.notes].filter((d) => d.raw.toLowerCase().includes(q)),
    }))
    .filter(
      (c) =>
        c.matches.length > 0 ||
        [c.campaignName, c.card, ...c.rewardRates].some((field) => field.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.maxRate - a.maxRate);
};
