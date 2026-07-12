import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/button';
import { Icon } from '@iconify/react';
import ProfileDialog from '../components/ProfileDialog';

const navItems = [
  { to: '/', label: '概览', icon: 'layout-dashboard' },
  { to: '/posts', label: '文章', icon: 'file-text' },
  { to: '/categories', label: '分类', icon: 'folder-open' },
  { to: '/tags', label: '标签', icon: 'tags' },
  { to: '/comments', label: '评论', icon: 'message-square' },
  { to: '/menus', label: '菜单', icon: 'menu' },
  { to: '/friends', label: '友链', icon: 'link-2' },
  { to: '/visitor-logs', label: '访客', icon: 'bar-chart-3' },
  { to: '/scratchpad', label: '速记', icon: 'notebook-pen' },
  { to: '/settings', label: '设置', icon: 'settings-2' },
];

export default function AdminLayout() {
  const { session, isLoading, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !session && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [session, isLoading, navigate, location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // 头像识别：复用前端评论区逻辑（WeAvatar = 邮箱 SHA256 哈希，d=404 时回落字母头像）
  useEffect(() => {
    let active = true;
    const email = user?.email;
    if (!email || !crypto?.subtle?.digest) {
      setAvatarUrl(null);
      return;
    }
    const e = email.trim().toLowerCase();
    crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(e))
      .then((buf) => {
        const bytes = new Uint8Array(buf);
        let hex = '';
        for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
        if (active) setAvatarUrl('https://weavatar.com/avatar/' + hex + '?s=80&d=404');
      })
      .catch(() => {
        if (active) setAvatarUrl(null);
      });
    return () => {
      active = false;
    };
  }, [user?.email]);

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
    <div className="bg-[var(--bg-soft)] lg:flex lg:h-screen lg:overflow-hidden">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-[var(--border)] bg-[var(--bg)] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo 区 */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--text-h)] text-[var(--bg)]">
              <Icon icon="lucide:pen-tool" width={16} height={16} />
            </div>
            <span className="text-sm font-semibold text-[var(--text-h)]">博客管理</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-[var(--text)] hover:bg-[var(--bg-muted)] lg:hidden"
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        {/* 导航 */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                    : 'text-[var(--text)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-h)]'
                }`
              }
            >
              <Icon icon={`lucide:${item.icon}`} width={17} height={17} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 用户区 */}
        <div className="border-t border-[var(--border)] p-2">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--bg-muted)]"
            title="点击修改账号密码"
          >
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--bg-muted)] text-xs font-semibold text-[var(--text-h)]">
              {initials}
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--text-h)]">
                {user?.name || '管理员'}
              </div>
              <div className="truncate text-xs text-[var(--text)]">{user?.email}</div>
            </div>
            <Icon
              icon="lucide:pencil"
              width={15}
              height={15}
              className="shrink-0 text-[var(--text)]"
            />
          </button>
          <Button
            variant="ghost"
            className="mt-0.5 w-full justify-start gap-2 text-[var(--text)] hover:text-[var(--text-h)]"
            onClick={handleSignOut}
          >
            <Icon icon="lucide:log-out" width={15} height={15} />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="min-w-0 flex-1 lg:ml-56 lg:h-screen lg:overflow-y-auto">
        {/* 移动端顶部栏 */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-[var(--text)] hover:bg-[var(--bg-muted)]"
          >
            <Icon icon="lucide:menu" width={20} height={20} />
          </button>
          <span className="text-sm font-semibold text-[var(--text-h)]">博客管理</span>
        </header>

        <div id="admin-main" className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
