import { describe, expect, it } from 'vitest';
import type { Campaign } from '../../types/campaign';
import { enrichCampaigns, getStatus, maxRate, parseDate, parseDetail, searchCampaigns, splitRate } from '../campaign';

const makeCampaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  campaignName: '玩數位',
  rewardRates: ['3%'],
  period: '2026/1/1~2026/12/31',
  card: '國泰 CUBE 卡',
  details: ['網購平台：蝦皮購物、momo購物網', '分期付款不適用'],
  links: ['https://example.com'],
  ...overrides,
});

describe('parseDetail', () => {
  it('拆出「分類：通路」', () => {
    expect(parseDetail('日本交通：Suica、PASMO')).toEqual({
      category: '日本交通',
      text: 'Suica、PASMO',
      raw: '日本交通：Suica、PASMO',
    });
  });

  it('沒有冒號、冒號在開頭或超過 20 字時視為注意事項', () => {
    expect(parseDetail('分期付款不適用').category).toBe('');
    expect(parseDetail('：開頭冒號').category).toBe('');
    expect(parseDetail(`${'很長'.repeat(11)}：內容`).category).toBe('');
  });
});

describe('maxRate', () => {
  it('取所有字串中最大的百分比', () => {
    expect(maxRate(['簡單選 +2%（上限 1000 點）', '3%~8%', '3.3%'])).toBe(8);
  });

  it('沒有百分比時為 0', () => {
    expect(maxRate(['滿千送百'])).toBe(0);
    expect(maxRate([])).toBe(0);
  });
});

describe('splitRate', () => {
  it('拆出括號內的補充說明', () => {
    expect(splitRate('3%（分期付款僅適用0.3%）')).toEqual({ main: '3%', note: '分期付款僅適用0.3%' });
  });

  it('沒有括號時 note 為空字串', () => {
    expect(splitRate('3.3%')).toEqual({ main: '3.3%', note: '' });
  });
});

describe('getStatus', () => {
  const today = parseDate('2026/10/3');

  it('尚未開始', () => {
    expect(getStatus(parseDate('2026/10/10'), parseDate('2026/12/31'), today)).toEqual({
      label: '10/10 開始',
      tone: 'upcoming',
    });
  });

  it('依剩餘天數給不同提醒', () => {
    const start = parseDate('2026/1/1');
    expect(getStatus(start, parseDate('2026/10/3'), today)?.label).toBe('今天截止');
    expect(getStatus(start, parseDate('2026/10/10'), today)).toEqual({ label: '剩 7 天', tone: 'ending' });
    expect(getStatus(start, parseDate('2026/11/2'), today)).toEqual({ label: '剩 30 天', tone: 'soon' });
    expect(getStatus(start, parseDate('2026/11/3'), today)).toBeNull();
  });
});

describe('enrichCampaigns', () => {
  const today = parseDate('2026/10/3');

  it('濾掉已過期的活動', () => {
    const result = enrichCampaigns(
      [makeCampaign({ period: '2026/1/1~2026/10/2' }), makeCampaign({ period: '2026/1/1~2026/10/3' })],
      today,
    );
    expect(result).toHaveLength(1);
  });

  it('同卡同名的活動也有不同 id', () => {
    const [a, b] = enrichCampaigns([makeCampaign(), makeCampaign()], today);
    expect(a.id).not.toBe(b.id);
  });

  it('把明細分成通路與注意事項', () => {
    const [c] = enrichCampaigns([makeCampaign()], today);
    expect(c.channels.map((d) => d.category)).toEqual(['網購平台']);
    expect(c.notes.map((d) => d.text)).toEqual(['分期付款不適用']);
  });
});

describe('searchCampaigns', () => {
  const today = parseDate('2026/10/3');
  const campaigns = enrichCampaigns(
    [
      makeCampaign({ campaignName: '低回饋', rewardRates: ['1%'], details: ['網購：MOMO購物網'] }),
      makeCampaign({ campaignName: '高回饋', rewardRates: ['5%'], details: ['網購：momo購物網'] }),
      makeCampaign({ campaignName: '其他卡', card: '玉山 Unicard', details: ['餐飲：麥當勞'] }),
    ],
    today,
  );

  it('沒有關鍵字時回傳全部、不排序', () => {
    const result = searchCampaigns(campaigns, '  ', '');
    expect(result.map((c) => c.campaignName)).toEqual(['低回饋', '高回饋', '其他卡']);
    expect(result.every((c) => c.matches.length === 0)).toBe(true);
  });

  it('不分大小寫比對明細，並依回饋高低排序', () => {
    const result = searchCampaigns(campaigns, 'momo', '');
    expect(result.map((c) => c.campaignName)).toEqual(['高回饋', '低回饋']);
    expect(result[0].matches).toHaveLength(1);
  });

  it('也會比對卡名與方案名稱', () => {
    expect(searchCampaigns(campaigns, '其他', '').map((c) => c.campaignName)).toEqual(['其他卡']);
  });

  it('依卡片篩選', () => {
    expect(searchCampaigns(campaigns, '', '玉山 Unicard')).toHaveLength(1);
  });
});
