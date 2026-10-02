import { ref, watch } from 'vue';

/** 與網址查詢參數（?key=value）同步的字串，分享連結時能還原相同的搜尋結果 */
export function useQueryParam(key: string) {
  const value = ref(new URLSearchParams(window.location.search).get(key) ?? '');

  watch(value, (v) => {
    const url = new URL(window.location.href);
    if (v) url.searchParams.set(key, v);
    else url.searchParams.delete(key);
    // 用 replaceState：打字過程不會塞滿瀏覽器的上一頁紀錄
    window.history.replaceState(window.history.state, '', url);
  });

  return value;
}
