import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Post, Comment } from '../../../shared/src/index';
import { Icon } from '@iconify/react';

export default function Dashboard() {
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['posts', 'admin'],
    queryFn: () => api('/api/posts?admin=true'),
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', 'admin'],
    queryFn: () => api('/api/comments?admin=true'),
  });

  const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
  const hiddenComments = comments.filter((c) => !c.visible).length;

  const stats = [
    {
      label: '文章总数',
      value: posts.length,
      icon: 'file-text',
      href: '/posts',
      gradient: 'from-indigo-500 to-violet-500',
    },
    {
      label: '已隐藏评论',
      value: hiddenComments,
      icon: 'message-square',
      href: '/comments',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      label: '总阅读量',
      value: totalViews,
      icon: 'eye',
      href: '/posts',
      gradient: 'from-emerald-500 to-teal-500',
    },
  ];

  const quickActions = [
    { label: '写文章', href: '/posts/new', icon: 'pen-tool' },
    { label: '管理文章', href: '/posts', icon: 'file-text' },
    { label: '管理评论', href: '/comments', icon: 'message-square' },
  ];

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div>
        <h1>仪表盘</h1>
        <p className="text-sm text-[var(--text)]">欢迎回来，这里是你的博客概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="card group p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-[var(--text)]">{stat.label}</div>
                <div className="mt-2 text-3xl font-bold text-[var(--text-h)]">{stat.value}</div>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-sm`}
              >
                <Icon icon={`lucide:${stat.icon}`} className="text-white" width={22} height={22} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 快捷入口 */}
      <div className="card p-6">
        <h2 className="mb-4">快捷入口</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="group flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-4 transition-all hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent)]">
                  <Icon icon={`lucide:${action.icon}`} width={18} height={18} />
                </div>
                <span className="text-sm font-medium text-[var(--text-h)]">{action.label}</span>
              </div>
              <Icon
                icon="lucide:arrow-right"
                width={16}
                height={16}
                className="text-[var(--text)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* 最近文章 */}
      {posts.length > 0 && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2>最近文章</h2>
            <Link
              to="/posts"
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-2">
            {posts.slice(0, 5).map((post) => (
              <Link
                key={post.id}
                to={`/posts/${post.slug}/edit`}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-soft)]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${
                      post.published ? 'badge-green' : 'badge-yellow'
                    }`}
                  >
                    {post.published ? '已发布' : '草稿'}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-h)]">{post.title}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text)]">
                  <span className="flex items-center gap-1">
                    <Icon icon="lucide:eye" width={13} height={13} />
                    {post.views}
                  </span>
                  <span>{new Date(post.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
