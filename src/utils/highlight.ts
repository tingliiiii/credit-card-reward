const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** 跳脫 HTML 後，用 <mark> 標出關鍵字；回傳值可安全放進 v-html */
export const highlightText = (text: string, query: string) => {
  const safe = escapeHtml(text);
  const q = query.trim();
  if (!q) return safe;
  return safe.replace(new RegExp(`(${escapeRegExp(escapeHtml(q))})`, 'gi'), '<mark>$1</mark>');
};

// 把「2.5%」「3%~8%」包起來加粗，多筆回饋時讓數字一眼可見
export const emphasizeRate = (html: string) =>
  html.replace(/(\d+(?:\.\d+)?%?(?:\s*[~～]\s*\d+(?:\.\d+)?)?%)/g, '<span class="num">$1</span>');
