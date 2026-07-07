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
import type { Post, Comment } from '../../../shared/src/index';
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

// 图表配色（贴合截图：浏览量紫 / 访客量蓝）
const PV_COLOR = '#8b5cf6';
const UV_COLOR = '#3b82f6';
const AXIS_MUTED = 'rgba(148,163,184,0.85)';
const GRID_LINE = 'rgba(148,163,184,0.18)';

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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs shadow-xl">
      <div className="mb-1.5 font-medium text-[var(--text-h)]">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
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

  // 访问趋势（日 / 月）
  const [range, setRange] = useState<'day' | 'month'>('day');
  const { data: trend } = useQuery<TrendResp>({
    queryKey: ['visitor-trend', range],
    queryFn: () => api(`/api/admin/visitor-trend?range=${range}`),
  });

  // 触发热门页面进度条入场动画
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

  const maxPageCount = visitorStats
    ? Math.max(...visitorStats.topPages.map((p) => p.count), 1)
    : 1;

  const latest = trend?.data?.[trend.data.length - 1];

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

      {/* 访问趋势 */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent)]">
              <Icon icon="lucide:trending-up" width={17} height={17} />
            </span>
            <h2>访问趋势</h2>
          </div>
          {/* 日 / 月 切换 */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-0.5">
            {(['day', 'month'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  range === r
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text)] hover:text-[var(--text-h)]'
                }`}
              >
                {r === 'day' ? '日' : '月'}
              </button>
            ))}
          </div>
        </div>

        {/* 当前值图例 */}
        <div className="mb-3 flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-xs text-[var(--text)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PV_COLOR }} />
            浏览量
            <b className="tabular-nums text-[var(--text-h)]">{latest?.pv ?? 0}</b>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--text)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: UV_COLOR }} />
            访客量
            <b className="tabular-nums text-[var(--text-h)]">{latest?.uv ?? 0}</b>
          </span>
        </div>

        {/* 双线图 */}
        <div className="h-[280px] w-full">
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
                  width={36}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="uv"
                  orientation="right"
                  tick={{ fill: AXIS_MUTED, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
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
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={900}
                />
                <Line
                  yAxisId="uv"
                  type="monotone"
                  dataKey="uv"
                  name="访客量"
                  stroke={UV_COLOR}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={900}
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

      {/* 访问统计 */}
      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent)]">
              <Icon icon="lucide:bar-chart-3" width={17} height={17} />
            </span>
            <h2>访问统计</h2>
          </div>
          <Link
            to="/visitor-logs"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            查看全部
          </Link>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4 transition-colors hover:border-[var(--accent-border)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
              <Icon icon="lucide:calendar-clock" width={13} height={13} />
              今日访问
            </div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums text-[var(--text-h)]">
              {visitorStats ? visitorStats.todayCount : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4 transition-colors hover:border-[var(--accent-border)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
              <Icon icon="lucide:globe" width={13} height={13} />
              累计访问
            </div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums text-[var(--text-h)]">
              {visitorStats ? visitorStats.totalCount : '—'}
            </div>
          </div>
        </div>

        {/* 热门页面 */}
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[var(--text-h)]">
            <Icon icon="lucide:flame" width={14} height={14} className="text-[var(--accent)]" />
            热门页面
          </div>
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
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-violet-400 transition-all duration-700 ease-out"
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
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[var(--text-h)]">
              <Icon icon="lucide:history" width={14} height={14} className="text-[var(--accent)]" />
              最近访客
            </div>
            <div className="space-y-2">
              {visitorStats.recentLogs.slice(0, 4).map((log, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-[var(--text-h)]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-[10px] font-semibold text-[var(--accent)]">
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
  );
}
