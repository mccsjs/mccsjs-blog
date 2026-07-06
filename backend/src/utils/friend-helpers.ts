/**
 * 根据友链 URL 自动生成截图地址（基于 WordPress mshots API）
 */
export function autoScreenshot(url: string): string {
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=600&h=400`;
}

/**
 * 如果友链没有截图，动态生成 mshots URL（不存库，仅返回时补充）
 */
export function enrichFriendScreenshot<
  T extends { url: string; screenshot: string | null; isInvalid: boolean },
>(friend: T): T {
  if (friend.screenshot || friend.isInvalid) return friend;
  return { ...friend, screenshot: autoScreenshot(friend.url) };
}
