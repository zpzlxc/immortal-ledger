import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 的项目站点位于 /<repository>/，相对路径也兼容根域名静态托管。
  base: './',
});
