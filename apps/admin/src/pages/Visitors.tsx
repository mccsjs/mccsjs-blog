import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import Button from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Icon } from '@iconify/react'

interface Guest {
  email: string
  name: string
  website: string
  isAdmin: boolean
  commentCount: number
  lastCommentAt: number
  badge: string
}

// 头像：复用评论区逻辑（邮箱 SHA256 → weavatar），圆角图片
function GuestAvatar({ email }: { email: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    if (!email) return
    const e = email.trim().toLowerCase()
    crypto.subtle?.digest('SHA-256', new TextEncoder().encode(e))
      .then((buf) => {
        const hex = Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
        setSrc(`https://weavatar.com/avatar/${hex}?s=80&d=mp`)
      })
      .catch(() => setSrc(''))
  }, [email])
  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      className="h-9 w-9 shrink-0 rounded-xl bg-[var(--bg-muted)] object-cover"
    />
  )
}

// 自定义徽章编辑弹窗
function BadgeModal({
  guest,
  onClose,
  onSaved,
}: {
  guest: Guest
  onClose: () => void
  onSaved: (badge: string) => void
}) {
  const [value, setValue] = useState(guest.badge || '')
  const [saving, setSaving] = useState(false)

  const save = async (badge: string) => {
    setSaving(true)
    try {
      await api(`/api/admin/guests/${encodeURIComponent(guest.email)}/badge`, {
        method: 'PUT',
        body: JSON.stringify({ badge }),
      })
      onSaved(badge)
      onClose()
    } catch (e) {
      alert((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-semibold text-[var(--text-h)]">设置访客徽章</h3>
        <p className="mb-3 truncate text-xs text-[var(--text)]">{guest.email}</p>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="如：老朋友 / 潜水员 / 元老"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && save(value.trim())}
        />
        <p className="mt-2 text-xs text-[var(--text)]">
          留空保存即清除该访客的自定义徽章。
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          {guest.badge && (
            <Button variant="ghost" onClick={() => save('')} disabled={saving}>
              清除
            </Button>
          )}
          <Button variant="secondary" onClick={() => save(value.trim())} disabled={saving}>
            {saving ? '保存中' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Visitors() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Guest | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{
    list: Guest[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }>({
    queryKey: ['guests', page, keyword],
    queryFn: () =>
      api(
        `/api/admin/guests?page=${page}&pageSize=50&keyword=${encodeURIComponent(keyword)}`
      ),
  })

  const list = data?.list || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  const handleSearch = () => setPage(1)
  const clearFilters = () => {
    setKeyword('')
    setPage(1)
  }

  const handleSaved = (badge: string) => {
    if (!editing) return
    const email = editing.email.toLowerCase()
    queryClient.setQueryData(['guests', page, keyword], (old: any) => {
      if (!old) return old
      return {
        ...old,
        list: old.list.map((g: Guest) =>
          g.email.toLowerCase() === email ? { ...g, badge } : g
        ),
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-h)]">访客</h1>
        <p className="mt-1 text-sm text-[var(--text)]">
          评论区填写过昵称 / 邮箱 / 网站的访客花名册，可自定义徽章
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <label className="mb-1 block text-xs font-medium text-[var(--text)]">
            关键词 (昵称 / 邮箱 / 网站)
          </label>
          <Input
            placeholder="搜索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>
          <Icon icon="lucide:search" width={15} height={15} className="mr-1" />
          筛选
        </Button>
        <Button variant="ghost" onClick={clearFilters}>
          清除
        </Button>
        <span className="text-xs text-[var(--text)]">共 {total} 位访客</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">访客</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">邮箱</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden sm:table-cell">
                网站
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden md:table-cell">
                评论数
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">徽章</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--text)]">
                  加载中...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--text)]">
                  暂无访客记录
                </td>
              </tr>
            ) : (
              list.map((g) => (
                <tr key={g.email} className="hover:bg-[var(--bg-muted)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <GuestAvatar email={g.email} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-[var(--text-h)]">
                            {g.name || '匿名'}
                          </span>
                          {g.isAdmin && (
                            <span className="rounded-md bg-[var(--accent-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--accent)]">
                              博主
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text)]">
                          {g.commentCount} 条 ·{' '}
                          {new Date(g.lastCommentAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[var(--text)]">{g.email}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {g.website ? (
                      <a
                        href={g.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[200px] truncate block text-xs text-[var(--accent)] hover:underline"
                      >
                        {g.website}
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--text)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-[var(--text)]">{g.commentCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    {g.badge ? (
                      <span className="inline-block rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-xs font-medium text-[var(--text-h)]">
                        {g.badge}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      className="px-2.5 py-1 text-xs"
                      onClick={() => setEditing(g)}
                    >
                      <Icon icon="lucide:tag" width={13} height={13} className="mr-1" />
                      {g.badge ? '修改' : '设徽章'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text)]">
            第 {page} / {totalPages} 页
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Icon icon="lucide:chevron-left" width={14} height={14} />
              上一页
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              下一页
              <Icon icon="lucide:chevron-right" width={14} height={14} />
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <BadgeModal
          guest={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
