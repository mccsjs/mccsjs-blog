// 表情库（OwO 格式）：构建 key→图片 URL 索引
// 兼容两种数据形态：
//   1. 本地 public/owo.json（object: { 包名: {type, container:[{text, icon}]} }，icon 可能是 <img src='...'> HTML）
//   2. 在线 owo.imaegoo.com/owo.json（array: [{type, container:[{text, icon}]}]，icon 是纯 URL）
export interface OwOItem {
  text: string;
  icon: string;
}
export interface OwOPack {
  name: string;
  icon: string;
  items: OwOItem[];
}

interface OwORawPack {
  type?: string;
  container?: OwOItem[];
}

const OWO_LOCAL_URL = '/owo.json';
const OWO_REMOTE_URL = 'https://owo.imaegoo.com/owo.json';

let cache: { packs: OwOPack[]; byKey: Map<string, string> } | null = null;
let inflight: Promise<{ packs: OwOPack[]; byKey: Map<string, string> }> | null = null;

/** 从 Twikoo 格式的 icon 字段提取图片 URL（兼容 "<img src='...'>" 与纯 URL） */
function extractIconUrl(icon: string): string {
  const match = icon.match(/src=['"]([^'"]+)['"]/);
  return match ? match[1] : icon;
}

function buildIndex(entries: [string | null, OwORawPack][]) {
  const byKey = new Map<string, string>();
  const normalized: OwOPack[] = [];
  for (const [name, raw] of entries) {
    const items: OwOItem[] = [];
    for (const it of raw.container ?? []) {
      if (typeof it?.text !== 'string' || typeof it?.icon !== 'string') continue;
      const key = it.text.trim();
      if (!key) continue;
      items.push({ text: key, icon: extractIconUrl(it.icon) });
      byKey.set(key, extractIconUrl(it.icon));
    }
    if (items.length === 0) continue;
    normalized.push({
      name: name ?? items[0]?.text ?? '表情',
      icon: items[0]?.icon ?? '',
      items,
    });
  }
  return { packs: normalized, byKey };
}

/** 拉取并解析 OwO 数据（本地优先，失败回退在线）；并发安全，模块级单次加载 */
export async function loadEmojiPacks(): Promise<OwOPack[]> {
  if (cache) return cache.packs;
  if (inflight) return (await inflight).packs;
  inflight = (async () => {
    const sources: string[] = [OWO_LOCAL_URL, OWO_REMOTE_URL];
    let parsed: { packs: OwOPack[]; byKey: Map<string, string> } | null = null;
    for (const url of sources) {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) continue;
        const raw = await res.json();
        // object 形态：{ 包名: {type, container} } → 保留包名作为分类名
        const entries: [string | null, OwORawPack][] = Array.isArray(raw)
          ? raw.map((p) => [null, p] as [string | null, OwORawPack])
          : (Object.entries(raw) as [string, OwORawPack][])
              .filter(([, v]) => v && typeof v === 'object' && Array.isArray(v.container))
              .map(([name, v]) => [name, v] as [string | null, OwORawPack]);
        parsed = buildIndex(entries);
        if (parsed.byKey.size > 0) break;
      } catch {
        // 尝试下一个源
      }
    }
    if (!parsed) throw new Error('表情包加载失败');
    cache = parsed;
    return parsed;
  })();
  try {
    return (await inflight).packs;
  } finally {
    inflight = null;
  }
}

/** 返回已缓存的表情包列表（含分类与 item），供表情面板使用 */
export function getEmojiPacks(): OwOPack[] {
  return cache?.packs ?? [];
}

/** 把文本里的 ":key:" 短码替换成 "![:key:](url)"，交给 marked 渲染成 <img> */
export function convertEmojiShortcodes(text: string): string {
  const map = cache?.byKey;
  if (!map) return text;
  return text.replace(
    /:([A-Za-z0-9_\-\u4e00-\u9fa5]{1,32})/g,
    (match, key: string) => {
      const icon = map.get(key);
      if (!icon) return match;
      // 图片类短码 → 转成 <img>；颜文字/emoji 类直接输出原字符
      if (/^https?:\/\//i.test(icon)) {
        return `![${key}](${icon} "emoji")`;
      }
      return icon;
    },
  );
}
