import { describe, expect, it } from 'vitest';
import { emphasizeRate, escapeHtml, highlightText } from '../highlight';

describe('escapeHtml', () => {
  it('跳脫 HTML 特殊字元', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('highlightText', () => {
  it('不分大小寫標出關鍵字', () => {
    expect(highlightText('LINE Pay、line pay', 'line')).toBe('<mark>LINE</mark> Pay、<mark>line</mark> pay');
  });

  it('沒有關鍵字時只做跳脫', () => {
    expect(highlightText('<b>', '')).toBe('&lt;b&gt;');
  });

  it('資料或關鍵字含 HTML／正規表示式字元時不會注入或出錯', () => {
    expect(highlightText('<script>', '<script>')).toBe('<mark>&lt;script&gt;</mark>');
    expect(highlightText('3%(上限)', '(')).toBe('3%<mark>(</mark>上限)');
  });
});

describe('emphasizeRate', () => {
  it('包住單一比例與區間', () => {
    expect(emphasizeRate('簡單選 +2.5%')).toBe('簡單選 +<span class="num">2.5%</span>');
    expect(emphasizeRate('3%~8%')).toBe('<span class="num">3%~8%</span>');
  });
});
