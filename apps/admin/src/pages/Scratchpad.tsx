import { useEffect, useState, useCallback } from 'react';
import { Textarea } from '../components/ui/textarea';
import { Icon } from '@iconify/react';

const STORAGE_KEY = 'mccsjsblog-admin-scratchpad';

export default function Scratchpad() {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    const savedContent = localStorage.getItem(STORAGE_KEY);
    if (savedContent) {
      setContent(savedContent);
      setWordCount(savedContent.trim().length);
    }
  }, []);

  const handleChange = useCallback((value: string) => {
    setContent(value);
    setWordCount(value.trim().length);
    localStorage.setItem(STORAGE_KEY, value);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('确定清空速记板吗？')) {
      setContent('');
      setWordCount(0);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1>速记板</h1>
          <p className="text-sm text-[var(--text)]">临时记录，仅保存在本地浏览器</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text)]">{wordCount} 字</span>
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-h)]"
          >
            <Icon icon="lucide:trash-2" width={13} height={13} />
            清空
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-1">
        <Textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="输入内容……"
          className="min-h-[60vh] resize-none border-0 bg-transparent px-5 py-4 text-sm leading-relaxed placeholder:text-[var(--border-strong)] focus:ring-0"
          spellCheck={false}
        />
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-xs text-[var(--text)]">
            <Icon
              icon={saved ? 'lucide:check' : 'lucide:cloud'}
              width={12}
              height={12}
              className={saved ? 'text-[var(--accent)]' : ''}
            />
            {saved ? '已保存' : '自动保存中'}
          </span>
        </div>
      </div>
    </div>
  );
}
