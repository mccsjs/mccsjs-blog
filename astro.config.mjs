// @ts-check
import swup from "@swup/astro";
import react from "@astrojs/react";
import lenis from "astro-lenis";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { siteConfig } from "./src/config/siteConfig.ts";

export default defineConfig({
  // 站点 URL：配置优先，其次 SITE_URL 环境变量，最后 localhost
  site: siteConfig.url || process.env.SITE_URL || "http://localhost:4321",
  // Sätteri 为 Astro 7 默认 Markdown 管线；此处显式启用 Shiki 双主题高亮
  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
  // GitHub Pages 子路径部署时通过 ASTRO_BASE 环境变量指定
  base: process.env.ASTRO_BASE || "/",
  // 顶层 server.host 控制 Astro 开发服务器的监听地址（vite.server.host 只管 vite 中间件，
  // 管不到 Astro 自己的 HTTP 监听）。设 true 绑定 0.0.0.0，确保 IPv4 的 127.0.0.1 也能访问，
  // 否则新版 Node 把 localhost 优先解析成 IPv6 ::1，浏览器走 IPv4 会连不上。
  server: {
    host: true,
  },
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
      allowedHosts: ['d.seln.cn', 'localhost', '127.0.0.1'],
    },
  },
});
