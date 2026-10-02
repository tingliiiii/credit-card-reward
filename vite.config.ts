import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 頁尾「最後更新」日期：取 campaigns.json 最後一次 commit 的時間，抓不到（例如沒有 git）就用建置當下
const dataUpdatedAt = () => {
  try {
    return (
      execSync('git log -1 --format=%cI -- src/assets/campaigns.json', { encoding: 'utf8' }).trim() ||
      new Date().toISOString()
    );
  } catch {
    return new Date().toISOString();
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/credit-card-reward/',
  define: {
    __DATA_UPDATED_AT__: JSON.stringify(dataUpdatedAt()),
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3 仍使用 @import 等舊語法，隱藏 Sass 的棄用警告
        quietDeps: true,
        silenceDeprecations: ['import'],
      },
    },
  },
});
