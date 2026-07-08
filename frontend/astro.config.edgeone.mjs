// @ts-check
// 腾讯 EdgeOne Pages 部署配置：用 @edgeone/astro adapter 让 prerender=false 的内容页走边缘函数按需 SSR
// 构建：astro build -c astro.config.edgeone.mjs
// 环境变量（EdgeOne 控制台）：PUBLIC_API_URL(后端域名) / SITE_URL(本站域名)
// 说明：EdgeOne 自动检测 Astro，构建输出由 adapter 处理；PUBLIC_API_URL 必须指向已部署的后端函数域名
import swup from "@swup/astro";
import react from "@astrojs/react";
import lenis from "astro-lenis";
import edgeone from "@edgeone/astro";
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
  adapter: edgeone(),
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: '0.0.0.0',
      allowedHosts: ['d.seln.cn', 'localhost', '127.0.0.1'],
    },
  },
});
