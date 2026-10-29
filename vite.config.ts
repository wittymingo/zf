import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相对路径产物：同一份 dist 既能部署在根域（Cloudflare Pages），也能放在子路径（GitHub Pages 项目站）
  base: './',
  plugins: [react()],
})
