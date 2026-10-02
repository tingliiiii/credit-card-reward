/** campaigns.json 單筆資料（由 scraper.py 產生，欄位變動時兩邊要一起改） */
export interface Campaign {
  campaignName: string;
  rewardRates: string[];
  period: string; // 「YYYY/M/D~YYYY/M/D」
  card: string;
  details: string[];
  links: string[];
}

export interface Detail {
  category: string; // 「日本交通：Suica、PASMO」的「日本交通」；注意事項為空字串
  text: string;
  raw: string;
}

/** 「3%（分期付款僅適用0.3%）」拆成主數字與補充說明 */
export interface RewardRate {
  main: string;
  note: string;
}

export interface CampaignStatus {
  label: string;
  tone: 'upcoming' | 'ending' | 'soon';
}

export interface EnrichedCampaign extends Campaign {
  id: string;
  rewards: RewardRate[];
  channels: Detail[];
  notes: Detail[];
  maxRate: number;
  status: CampaignStatus | null;
}

export interface SearchResult extends EnrichedCampaign {
  matches: Detail[]; // 搜尋命中的通路／說明，未搜尋時為空陣列
}
