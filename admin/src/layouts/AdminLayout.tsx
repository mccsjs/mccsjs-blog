import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/button';
import { Icon } from '@iconify/react';

const navItems = [
  { to: '/', label: '仪表盘', icon: 'layout-dashboard' },
  { to: '/posts', label: '文章', icon: 'file-text' },
  { to: '/categories', label: '分类', icon: 'folder-open' },
  { to: '/tags', label: '标签', icon: 'tags' },
  { to: '/comments', label: '评论', icon: 'message-square' },
  { to: '/menus', label: '菜单管理', icon: 'menu' },
  { to: '/friends', label: '友链管理', icon: 'link-2' },
  { to: '/visitor-logs', label: '访客日志', icon: 'bar-chart-3' },
  { to: '/settings', label: '系统设置', icon: 'settings-2' },
];

export default function AdminLayout() {
  const { session, isLoading, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !session && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [session, isLoading, navigate, location.pathname]);

  // 页面切换时关闭侧边栏
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-soft)]">
        <div className="flex items-center gap-2 text-[var(--text)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
          加载中...
        </div>
      </div>
    );
  }

  if (!session) return null;

  const initials = (user?.name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[var(--bg-soft)]">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--bg)] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo 区 */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg [background-image:var(--accent-grad)] shadow-sm">
            <Icon icon="lucide:pen-tool" width={18} height={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-h)]">管理系统</div>
            <div className="text-xs text-[var(--text)]">mccsjsblog</div>
          </div>
          {/* 移动端关闭按钮 */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-[var(--text)] hover:bg-[var(--bg-muted)] lg:hidden"
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        {/* 导航 */}
        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                    : 'text-[var(--text)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-h)]'
                }`
              }
            >
              <Icon icon={`lucide:${item.icon}`} width={18} height={18} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 用户区 */}
        <div className="border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full [background-image:var(--accent-grad)] text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--text-h)]">
                {user?.name || '管理员'}
              </div>
              <div className="truncate text-xs text-[var(--text)]">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-1 w-full justify-start gap-2.5"
            onClick={handleSignOut}
          >
            <Icon icon="lucide:log-out" width={16} height={16} />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* 移动端顶部栏 */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-[var(--text)] hover:bg-[var(--bg-muted)]"
          >
            <Icon icon="lucide:menu" width={22} height={22} />
          </button>
          <span className="text-sm font-semibold text-[var(--text-h)]">管理系统</span>
        </header>
        <div id="admin-main" className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
