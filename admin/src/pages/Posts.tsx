import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Post } from '../../../shared/src/index';
import Button from '../components/ui/button';
import { Icon } from '@iconify/react';

export default function Posts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['posts', 'admin'],
    queryFn: () => api('/api/posts?admin=true'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/api/posts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts', 'admin'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-[var(--text)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>文章管理</h1>
          <p className="text-sm text-[var(--text)]">共 {posts.length} 篇文章</p>
        </div>
        <Button onClick={() => navigate('/posts/new')}>
          <Icon icon="lucide:plus" width={16} height={16} />
          新建文章
        </Button>
      </div>

      <div className="table-wrap overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">标题</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden sm:table-cell">分类</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">状态</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden md:table-cell">阅读量</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden md:table-cell">更新时间</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--text)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="max-w-[200px] truncate px-4 py-3 font-medium text-[var(--text-h)]">{post.title}</td>
                <td className="hidden sm:table-cell px-4 py-3">{post.category?.name || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${post.published ? 'badge-green' : 'badge-yellow'}`}>
                    {post.published ? '已发布' : '草稿'}
                  </span>
                </td>
                <td className="hidden md:table-cell px-4 py-3">{post.views}</td>
                <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap">{new Date(post.updatedAt).toLocaleDateString()}</td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/posts/${post.slug}/edit`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)] transition-colors hover:bg-[var(--accent-bg)]"
                      title="编辑"
                    >
                      <Icon icon="lucide:pencil" width={15} height={15} />
                    </Link>
                    <a
                      href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}${post.coverImage || ''}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text)] transition-colors hover:bg-[var(--bg-muted)]"
                      title="前台预览"
                    >
                      <Icon icon="lucide:eye" width={15} height={15} />
                    </a>
                    <button
                      onClick={() => {
                        if (confirm('确定删除这篇文章？')) deleteMutation.mutate(post.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
                      title="删除"
                    >
                      <Icon icon="lucide:trash-2" width={15} height={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-[var(--text)]">
                  暂无文章，点击右上角「新建文章」开始写作
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
