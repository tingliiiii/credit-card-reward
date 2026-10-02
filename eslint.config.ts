import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';

export default defineConfigWithVueTs(
  { name: 'app/files-to-lint', files: ['**/*.{ts,mts,vue}'] },
  { name: 'app/files-to-ignore', ignores: ['dist/**', 'node_modules/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    rules: {
      // highlightText 已先跳脫 HTML 才加 <mark>，允許 v-html
      'vue/no-v-html': 'off',
    },
  },
  skipFormatting,
);
