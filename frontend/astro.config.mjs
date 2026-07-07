// @ts-check
import swup from "@swup/astro";
import react from "@astrojs/react";
import lenis from "astro-lenis";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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
  // 关闭 Astro 内置 Dev Toolbar：其内置的 audit app 会用 MutationObserver 监听 DOM 变动
  // （打字机/计时器每秒改 innerHTML 会持续触发），并反复 fetch 页面图片做审计，
  // 导致 dev 下 Network 面板图片循环加载。生产构建本就不加载 toolbar，无影响。
  devToolbar: {
    enabled: false,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: '0.0.0.0',
      allowedHosts: ['d.seln.cn', 'localhost', '127.0.0.1'],
    },
  },
});
