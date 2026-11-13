import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { templateCompilerOptions } from '@tresjs/core';

export default defineConfig({
  // 相對路徑：部署到 GitHub Pages 子路徑或其他主機的根目錄都能直接用
  base: './',
  // Vue 只用在後記的 TresJS 版（tres/）；教本本身不用框架
  plugins: [vue({ ...templateCompilerOptions })],
  build: {
    chunkSizeWarningLimit: 800, // three.js 的核心就約 540 kB
    rollupOptions: {
      input: { main: 'index.html', tres: 'tres/index.html' },
    },
  },
});
