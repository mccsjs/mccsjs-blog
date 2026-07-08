// @ts-check
// Vercel 部署配置：用 vercel adapter 让 prerender=false 的内容页走 Vercel 函数按需 SSR
// 构建：astro build -c astro.config.vercel.mjs
// 环境变量（部署平台设置）：PUBLIC_API_URL(后端域名) / SITE_URL(本站域名)
import swup from "@swup/astro";
import react from "@astrojs/react";
import lenis from "astro-lenis";
import vercel from "@astrojs/vercel";
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
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: '0.0.0.0',
      allowedHosts: ['d.seln.cn', 'localhost', '127.0.0.1'],
    },
  },
});
