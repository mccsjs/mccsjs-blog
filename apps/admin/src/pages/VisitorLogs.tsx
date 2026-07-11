import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Icon } from '@iconify/react';

interface VisitorLog {
  id: string;
  visitorId: string;
  ip: string | null;
  page: string;
  region: string | null;
  os: string | null;
  browser: string | null;
  referrer: string | null;
  createdAt: string;
}

interface VisitorStats {
  todayCount: number;
  totalCount: number;
  topPages: { page: string; count: number }[];
  recentLogs: { visitorId: string; page: string; region: string | null; createdAt: string }[];
}

export default function VisitorLogs() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: stats } = useQuery<VisitorStats>({
    queryKey: ['visitor-stats'],
    queryFn: () => api('/api/admin/visitor-stats'),
  });

  const { data, isLoading } = useQuery<{ list: VisitorLog[]; total: number; page: number; pageSize: number }>({
    queryKey: ['visitor-logs', page, keyword, pathFilter, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (keyword) params.set('keyword', keyword)
      if (pathFilter) params.set('path', pathFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      return api(`/api/admin/visitor-logs?${params.toString()}`)
    },
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0

  const handleSearch = () => {
    setPage(1)
  }

  const clearFilters = () => {
    setKeyword('')
    setPathFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-h)]">访客日志</h1>
        <p className="text-sm text-[var(--text)] mt-1">查看网站访客访问记录</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="text-xs font-medium text-[var(--text)]">今日访问</div>
            <div className="mt-1 text-2xl font-bold text-[var(--accent)]">{stats.todayCount}</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="text-xs font-medium text-[var(--text)]">总访问量</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text-h)]">{stats.totalCount}</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="text-xs font-medium text-[var(--text)]">热门页面</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-h)] truncate">
              {stats.topPages[0]?.page || '-'}
            </div>
            {stats.topPages[0] && (
              <div className="text-xs text-[var(--text)]">{stats.topPages[0].count} 次</div>
            )}
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="text-xs font-medium text-[var(--text)]">最近访客</div>
            <div className="mt-1 text-sm font-mono text-[var(--text-h)] truncate">
              {stats.recentLogs[0]?.visitorId || '-'}
            </div>
            {stats.recentLogs[0] && (
              <div className="text-xs text-[var(--text)]">{stats.recentLogs[0].page}</div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <label className="mb-1 block text-xs font-medium text-[var(--text)]">关键词 (IP / 来源 / 访客ID)</label>
          <Input
            placeholder="搜索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-[var(--text)]">页面路径</label>
          <Input
            placeholder="/posts"
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text)]">开始日期</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text)]">结束日期</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>
          <Icon icon="lucide:search" width={15} height={15} className="mr-1" />
          筛选
        </Button>
        <Button variant="ghost" onClick={clearFilters}>
          清除
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">访客 ID</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden sm:table-cell">IP 地址</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">页面</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden md:table-cell">地区</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden lg:table-cell">浏览器</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)] hidden lg:table-cell">来源</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">访问时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text)]">加载中...</td></tr>
            ) : !data || data.list.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text)]">暂无访客记录</td></tr>
            ) : (
              data.list.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--bg-muted)] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[var(--text-h)]" title={log.visitorId}>
                      {log.visitorId.slice(0, 10)}...
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="font-mono text-xs text-[var(--text)]">{log.ip || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-[var(--accent)]">{log.page}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-[var(--text)]">{log.region || '-'}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-[var(--text)]">{log.browser || '-'}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {log.referrer ? (
                      <a href={log.referrer} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--text)] hover:text-[var(--accent)] truncate block max-w-[200px]">
                        {log.referrer}
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--text)]">直接访问</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--text)]">
                    {new Date(log.createdAt).toLocaleString('zh-CN')}
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
            共 {data.total} 条，第 {page} / {totalPages} 页
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
    </div>
  );
}
