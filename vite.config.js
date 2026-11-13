import { defineConfig } from 'vite';

// 相對路徑：部署到 GitHub Pages 子路徑或 Firebase 根目錄都能直接用
export default defineConfig({
  base: './',
  // WebGLRenderer 核心就約 540 kB，單一頁面不需要拆包
  build: { chunkSizeWarningLimit: 600 },
});
