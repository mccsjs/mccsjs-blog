import { useEffect, useMemo, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import { Icon } from '@iconify/react';

interface SplitMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onWordCountChange?: (count: number) => void;
}

const UPLOAD_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000') + '/api/imgbed/upload';

function insertAt(textarea: HTMLTextAreaElement, before: string, after: string = '') {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);
  const replacement = before + selected + after;
  textarea.setRangeText(replacement, start, end, 'end');
  textarea.focus();
  return textarea.value;
}

function wrapLine(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart;
  const text = textarea.value;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = text.indexOf('\n', start);
  const end = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, end);
  const newLine = line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line;
  textarea.setRangeText(newLine, lineStart, end, 'end');
  textarea.focus();
  return textarea.value;
}

export default function SplitMarkdownEditor({
  value,
  onChange,
  placeholder = '开始写作...',
  onWordCountChange,
}: SplitMarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const md = useMemo(
    () =>
      new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true,
      }),
    []
  );

  const previewHtml = useMemo(() => md.render(value || ''), [md, value]);
  const wordCount = useMemo(() => {
    if (!value) return 0;
    return value.replace(/\s/g, '').length;
  }, [value]);

  useEffect(() => {
    onWordCountChange?.(wordCount);
  }, [wordCount, onWordCountChange]);

  const handleChange = (next: string) => {
    onChange(next);
  };

  // 绑定左侧 textarea 与右侧预览的滚动：滚动其中一个时另一个按比例跟随
  const syncScroll = (source: 'textarea' | 'preview') => {
    if (isSyncingScroll.current) return;
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (!textarea || !preview) return;

    const sourceEl = source === 'textarea' ? textarea : preview;
    const targetEl = source === 'textarea' ? preview : textarea;
    const sourceMax = sourceEl.scrollHeight - sourceEl.clientHeight;
    const targetMax = targetEl.scrollHeight - targetEl.clientHeight;
    const ratio = sourceMax <= 0 ? 0 : sourceEl.scrollTop / sourceMax;

    isSyncingScroll.current = true;
    targetEl.scrollTop = ratio * targetMax;
    window.requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const apply = (action: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let next = value;
    switch (action) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const level = parseInt(action.slice(1), 10);
        next = wrapLine(textarea, '#'.repeat(level) + ' ');
        break;
      }
      case 'bold':
        next = insertAt(textarea, '**', '**');
        break;
      case 'italic':
        next = insertAt(textarea, '*', '*');
        break;
      case 'strike':
        next = insertAt(textarea, '~~', '~~');
        break;
      case 'quote':
        next = wrapLine(textarea, '> ');
        break;
      case 'ul':
        next = wrapLine(textarea, '- ');
        break;
      case 'ol':
        next = wrapLine(textarea, '1. ');
        break;
      case 'check':
        next = wrapLine(textarea, '- [ ] ');
        break;
      case 'link':
        next = insertAt(textarea, '[', '](https://)');
        break;
      case 'image':
        fileInputRef.current?.click();
        return;
      case 'code':
        next = insertAt(textarea, '```\n', '\n```');
        break;
      case 'inline-code':
        next = insertAt(textarea, '`', '`');
        break;
      case 'hr':
        next = insertAt(textarea, '\n---\n', '');
        break;
    }
    handleChange(next);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        let msg = '上传失败';
        try {
          const err = await response.json();
          if (err?.error) msg = err.error;
        } catch {
          /* 忽略解析失败，使用默认提示 */
        }
        throw new Error(msg);
      }
      const result = await response.json();
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
      const url = (result.url as string).startsWith('http') ? result.url : `${baseUrl}${result.url}`;
      const textarea = textareaRef.current;
      if (textarea) {
        const next = insertAt(textarea, `\n![${file.name}](${url})\n`, '');
        handleChange(next);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await uploadFile(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const file = e.clipboardData.files?.[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      await uploadFile(file);
    }
  };

  const toolbarItems = [
    { action: 'bold', icon: 'bold', title: '粗体' },
    { action: 'italic', icon: 'italic', title: '斜体' },
    { action: 'strike', icon: 'strikethrough', title: '删除线' },
    { action: 'separator' },
    { action: 'h1', icon: 'heading-1', title: 'H1' },
    { action: 'h2', icon: 'heading-2', title: 'H2' },
    { action: 'h3', icon: 'heading-3', title: 'H3' },
    { action: 'h4', icon: 'heading-4', title: 'H4' },
    { action: 'h5', icon: 'heading-5', title: 'H5' },
    { action: 'h6', icon: 'heading-6', title: 'H6' },
    { action: 'separator' },
    { action: 'quote', icon: 'quote', title: '引用' },
    { action: 'ul', icon: 'list', title: '无序列表' },
    { action: 'ol', icon: 'list-ordered', title: '有序列表' },
    { action: 'check', icon: 'list-checks', title: '任务列表' },
    { action: 'separator' },
    { action: 'link', icon: 'link', title: '链接' },
    { action: 'image', icon: 'image', title: '图片' },
    { action: 'code', icon: 'code', title: '代码块' },
    { action: 'inline-code', icon: 'code-2', title: '行内代码' },
    { action: 'hr', icon: 'minus', title: '分隔线' },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* 格式工具栏 */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-[#e5e7eb] bg-[#f8f9fa] px-3 py-1.5">
        {toolbarItems.map((item, idx) =>
          item.action === 'separator' ? (
            <div key={idx} className="mx-1 h-4 w-px bg-[#dcdfe6]" />
          ) : (
            <button
              key={item.action}
              type="button"
              title={item.title}
              disabled={item.action === 'image' && uploading}
              onClick={() => apply(item.action)}
              className="flex h-7 w-7 items-center justify-center rounded text-[#606266] transition-colors hover:bg-[#e4e6e9] hover:text-[#303133] disabled:opacity-50"
            >
              <Icon icon={`lucide:${item.icon}`} width={15} height={15} />
            </button>
          )
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {uploading && <span className="ml-2 text-xs text-[#909399]">上传中...</span>}
      </div>

      {/* 分屏编辑区：PC 左右各 50%，手机只显示左侧编辑区 */}
      <div className="relative flex w-full flex-1 overflow-hidden">
        {/* 左侧：源码 */}
        <div className="flex w-full min-w-0 flex-col overflow-hidden bg-white md:w-1/2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onScroll={() => syncScroll('textarea')}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="h-full w-full resize-none border-0 bg-white py-5 pl-6 pr-5 font-mono text-[15px] leading-7 text-[#303133] outline-none placeholder:text-[#c0c4cc]"
            spellCheck={false}
          />
        </div>

        {/* 中间分割线（PC 可见，手机隐藏） */}
        <div className="hidden w-px shrink-0 bg-[#c0c4cc] md:block" aria-hidden="true" />

        {/* 右侧：预览（PC 可见，手机隐藏） */}
        <div className="hidden w-1/2 min-w-0 flex-col overflow-hidden bg-[#fafafa] md:flex">
          {value?.trim() ? (
            <div
              ref={previewRef}
              onScroll={() => syncScroll('preview')}
              className="post-preview scrollbar-hidden h-full overflow-y-auto py-5 pl-5 pr-6 text-[15px] leading-7 text-[#303133]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-5 text-[#c0c4cc]">
              <Icon icon="lucide:eye" width={32} height={32} className="mb-2 opacity-30" />
              <span className="text-sm">右侧预览区域</span>
              <span className="mt-1 text-xs opacity-70">在左侧输入 Markdown 后此处实时渲染</span>
            </div>
          )}
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="flex shrink-0 items-center justify-end gap-4 border-t border-[#e5e7eb] bg-[#f8f9fa] px-4 py-1.5 text-xs text-[#909399]">
        <span>字数：{wordCount}</span>
        <span>阅读时长：约 {Math.max(1, Math.ceil(wordCount / 300))} 分钟</span>
      </div>
    </div>
  );
}
