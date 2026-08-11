// 页脚配置（菜单 / 格言 / 徽章）
export const footerConfig = {
  menus: [] as { id: string; label: string; href: string; sortOrder: number }[],
  showMotto: true,
  mottoTitle: '格言🧬',
  mottoText:
    '你看，他们曾如此骄傲的活过，贯彻始终 — 以生命奏响了文明的颂歌。这是被称作英桀的人们的故事，是十三位逐火者未竟的旅途',
  mottoCtaText: '前往见证十三英桀的终末',
  mottoCtaUrl: 'https://www.bilibili.com/video/BV1fY4y1F7GL',
  mottoCtaTarget: '_blank',    
    // '_self' 表示在当前窗口/标签页打开，若设置为 '_blank' 则会新开窗口。
  footerBadges: '[]',
};
