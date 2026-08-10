// 留言板悬浮抽屉：FAB 点击后居中弹出（手机全屏），内嵌聊天容器
import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { MessageSquareText, X } from 'lucide-react';
import { guestbookStore } from './guestbookStore';
import ChatRoom from './ChatRoom';
import './chat.css';

interface Props {
  envId?: string;
}

export default function GuestbookWidget({ envId }: Props) {
  const { isOpen } = useSyncExternalStore(guestbookStore.subscribe, guestbookStore.getState);

  useEffect(() => {
    // FloatingBar 的 FAB 按钮派发 toggle 事件
    const onToggle = () => guestbookStore.toggle();
    window.addEventListener('guestbook:toggle', onToggle);
    return () => window.removeEventListener('guestbook:toggle', onToggle);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="guestbook-widget">
      <div className="guestbook-widget__backdrop" onClick={() => guestbookStore.close()} />
      <aside
        className="guestbook-widget__panel"
        role="dialog"
        aria-label="留言板"
        aria-modal="true"
      >
        <header className="guestbook-widget__header">
          <div className="guestbook-widget__title">
            <MessageSquareText size={18} />
            <span>留言板</span>
          </div>
          <button
            type="button"
            className="guestbook-widget__close"
            onClick={() => guestbookStore.close()}
            aria-label="关闭留言板"
            title="关闭留言板"
          >
            <X size={20} />
          </button>
        </header>
        <div className="guestbook-widget__body">
          <ChatRoom envId={envId} />
        </div>
      </aside>
    </div>
  );
}
