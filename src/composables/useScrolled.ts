import { onMounted, onUnmounted, ref } from 'vue';

/** 捲動超過 enter 後為 true、回到 leave 以內才變回 false（上下門檻不同，避免在臨界點閃爍） */
export function useScrolled(enter = 80, leave = 10) {
  const isScrolled = ref(false);

  const onScroll = () => {
    const y = window.scrollY;
    if (!isScrolled.value && y > enter) isScrolled.value = true;
    else if (isScrolled.value && y < leave) isScrolled.value = false;
  };

  onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
  onUnmounted(() => window.removeEventListener('scroll', onScroll));

  return isScrolled;
}
