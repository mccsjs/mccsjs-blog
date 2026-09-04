// 页脚配置（菜单 / 格言 / 徽章）
import beianImg from '../assets/io/beian.svg?url';
import blueImg from '../assets/io/blue.svg?url';
import moeImg from '../assets/io/moe.svg?url';
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
  footerBadges: JSON.stringify([
    { title: '博客框架为Astro', href: 'https://astro.build', img: 'https://img.shields.io/badge/Astro-BC52EE?style=flat&logo=astro&logoColor=fff' },
    { title: '本站已备案', href: 'https://beian.miit.gov.cn/', img: beianImg },
    { title: '本站已公安网站备案', href: 'https://beian.mps.gov.cn/#/query/webSearch?code=32083002000282', img: blueImg },
    { title: '本站已加入萌ICP，萌ICP备20230187号', href: 'https://icp.gov.moe/?keyword=20230187', img: moeImg },
    { title: '本站已加入茶ICP，茶ICP备2025090177号', href: 'https://icp.redcha.cn/beian/ICP-2025090177.html', img: 'https://img.shields.io/badge/%E8%8C%B6ICP%E5%A4%87-2025090177%E5%8F%B7-blue?style=flat' },
  ]),
};
