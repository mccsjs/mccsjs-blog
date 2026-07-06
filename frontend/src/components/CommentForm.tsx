import { useState } from 'react';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PUBLIC_API_URL)
  || (typeof process !== 'undefined' && process.env && process.env.PUBLIC_API_URL)
  || '';

interface CommentFormProps {
  postId: string;
}

export default function CommentForm({ postId }: CommentFormProps) {
  const [author, setAuthor] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !email.trim()) return;
    setStatus('submitting');

    try {
      const response = await fetch((API_URL || '') + '/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          author: author.trim(),
          email: email.trim(),
          website: website.trim() || null,
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `提交失败：${response.status}`);
      }

      setStatus('success');
      setMessage('评论已提交。');
      setAuthor('');
      setEmail('');
      setWebsite('');
      setContent('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : '提交评论时出错');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-[rgb(var(--card-bg))] p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="author" className="mb-1.5 block text-sm font-medium text-[rgb(var(--fg-soft))]">
            昵称 <span className="text-red-500">*</span>
          </label>
          <input
            id="author"
            type="text"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full rounded-lg border border-[rgb(var(--card-border))] bg-[rgb(var(--card-bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--fg-muted))] focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
            placeholder="你的名字"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[rgb(var(--fg-soft))]">
            邮箱 <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[rgb(var(--card-border))] bg-[rgb(var(--card-bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--fg-muted))] focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-[rgb(var(--fg-soft))]">
            网址
          </label>
          <input
            id="website"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full rounded-lg border border-[rgb(var(--card-border))] bg-[rgb(var(--card-bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--fg-muted))] focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
            placeholder="example.com"
          />
        </div>
      </div>

      <div className="mt-4">
        <textarea
          id="content"
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full resize-none rounded-lg border border-[rgb(var(--card-border))] bg-[rgb(var(--card-bg))] px-3 py-2.5 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--fg-muted))] focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
          placeholder="写下你的评论...支持 Markdown 语法"
        />
      </div>

      <div className="mt-3 flex items-center justify-end">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-medium text-[rgb(var(--fg))] shadow-sm hover:bg-yellow-500 disabled:opacity-60"
        >
          {status === 'submitting' ? '提交中...' : '发表评论'}
        </button>
      </div>

      {status === 'success' && (
        <p className="mt-3 text-sm font-medium text-green-600">{message}</p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm font-medium text-red-600">{message}</p>
      )}
    </form>
  );
}
