// Sätteri + Shiki 渲染（Astro 7 默认 Markdown 管线）
import type { MarkdownHeading } from 'astro';
import {
  createSatteriMarkdownProcessor,
  type SatteriMarkdownProcessorOptions,
} from '@astrojs/markdown-satteri';

// 单例渲染器：构建/请求期只初始化一次（Shiki 加载较重）
let processorPromise: Promise<Awaited<ReturnType<typeof createSatteriMarkdownProcessor>>> | null =
  null;

function getProcessor() {
  if (!processorPromise) {
    processorPromise = createSatteriMarkdownProcessor({
      syntaxHighlight: 'shiki',
      shikiConfig: {
        themes: { light: 'github-light', dark: 'github-dark' },
        wrap: true,
      },
    } as SatteriMarkdownProcessorOptions);
  }
  return processorPromise;
}

export interface RenderedMarkdown {
  html: string;
  headings: MarkdownHeading[];
}

// 用 Sätteri 渲染 Markdown，返回 HTML 与标题（含 slug，与渲染出的 id 一致）
export async function renderMarkdown(source: string): Promise<RenderedMarkdown> {
  const processor = await getProcessor();
  const { code, metadata } = await processor.render(source);
  return { html: code, headings: metadata.headings };
}
