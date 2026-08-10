// 留言板配置
export interface MessageAnnouncementItem {
  id: string;
  title: string;
  summary: string;
  lead?: string;
  rules?: string[];
}

export const messageConfig = {
  // Twikoo 频道路径
  path: '/comments/',
  // 每页拉取条数
  pageSize: 30,
  // 轮询间隔（毫秒）
  pollInterval: 30000,
  // 公告列表（首次访问弹窗 + 顶部公告栏）
  announcements: [] as MessageAnnouncementItem[],
} as const;
