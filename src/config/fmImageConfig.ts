// 文章封面配置（对应 frontmatter 的 fm 字段）
export const fmImageConfig = {
  // 是否在文章详情页显示封面图
  enableInPost: true,
  randomCoverImage: {
    // 随机封面开关：fm 未配置时自动从 API 随机
    enable: true,
    // 封面图 API 列表：构建期取第一个（带 seed 参数保证同文同图），客户端失败时按序切换
    apis: ['https://t.alcy.cc/pc', 'https://uapis.cn/api/v1/random/image'],
  },
} as const;
