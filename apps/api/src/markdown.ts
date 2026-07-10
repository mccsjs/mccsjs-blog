// 评论内容 Markdown 渲染 + XSS 净化。
// 与 cwd 项目一致：先用 marked 渲染为 HTML，再用 xss 过滤白名单以外的标签/属性，
// 最终由前端以 innerHTML 插入（已净化，安全）。
import { marked } from 'marked'
import xss from 'xss'

// xss 通过 export = 暴露静态成员，default import 在 TS 下不方便取类型，这里做安全取值。
const XssStatic = xss as unknown as {
  FilterXSS: new (options: Record<string, unknown>) => { process(html: string): string }
  getDefaultWhiteList(): Record<string, string[]>
}

marked.setOptions({
  gfm: true,
  breaks: true, // 单换行即换行，更贴近评论场景
})

// 在 xss 默认白名单基础上，放开评论常用的安全标签
const BASE_WHITE_LIST = XssStatic.getDefaultWhiteList()
const WHITE_LIST: Record<string, string[]> = {
  ...BASE_WHITE_LIST,
  // 代码块 / 行内代码允许 class（用于语言高亮标签）
  code: ['class'],
  span: ['class', 'style'],
  pre: ['class'],
  // 链接允许 target/rel，xss 会自动拦截 javascript: 等危险协议
  a: ['href', 'title', 'target', 'rel'],
  // 图片只允许安全属性（class 用于表情图 sc-owo 标记）
  img: ['src', 'alt', 'title', 'width', 'height', 'style', 'class'],
  // 引用块
  blockquote: [],
  // 删除线
  del: [],
  // 表格（GFM）
  table: ['class'],
  thead: [],
  tbody: [],
  tr: [],
  th: ['align'],
  td: ['align'],
  // 任务列表
  input: ['type', 'checked', 'disabled'],
}

const sanitizer = new XssStatic.FilterXSS({ whiteList: WHITE_LIST })

/**
 * 将评论 Markdown 文本渲染为安全的 HTML 字符串。
 * 渲染失败（极端情况）时回退为纯文本转义，保证不会抛出。
 */
export async function renderCommentHtml(md: string | null | undefined): Promise<string> {
  if (!md) return ''
  try {
    // marked.parse 在不同构建下可能返回 string 或 Promise<string>，统一 await 兜底
    const rawHtml = await marked.parse(md)
    return sanitizer.process(rawHtml)
  } catch {
    // 兜底：仅做基础转义，避免注入
    return String(md)
      .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
      .replace(/\n/g, '<br>')
  }
}
