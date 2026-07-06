import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Comment } from '../../../shared/src/index';
import { Icon } from '@iconify/react';

export default function Comments() {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', 'admin'],
    queryFn: () => api('/api/comments?admin=true'),
  });

  const visibleMutation = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      api<Comment>(`/api/comments/${id}/visible`, {
        method: 'PATCH',
        body: JSON.stringify({ visible }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', 'admin'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/api/comments/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', 'admin'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-[var(--text)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
        加载中...
      </div>
    );
  }

  const hiddenCount = comments.filter((c) => !c.visible).length;

  return (
    <div className="space-y-6">
      <div>
        <h1>评论管理</h1>
        <p className="text-sm text-[var(--text)]">
          共 {comments.length} 条评论，{hiddenCount} 条已隐藏
        </p>
      </div>

      <div className="table-wrap overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">作者</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">内容</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden sm:table-cell">状态</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden md:table-cell">时间</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--text)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((comment) => (
              <tr key={comment.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-xs font-semibold text-[var(--accent)]">
                      {(comment.author || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 max-w-[140px]">
                      <div className="truncate font-medium text-[var(--text-h)]">{comment.author}</div>
                      <div className="truncate text-xs text-[var(--text)]">{comment.email}</div>
                    </div>
                  </div>
                </td>
                <td className="max-w-[200px] px-4 py-3">
                  <div className="line-clamp-2 whitespace-pre-wrap text-[var(--text)]">
                    {comment.content}
                  </div>
                </td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <span className={`badge ${comment.visible ? 'badge-green' : 'badge-yellow'}`}>
                    {comment.visible ? '显示中' : '已隐藏'}
                  </span>
                </td>
                <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-xs text-[var(--text)]">
                  {new Date(comment.createdAt).toLocaleString()}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => visibleMutation.mutate({ id: comment.id, visible: !comment.visible })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text)] transition-colors hover:bg-[var(--bg-muted)]"
                      title={comment.visible ? '隐藏' : '显示'}
                    >
                      {comment.visible ? <Icon icon="lucide:eye-off" width={15} height={15} /> : <Icon icon="lucide:eye" width={15} height={15} />}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('确定删除该评论？')) deleteMutation.mutate(comment.id);
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
            {comments.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-[var(--text)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-muted)]">
                      <Icon icon="lucide:message-square" width={22} height={22} className="text-[var(--text)]" />
                    </div>
                    <span>暂无评论</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
