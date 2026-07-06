/**
 * CRC32 实现（标准 IEEE 多项式 0xEDB88320）
 */
const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32Hex(input: string): string {
  let crc = 0xFFFFFFFF;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  for (const b of data) {
    crc = crc32Table[(crc ^ b) & 0xFF]! ^ (crc >>> 8);
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).toLowerCase();
}

/**
 * 基于 CRC32 + HEX 生成唯一 slug
 * 若冲突则追加随机后缀重试
 */
export async function generateUniqueSlug(
  prisma: any,
  seed?: string,
): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const randomPart = Math.random().toString(36).slice(2, 7);
  const input = seed ? `${seed}-${datePart}-${randomPart}` : `${datePart}-${randomPart}`;
  const baseSlug = crc32Hex(input).slice(0, 8);

  let slug = baseSlug;
  let retry = 0;
  while (retry < 5) {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = baseSlug + Math.random().toString(36).slice(2, 4);
    retry++;
  }
  return slug;
}
