<template>
  <div id="app" class="container">
    <h1 class="text-center m-5">回饋查詢小工具</h1>

    <!-- 搜尋欄 -->
    <header class="search-bar">
      <input type="text" placeholder="查詢要消費的店家" class="form-control" v-model="searchQuery" />
    </header>

    <!-- 卡片格式的 Section -->
    <main>
      <div class="row">
        <section v-for="section in filteredSections" :key="section.id" :id="section.id" class="col mb-4">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title" v-html="highlightText(section.title)"></h5>
              <ul class="list-group list-group-flush">
                <li v-for="detail in section.details" :key="detail" class="list-group-item"
                  v-html="highlightText(detail)"></li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const searchQuery = ref('');
const sections = ref([
  {
    id: 'japan',
    title: '日本賞',
    details: ['適用期間：2025/2/24~2025/4/30', '優惠：日本實體消費3.5%回饋。'],
  },
  {
    id: 'digital',
    title: '玩數位',
    details: ['數位消費回饋詳情。'],
  },
  {
    id: 'shopdine',
    title: '樂饗購',
    details: ['指定美食/購物消費回饋詳情。'],
  },
  {
    id: 'travel',
    title: '趣旅行',
    details: ['適用期間：2025/1/1~2025/6/30', '海外實體消費回饋詳情。'],
  },
]);

const filteredSections = computed(() => {
  if (!searchQuery.value.trim()) {
    return sections.value;
  }
  const query = searchQuery.value.toLowerCase();
  return sections.value.filter(
    (section) =>
      section.title.toLowerCase().includes(query) ||
      section.details.some((detail) => detail.toLowerCase().includes(query))
  );
});

const highlightText = (text: string) => {
  if (!searchQuery.value.trim()) {
    return text;
  }
  const query = searchQuery.value;
  const regex = new RegExp(`(${query})`, 'gi'); // 建立正則表達式，忽略大小寫
  return text.replace(regex, '<span class="highlight">$1</span>'); // 用 <span> 包裹關鍵字
};
</script>