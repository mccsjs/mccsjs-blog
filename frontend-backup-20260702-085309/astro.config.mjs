// @ts-check
import swup from "@swup/astro";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://blog.seln.cn",
  integrations: [
    swup({
      theme: false,
      animationClass: "transition-swup-",
      containers: ["#swup-container"],
      smoothScrolling: false,
      cache: true,
      preload: true,
      accessibility: true,
      updateHead: false,
      updateBodyClass: false,
      globalInstance: true,
      resolveUrl: (url) => url,
      animateHistoryBrowsing: false,
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shiki: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
});
