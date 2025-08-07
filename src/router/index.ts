import { createRouter, createWebHistory } from 'vue-router';

const routes = [
//   {
//     path: '/',
//     name: 'Home',
//     component: () => import('../views/Home.vue') // 動態載入 Home.vue
//   },
//   {
//     path: '/about',
//     name: 'About',
//     component: () => import('../views/About.vue') // 動態載入 About.vue
//   }
];

// 建立路由實例
const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;