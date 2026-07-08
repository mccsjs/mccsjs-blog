// @ts-check
// Cloudflare Pages 部署配置：用 cloudflare adapter 让 prerender=false 的内容页走 Worker 函数按需 SSR
// 构建：astro build -c astro.config.cloudflare.mjs
// 环境变量（CF 控制台 / wrangler secret）：PUBLIC_API_URL(后端域名) / SITE_URL(本站域名)
// 注意：后端若部署到 CF，需 wrangler.toml 开启 nodejs_compat（见 backend/wrangler.toml）
import swup from "@swup/astro";
import react from "@astrojs/react";
import lenis from "astro-lenis";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || "http://localhost:4321",
  integrations: [
    swup({
      theme: false,
      animationClass: "transition-swup-",
      containers: ["#swup-container"],
      smoothScrolling: false,
      preload: { hover: true, visible: false },
      accessibility: true,
      updateHead: { persistAssets: true },
      updateBodyClass: false,
      globalInstance: true,
      reloadScripts: { optin: true },
      resolveUrl: (url) => url,
      animateHistoryBrowsing: false,
    }),
    react(),
    lenis(),
  ],
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: '0.0.0.0',
      allowedHosts: ['d.seln.cn', 'localhost', '127.0.0.1'],
    },
  },
});
