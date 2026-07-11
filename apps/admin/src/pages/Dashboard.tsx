import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { api } from '../lib/api';
import { Icon } from '@iconify/react';

interface VisitorStats {
  todayCount: number;
  totalCount: number;
  topPages: { page: string; count: number }[];
  recentLogs: { visitorId: string; page: string; region: string | null; createdAt: string }[];
}

interface TrendPoint {
  date: string;
  label: string;
  pv: number;
  uv: number;
}

interface TrendResp {
  range: 'day' | 'month';
  data: TrendPoint[];
}

interface Post {
  views?: number;
}

interface Comment {
  visible: boolean;
}

const PV_COLOR = '#2563eb';
const UV_COLOR = '#0ea5e9';
const AXIS_MUTED = 'rgba(82, 82, 82, 0.7)';
const GRID_LINE = 'rgba(82, 82, 82, 0.1)';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-[var(--text-h)]">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--text)]">{p.dataKey === 'pv' ? '浏览量' : '访客量'}</span>
          <span className="ml-auto pl-3 tabular-nums font-semibold text-[var(--text-h)]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['posts', 'admin'],
    queryFn: () => api('/api/posts?admin=true'),
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', 'admin'],
    queryFn: () => api('/api/comments?admin=true'),
  });

  const { data: visitorStats } = useQuery<VisitorStats>({
    queryKey: ['visitor-stats', 'dashboard'],
    queryFn: () => api('/api/admin/visitor-stats'),
  });

  const [range, setRange] = useState<'day' | 'month'>('day');
  const { data: trend } = useQuery<TrendResp>({
    queryKey: ['visitor-trend', range],
    queryFn: () => api(`/api/admin/visitor-trend?range=${range}`),
  });

  const [barsReady, setBarsReady] = useState(false);
  useEffect(() => {
    if (visitorStats?.topPages?.length) {
      const t = requestAnimationFrame(() => setBarsReady(true));
      return () => cancelAnimationFrame(t);
    }
  }, [visitorStats]);

  const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
  const hiddenComments = comments.filter((c) => !c.visible).length;

  const stats = [
    { label: '文章', value: posts.length, icon: 'file-text', href: '/posts' },
    { label: '待审评论', value: hiddenComments, icon: 'message-square', href: '/comments' },
    { label: '总阅读', value: totalViews, icon: 'eye', href: '/posts' },
  ];

  const quickActions = [
    { label: '写文章', href: '/posts/new', icon: 'pen-tool' },
    { label: '管理文章', href: '/posts', icon: 'file-text' },
    { label: '管理评论', href: '/comments', icon: 'message-square' },
  ];

  const maxPageCount = visitorStats
    ? Math.max(...visitorStats.topPages.map((p) => p.count), 1)
    : 1;

  const latest = trend?.data?.[trend.data.length - 1];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1>概览</h1>
        <p className="text-sm text-[var(--text)]">博客数据总览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="card flex items-center justify-between p-4 transition-colors hover:border-[var(--border-strong)]"
          >
            <div>
              <div className="text-xs text-[var(--text)]">{stat.label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-h)]">
                {stat.value}
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--bg-muted)] text-[var(--accent)]">
              <Icon icon={`lucide:${stat.icon}`} width={18} height={18} />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 左侧主内容 */}
        <div className="space-y-6 xl:col-span-2">
          {/* 访问趋势 */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2>访问趋势</h2>
              <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-soft)] p-0.5">
                {(['day', 'month'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      range === r
                        ? 'bg-[var(--text-h)] text-[var(--bg)]'
                        : 'text-[var(--text)] hover:text-[var(--text-h)]'
                    }`}
                  >
                    {r === 'day' ? '按日' : '按月'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3 flex items-center gap-5 text-xs text-[var(--text)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: PV_COLOR }} />
                浏览量 <b className="tabular-nums text-[var(--text-h)]">{latest?.pv ?? 0}</b>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: UV_COLOR }} />
                访客量 <b className="tabular-nums text-[var(--text-h)]">{latest?.uv ?? 0}</b>
              </span>
            </div>

            <div className="h-[260px] w-full">
              {trend && trend.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: AXIS_MUTED, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: GRID_LINE }}
                      minTickGap={16}
                    />
                    <YAxis
                      yAxisId="pv"
                      tick={{ fill: AXIS_MUTED, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={34}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="uv"
                      orientation="right"
                      tick={{ fill: AXIS_MUTED, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={34}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<TrendTooltip />}
                      cursor={{ stroke: GRID_LINE, strokeWidth: 1 }}
                    />
                    <Line
                      yAxisId="pv"
                      type="monotone"
                      dataKey="pv"
                      name="浏览量"
                      stroke={PV_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 0 }}
                      animationDuration={700}
                    />
                    <Line
                      yAxisId="uv"
                      type="monotone"
                      dataKey="uv"
                      name="访客量"
                      stroke={UV_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 0 }}
                      animationDuration={700}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--text)]">
                  暂无访问数据
                </div>
              )}
            </div>
          </div>

          {/* 快捷入口 */}
          <div className="card p-5">
            <h2 className="mb-4">快捷操作</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-soft)] p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-muted)]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--bg)] text-[var(--accent)]">
                    <Icon icon={`lucide:${action.icon}`} width={16} height={16} />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-h)]">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-6">
          {/* 核心指标 */}
          <div className="card p-5">
            <h2 className="mb-4">今日到访</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <span className="text-sm text-[var(--text)]">今日访问</span>
                <span className="text-2xl font-semibold tabular-nums text-[var(--text-h)]">
                  {visitorStats ? visitorStats.todayCount : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text)]">累计访问</span>
                <span className="text-2xl font-semibold tabular-nums text-[var(--text-h)]">
                  {visitorStats ? visitorStats.totalCount : '—'}
                </span>
              </div>
            </div>
            <Link
              to="/visitor-logs"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              查看日志 <Icon icon="lucide:arrow-right" width={12} height={12} />
            </Link>
          </div>

          {/* 热门页面 */}
          <div className="card p-5">
            <h2 className="mb-4">热门页面</h2>
            {visitorStats && visitorStats.topPages.length > 0 ? (
              <div className="space-y-3">
                {visitorStats.topPages.slice(0, 5).map((p) => {
                  const pct = Math.max(6, Math.round((p.count / maxPageCount) * 100));
                  return (
                    <div key={p.page}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-[var(--text-h)]" title={p.page}>
                          {p.page}
                        </span>
                        <span className="shrink-0 tabular-nums text-[var(--text)]">{p.count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
                          style={{ width: barsReady ? `${pct}%` : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-[var(--text)]">暂无访问数据</div>
            )}
          </div>

          {/* 最近访客 */}
          {visitorStats && visitorStats.recentLogs.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-4">最近访客</h2>
              <div className="space-y-2.5">
                {visitorStats.recentLogs.slice(0, 4).map((log, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-[var(--text-h)]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[10px] text-[var(--text)]">
                        {(log.region || '·').slice(0, 2)}
                      </span>
                      <span className="truncate" title={log.page}>
                        {log.page}
                      </span>
                    </span>
                    <span className="shrink-0 text-[var(--text)]">{timeAgo(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
