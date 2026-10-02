import { onMounted, onUnmounted, ref } from 'vue';
import { startOfToday } from '../utils/campaign';

/** 今天 00:00；頁面放到隔天再切回來時會更新，倒數天數與過期判斷才不會停在舊日期 */
export function useToday() {
  const today = ref(startOfToday());

  const refresh = () => {
    if (document.visibilityState !== 'visible') return;
    const now = startOfToday();
    if (now.getTime() !== today.value.getTime()) today.value = now;
  };

  onMounted(() => document.addEventListener('visibilitychange', refresh));
  onUnmounted(() => document.removeEventListener('visibilitychange', refresh));

  return today;
}
