// @ts-check
// 腾讯 EdgeOne Pages 部署配置（纯静态输出，无 adapter）
// 构建：astro build -c astro.config.edgeone.mjs
// 环境变量：PUBLIC_API_URL(后端域名) / SITE_URL(本站域名)
// 说明：@edgeone/astro 当前 peer 锁定 astro@^5，与本项目 astro@7 不兼容，
// 故前端走纯静态 SSG（所有页 prerender），运行时由浏览器向 PUBLIC_API_URL 取数。
import swup from "@swup/astro";
import react from "@astrojs/react";
import lenis from "astro-lenis";
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
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: '0.0.0.0',
      allowedHosts: ['blog.seln.cn', 'ad.seln.cn', 'api.seln.cn', 'localhost', '127.0.0.1'],
    },
  },
});
