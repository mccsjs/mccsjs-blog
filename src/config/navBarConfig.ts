// 导航菜单（原 data/menus.json NAV）
export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: string;
  sortOrder: number;
}

// 图标菜单子项（聚合菜单 GROUP 的 children）
export interface GroupMenuChild {
  id: string;
  label: string;
  href: string;
  // 支持三种：图片路径 / emoji / Iconify 标识符
  icon: string;
  target?: string;
}

// 图标菜单分组（Header 左上角 logo 按钮点击展开）
export interface GroupMenuConfig {
  id: string;
  label: string;
  children: GroupMenuChild[];
}

export const navBarConfig: { nav: NavItemConfig[]; group: GroupMenuConfig[] } = {
  nav: [
    {
      id: 'd10235a7-4d5f-44c9-9c60-9dd3caecdb0c',
      label: '首页',
      href: '/',
      icon: 'material-symbols:home-outline-rounded',
      sortOrder: 0,
    },
    {
      id: 'f99c0a0d-5524-4e21-8683-7670521c22f5',
      label: '文章',
      href: '/posts',
      icon: 'solar:book-broken',
      sortOrder: 1,
    },
    {
      id: '92dabefd-49f6-4a69-9a00-073c07fa9135',
      label: '留言',
      href: '/comments',
      icon: 'boxicons:message',
      sortOrder: 2,
    },
    {
      id: '9e67b81d-9d34-46cf-bdef-6ead9fcb5d61',
      label: '友链',
      href: '/link',
      icon: 'line-md:link',
      sortOrder: 3,
    },
    {
      id: '7f3a7680-c1e7-4f30-bef3-22de73723168',
      label: '关于',
      href: '/about',
      icon: 'ix:about',
      sortOrder: 4,
    },
  ],
  group: [
    {
      id: 'group-quick',
      label: '快捷入口',
      children: [
        { id: 'g-rss', label: 'RSS 订阅', href: '/rss.xml', icon: 'material-symbols:rss-feed-rounded', target: '_blank' },
        { id: 'g-archive', label: '归档', href: '/archive', icon: 'material-symbols:archive-outline' },
        { id: 'g-comments', label: '留言板', href: '/comments', icon: 'boxicons:message-rounded' },
      ],
    },
  ],
};
