import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Icon } from '@iconify/react';

interface FriendType {
  id: string;
  name: string;
  sort: number;
  isVisible: boolean;
  count: number;
}

interface Friend {
  id: string;
  name: string;
  url: string;
  description: string;
  avatar: string;
  screenshot: string;
  sort: number;
  isInvalid: boolean;
  recommended: boolean;
  accessible: number;
  latency: number;
  typeId: string | null;
  type: FriendType | null;
  createdAt: string;
}

interface FriendFormData {
  name: string;
  url: string;
  description: string;
  avatar: string;
  screenshot: string;
  sort: number;
  isInvalid: boolean;
  typeId: string;
}

interface TypeFormData {
  name: string;
  sort: number;
  isVisible: boolean;
}

export default function Friends() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [editingType, setEditingType] = useState<FriendType | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // ===== Queries =====
  const { data: types = [] } = useQuery({
    queryKey: ['friend-types'],
    queryFn: () => api<FriendType[]>('/api/admin/friend-types', { method: 'GET' }),
  });

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['friends', keyword, typeFilter],
    queryFn: () => api<Friend[]>(`/api/admin/friends?keyword=${encodeURIComponent(keyword)}&typeId=${encodeURIComponent(typeFilter)}`, { method: 'GET' }),
  });

  // ===== Mutations: Types =====
  const createType = useMutation({
    mutationFn: (data: TypeFormData) => api<void>('/api/admin/friend-types', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friend-types'] }); },
  });

  const updateType = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TypeFormData> }) => api<void>(`/api/admin/friend-types/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friend-types'] }); },
  });

  const deleteType = useMutation({
    mutationFn: (id: string) => api<void>(`/api/admin/friend-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friend-types'] }); },
  });

  // ===== Mutations: Friends =====
  const createFriend = useMutation({
    mutationFn: (data: FriendFormData) => api<void>('/api/admin/friends', { 
      method: 'POST', 
      body: JSON.stringify({ ...data, typeId: data.typeId || null }) 
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friends'] }); setShowForm(false); setEditingFriend(null); },
  });

  const updateFriend = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FriendFormData> }) => api<void>(`/api/admin/friends/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify({ ...data, typeId: data.typeId || null }) 
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friends'] }); setShowForm(false); setEditingFriend(null); },
  });

  const deleteFriend = useMutation({
    mutationFn: (id: string) => api<void>(`/api/admin/friends/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friends'] }); },
  });

  const toggleInvalid = useMutation({
    mutationFn: ({ id, isInvalid }: { id: string; isInvalid: boolean }) => api<void>(`/api/admin/friends/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify({ isInvalid: !isInvalid }) 
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friends'] }); },
  });

  // 推荐 / 取消推荐
  const toggleRecommend = useMutation({
    mutationFn: (id: string) => api<{ id: string; recommended: boolean }>(`/api/admin/friends/${id}/recommend`, { 
      method: 'POST' 
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friends'] }); },
  });

  // ===== Mutations: Speed Check =====
  const checkFriend = useMutation({
    mutationFn: (id: string) => api<{ accessible: number; latency: number }>(`/api/admin/friends/${id}/check`, { method: 'POST' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friends'] }); },
  });

  const checkAllFriends = useMutation({
    mutationFn: () => api<{ total: number; results: { id: string; name: string; accessible: number; latency: number }[] }>('/api/admin/friends/check-all', { method: 'POST' }),
    onSuccess: (data) => { 
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      alert(`已完成 ${data.total} 条友链测速`);
    },
  });

  // ===== Forms =====
  const friendForm = useForm<FriendFormData>({ defaultValues: { name: '', url: '', description: '', avatar: '', screenshot: '', sort: 5, isInvalid: false, typeId: '' } });
  const typeForm = useForm<TypeFormData>({ defaultValues: { name: '', sort: 0, isVisible: true } });

  const openEditFriend = (friend: Friend) => {
    setEditingFriend(friend);
    friendForm.reset({ name: friend.name, url: friend.url, description: friend.description, avatar: friend.avatar, screenshot: friend.screenshot, sort: friend.sort, isInvalid: friend.isInvalid, typeId: friend.typeId || '' });
    setShowForm(true);
  };

  const openNewFriend = () => {
    setEditingFriend(null);
    friendForm.reset({ name: '', url: '', description: '', avatar: '', screenshot: '', sort: 5, isInvalid: false, typeId: '' });
    setShowForm(true);
  };

  const handleFriendSubmit = (data: FriendFormData) => {
    if (editingFriend) {
      updateFriend.mutate({ id: editingFriend.id, data });
    } else {
      createFriend.mutate(data);
    }
  };

  const openEditType = (type: FriendType) => {
    setEditingType(type);
    typeForm.reset({ name: type.name, sort: type.sort, isVisible: type.isVisible });
  };

  const handleTypeSubmit = (data: TypeFormData) => {
    if (editingType) {
      updateType.mutate({ id: editingType.id, data });
      setEditingType(null);
    } else {
      createType.mutate(data);
    }
    typeForm.reset({ name: '', sort: 0, isVisible: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-h)]">友链管理</h1>
          <p className="text-sm text-[var(--text)] mt-1">管理友情链接分组和条目</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 主操作：始终可见 */}
          <Button onClick={openNewFriend} className="sm:flex">
            <Icon icon="lucide:plus" width={16} height={16} className="mr-1.5" />
            新增友链
          </Button>
          {/* 手机端溢出菜单 */}
          <div ref={headerRef} className="relative sm:hidden">
            <Button variant="secondary" onClick={() => setHeaderMenuOpen(!headerMenuOpen)}>
              <Icon icon="lucide:more-horizontal" width={18} height={18} />
            </Button>
            {headerMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setHeaderMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1 shadow-xl">
                  <button
                    onClick={() => { setHeaderMenuOpen(false); if (confirm('将对所有有效友链进行测速，可能需要一些时间，确定？')) checkAllFriends.mutate(); }}
                    disabled={checkAllFriends.isPending}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--text-h)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
                  >
                    <Icon icon="lucide:zap" width={15} height={15} />
                    批量测速
                  </button>
                  <button
                    onClick={() => { setHeaderMenuOpen(false); setShowTypeManager(!showTypeManager); }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--text-h)] hover:bg-[var(--bg-muted)] transition-colors"
                  >
                    <Icon icon="lucide:folder-tree" width={15} height={15} />
                    类型管理{showTypeManager ? ' 收起' : ' 展开'}
                  </button>
                </div>
              </>
            )}
          </div>
          {/* 桌面端：完整按钮组 */}
          <span className="hidden sm:flex items-center gap-2">
            <Button variant="secondary" onClick={() => { if (confirm('将对所有有效友链进行测速，可能需要一些时间，确定？')) checkAllFriends.mutate(); }} disabled={checkAllFriends.isPending}>
              <Icon icon="lucide:zap" width={16} height={16} className="mr-1.5" />
              {checkAllFriends.isPending ? '测速中...' : '批量测速'}
            </Button>
            <Button variant="secondary" onClick={() => setShowTypeManager(!showTypeManager)}>
              <Icon icon="lucide:folder-tree" width={16} height={16} className="mr-1.5" />
              类型管理 {showTypeManager ? '收起' : '展开'}
            </Button>
          </span>
        </div>
      </div>

      {/* Type Manager (collapsible) */}
      {showTypeManager && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-h)]">
            <Icon icon="lucide:folder-tree" width={16} height={16} />
            友链类型
          </div>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input placeholder="类型名称" {...typeForm.register('name')} />
            <Input type="number" placeholder="排序" {...typeForm.register('sort', { valueAsNumber: true })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...typeForm.register('isVisible')} /> 可见</label>
            <Button variant="secondary" onClick={typeForm.handleSubmit(handleTypeSubmit)} disabled={createType.isPending || updateType.isPending}>
              {editingType ? '更新类型' : '添加类型'}
              {editingType && (
                <button className="ml-2 text-xs text-[var(--text)]" onClick={(e) => { e.stopPropagation(); setEditingType(null); typeForm.reset({ name: '', sort: 0, isVisible: true }); }}>
                  取消
                </button>
              )}
            </Button>
          </div>
          {types.length === 0 ? (
            <p className="text-xs text-[var(--text)]">暂无类型，添加一个开始使用</p>
          ) : (
            <div className="grid gap-2">
              {types.map((t: FriendType) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[var(--text-h)]">{t.name}</span>
                    <span className="text-xs text-[var(--text)]">排序: {t.sort}</span>
                    <span className="text-xs text-[var(--text)]">{t.count} 条</span>
                    {!t.isVisible && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800">已隐藏</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" onClick={() => openEditType(t)}>
                      <Icon icon="lucide:pencil" width={14} height={14} />
                    </Button>
                    <Button variant="secondary" onClick={() => { if (confirm('删除类型将把关联友链的类型置空，确定？')) deleteType.mutate(t.id); }}>
                      <Icon icon="lucide:trash-2" width={14} height={14} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="搜索名称/链接/描述..."
          className="max-w-xs"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select 
          value={typeFilter} 
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-40 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-all hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-bg)]"
        >
          <option value="">全部类型</option>
          {types.map((t: FriendType) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <span className="text-sm text-[var(--text)]">共 {friends.length} 条</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">友链信息</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden sm:table-cell">类型</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden md:table-cell">排序</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden lg:table-cell">延迟</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden lg:table-cell">描述</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--text)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text)]">加载中...</td></tr>
            ) : friends.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text)]">暂无友链</td></tr>
            ) : (
              friends.map((friend: Friend) => (
                <tr key={friend.id} className={`hover:bg-[var(--bg-muted)] transition-colors ${friend.isInvalid ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        {friend.avatar ? (
                          <img src={friend.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">{friend.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[var(--text-h)]">{friend.name}</span>
                          {friend.isInvalid && <span className="rounded bg-red-100 px-1 py-0.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">失效</span>}
                          {friend.recommended && <span className="rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">推荐</span>}
                        </div>
                        <a href={friend.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--text)] hover:text-[var(--accent)] truncate block max-w-48">
                          {friend.url}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-[var(--text)]">{friend.type?.name || '-'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-[var(--text)]">{friend.sort}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {friend.latency > 0 || friend.accessible === 1 ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        friend.accessible === 1
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : friend.latency <= 4000
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {friend.accessible === 0 ? `${friend.latency}ms` : '不可用'}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text)]">未测速</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                    <span className="text-xs text-[var(--text)] truncate block">{friend.description || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* 桌面端：全部 5 个图标按钮 */}
                      <span className="hidden sm:flex items-center gap-1">
                        <Button variant="secondary" onClick={() => checkFriend.mutate(friend.id)} disabled={checkFriend.isPending} title="测速">
                          <Icon icon="lucide:zap" width={14} height={14} className={checkFriend.isPending ? 'animate-pulse' : ''} />
                        </Button>
                        <Button variant="secondary" onClick={() => toggleInvalid.mutate({ id: friend.id, isInvalid: friend.isInvalid })} title={friend.isInvalid ? '标记正常' : '标记失效'}>
                          <Icon icon={friend.isInvalid ? 'lucide:check-circle' : 'lucide:x-circle'} width={14} height={14} />
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => toggleRecommend.mutate(friend.id)}
                          disabled={toggleRecommend.isPending}
                          title={friend.recommended ? '取消推荐（不再显示在页脚）' : '设为推荐（显示在页脚推荐友链）'}
                          className={friend.recommended ? 'text-amber-500' : ''}
                        >
                          <Icon icon={friend.recommended ? 'lucide:star' : 'lucide:star-off'} width={14} height={14} />
                        </Button>
                      </span>
                      {/* 始终显示：编辑 + 删除 */}
                      <Button variant="secondary" onClick={() => openEditFriend(friend)} title="编辑">
                        <Icon icon="lucide:pencil" width={14} height={14} />
                      </Button>
                      <Button variant="secondary" onClick={() => { if (confirm('确定删除？')) deleteFriend.mutate(friend.id); }} title="删除">
                        <Icon icon="lucide:trash-2" width={14} height={14} className="text-red-500" />
                      </Button>
                      {/* 手机端溢出菜单（测速 / 标记失效 / 推荐） */}
                      <div className="relative sm:hidden">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === friend.id ? null : friend.id); }}
                          className="rounded-lg p-1.5 text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors"
                        >
                          <Icon icon="lucide:more-horizontal" width={16} height={16} />
                        </button>
                        {actionMenuId === friend.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1 shadow-xl">
                              <button
                                onClick={() => { setActionMenuId(null); checkFriend.mutate(friend.id); }}
                                disabled={checkFriend.isPending}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-h)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
                              >
                                <Icon icon="lucide:zap" width={15} height={15} /> 测速
                              </button>
                              <button
                                onClick={() => { setActionMenuId(null); toggleInvalid.mutate({ id: friend.id, isInvalid: friend.isInvalid }); }}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-h)] hover:bg-[var(--bg-muted)] transition-colors"
                              >
                                <Icon icon={friend.isInvalid ? 'lucide:check-circle' : 'lucide:x-circle'} width={15} height={15} />
                                {friend.isInvalid ? '标记正常' : '标记失效'}
                              </button>
                              <button
                                onClick={() => { setActionMenuId(null); toggleRecommend.mutate(friend.id); }}
                                disabled={toggleRecommend.isPending}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50 ${
                                  friend.recommended ? 'text-amber-600' : 'text-[var(--text-h)]'
                                }`}
                              >
                                <Icon icon={friend.recommended ? 'lucide:star' : 'lucide:star-off'} width={15} height={15} />
                                {friend.recommended ? '取消推荐' : '设为推荐'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-10 pb-10" onClick={() => { setShowForm(false); setEditingFriend(null); }}>
          <div className="relative w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-h)]">{editingFriend ? '编辑友链' : '新增友链'}</h3>
              <button onClick={() => { setShowForm(false); setEditingFriend(null); }}>
                <Icon icon="lucide:x" width={20} height={20} className="text-[var(--text)]" />
              </button>
            </div>
            <form onSubmit={friendForm.handleSubmit(handleFriendSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">名称 *</Label>
                <Input id="name" {...friendForm.register('name', { required: true, maxLength: 50 })} />
              </div>
              <div>
                <Label htmlFor="url">链接 *</Label>
                <Input id="url" placeholder="https://" {...friendForm.register('url', { required: true, maxLength: 255 })} />
              </div>
              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea id="description" rows={2} className="!resize-none" {...friendForm.register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="avatar">头像 URL</Label>
                  <Input id="avatar" placeholder="https://" {...friendForm.register('avatar')} />
                </div>
                <div>
                  <Label htmlFor="screenshot">截图 URL</Label>
                  <Input id="screenshot" placeholder="https://" {...friendForm.register('screenshot')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sort">排序 (1-10)</Label>
                  <Input id="sort" type="number" min="1" max="10" {...friendForm.register('sort', { valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="typeId">类型</Label>
                  <select 
                    id="typeId"
                    value={friendForm.watch('typeId')} 
                    onChange={(e) => friendForm.setValue('typeId', e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-all hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-bg)]"
                  >
                    <option value="">无类型</option>
                    {types.map((t: FriendType) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {editingFriend && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...friendForm.register('isInvalid')} />
                  <span className="text-[var(--text)]">标记为失效</span>
                </label>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => { setShowForm(false); setEditingFriend(null); }}>取消</Button>
                <Button type="submit" disabled={createFriend.isPending || updateFriend.isPending}>
                  {editingFriend ? '保存修改' : '添加'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
