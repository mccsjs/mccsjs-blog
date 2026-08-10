// 共享初始化注册表：各功能模块在加载时注册自己的 init，
// 由 entry.js 在首屏 + 每次 Swup 切页（astro:page-load）时统一调用。
export const inits = [];

export function registerInit(name, fn) {
  inits.push({ name, fn });
}

export function runInits() {
  for (const i of inits) {
    try {
      i.fn();
    } catch (e) {
      console.error('[base] init failed:', i.name, e);
    }
  }
}
