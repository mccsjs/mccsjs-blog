// 留言板聊天容器：全量加载 / 30s 轮询 / 乐观更新 / 离线检测 / 公告与删除弹窗
import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  ChevronDown,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  WifiOff,
  X,
} from 'lucide-react';
import ChatComposer from './ChatComposer';
import ChatMessage from './ChatMessage';
import { configureTwikoo, deleteComment, getComments, submitComment } from './twikooClient';
import type { GuestbookMessage, GuestbookProfile } from './types';
import {
  dateLabel,
  flattenComments,
  formatMessageTime,
  getErrorMessage,
  mergeMessages,
  renderMessageMarkdown,
  shouldShowDate,
  validateMessageBody,
} from './utils';
import { loadEmojiPacks } from './emoji';
import { messageConfig, type MessageAnnouncementItem } from '../../config/messageConfig';
import './chat.css';

const PAGE_SIZE = 30;
const POLL_INTERVAL = 30000;
const PROFILE_STORAGE_KEY = 'guestbook-chat-profile';
const DRAFT_STORAGE_KEY = 'guestbook-chat-draft';
const ANNOUNCEMENT_BAR_KEY = 'guestbook-announcement-bar-dismissed';
const ANNOUNCEMENT_DIALOG_KEY_PREFIX = 'guestbook-announcement-dialog-shown-';

interface Props {
  envId?: string;
}

function readStoredValue<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function readStoredString(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStoredValue(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 隐私模式忽略
  }
}

function isProfile(value: unknown): value is GuestbookProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<GuestbookProfile>;
  return typeof p.nick === 'string' && typeof p.mail === 'string' && typeof p.link === 'string';
}

export default function ChatRoom({ envId }: Props) {
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [profile, setProfile] = useState<GuestbookProfile>({ nick: '', mail: '', link: '' });
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<GuestbookMessage | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [composerError, setComposerError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [announcementBarVisible, setAnnouncementBarVisible] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<MessageAnnouncementItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuestbookMessage | null>(null);
  const [mutatingMessageId, setMutatingMessageId] = useState<string | null>(null);
  const [messageActionError, setMessageActionError] = useState<{ id: string; message: string } | null>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const historyPageRef = useRef(1);
  const announcementDialogRef = useRef<HTMLDialogElement | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null);
  const pollTimerRef = useRef<number | undefined>(undefined);
  const dataBusyRef = useRef(false);
  const nearBottomRef = useRef(true);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const announcements = messageConfig.announcements;
  const isSending = messages.some((m) => m.localState === 'sending');

  const canManageMessage = (message: GuestbookMessage): boolean => {
    if (message.localState) return false;
    return Boolean(message.isOwner) || message.isAdmin;
  };

  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const scrollToBottom = (smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
    });
    setNewMessageCount(0);
    setShowScrollToBottom(false);
  };

  const loadInitial = async () => {
    if (dataBusyRef.current) return;
    dataBusyRef.current = true;
    setInitialLoading(true);
    setInitialError('');
    setSyncError('');
    try {
      const res = await getComments(1, PAGE_SIZE);
      setMessages(flattenComments(res.data));
      setTotalCount(res.count);
      setHasMoreHistory(res.more);
      historyPageRef.current = 1;
      setLastSyncedAt(Date.now());
      requestAnimationFrame(() => scrollToBottom(false));
    } catch (e) {
      setInitialError(getErrorMessage(e) || '留言加载失败');
    } finally {
      setInitialLoading(false);
      dataBusyRef.current = false;
    }
  };

  const loadMoreHistory = async () => {
    if (dataBusyRef.current || !hasMoreHistory || loadingHistory || initialLoading) return;
    dataBusyRef.current = true;
    setLoadingHistory(true);
    const el = listRef.current;
    const oldHeight = el?.scrollHeight ?? 0;
    const oldTop = el?.scrollTop ?? 0;
    try {
      const nextPage = historyPageRef.current + 1;
      const res = await getComments(nextPage, PAGE_SIZE);
      const older = flattenComments(res.data);
      historyPageRef.current = nextPage;
      setHasMoreHistory(res.more);
      setMessages((prev) => [...older, ...prev]);
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = oldTop + (el.scrollHeight - oldHeight);
        }
      });
    } catch (e) {
      setSyncError(getErrorMessage(e) || '加载历史消息失败');
    } finally {
      setLoadingHistory(false);
      dataBusyRef.current = false;
    }
  };

  const syncLatest = async () => {
    if (initialLoading || isOffline || dataBusyRef.current) return;
    dataBusyRef.current = true;
    setSyncing(true);
    setSyncError('');
    const wasNearBottom = isNearBottom();
    const knownIds = new Set(
      messagesRef.current.filter((m) => !m.localState).map((m) => m.id),
    );
    try {
      const res = await getComments(1, PAGE_SIZE);
      const incoming = flattenComments(res.data);
      const fresh = incoming.filter((m) => !knownIds.has(m.id)).length;
      setMessages((prev) => mergeMessages(prev, incoming));
      setTotalCount(res.count);
      setLastSyncedAt(Date.now());
      if (fresh > 0 && wasNearBottom) scrollToBottom(true);
      else if (fresh > 0) setNewMessageCount((n) => n + fresh);
    } catch (e) {
      const message = getErrorMessage(e);
      if (message) setSyncError(message);
    } finally {
      setSyncing(false);
      dataBusyRef.current = false;
    }
  };

  const startPolling = () => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = undefined;
    if (document.visibilityState !== 'visible' || !navigator.onLine) return;
    pollTimerRef.current = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void syncLatest();
      }
    }, POLL_INTERVAL);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void syncLatest();
      startPolling();
      return;
    }
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = undefined;
  };

  const handleOnline = () => {
    setIsOffline(false);
    void syncLatest();
    startPolling();
  };

  const handleOffline = () => {
    setIsOffline(true);
    setSyncError('网络已断开，恢复连接后将自动同步');
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = undefined;
  };

  const validateComposer = (content: string): string => {
    if (profile.nick.trim().length < 2) {
      return '请先填写昵称（信息）后再发送';
    }
    if (profile.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(profile.mail)) {
      return '邮箱格式不正确';
    }
    if (profile.link) {
      try {
        const website = new URL(profile.link);
        if (website.protocol !== 'http:' && website.protocol !== 'https:') {
          return '网站地址仅支持 http 或 https';
        }
      } catch {
        return '网站地址格式不正确';
      }
    }
    return validateMessageBody(content);
  };

  const sendMessage = async (
    replaceMessageId?: string,
    contentOverride?: string,
  ): Promise<boolean> => {
    if (isSending || isOffline) return false;
    const content = (contentOverride ?? draft).trim();
    const error = validateComposer(content);
    setComposerError(error);
    if (error) return false;

    const target = replyTarget?.id ? replyTarget : null;
    const tempId = `local-${Date.now()}`;
    const html = renderMessageMarkdown(content);
    const optimistic: GuestbookMessage = {
      id: tempId,
      nick: profile.nick.trim(),
      avatar: '',
      link: profile.link.trim() || undefined,
      body: html,
      createdAt: Date.now(),
      isAdmin: false,
      isOwner: true,
      replyToId: target?.id,
      replyToNick: target?.nick,
      localState: 'sending',
    };

    setMessages((prev) =>
      (replaceMessageId ? prev.filter((m) => m.id !== replaceMessageId) : prev).concat(optimistic),
    );
    setDraft('');
    setReplyTarget(null);
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      const response = await submitComment({
        nick: profile.nick.trim(),
        mail: profile.mail.trim() || undefined,
        link: profile.link.trim() || undefined,
        comment: html,
        pid: target?.id,
        rid: target?.id,
      });
      setMessages((prev) =>
        mergeMessages(prev.filter((m) => m.id !== tempId), [
          {
            ...optimistic,
            id: response.id || tempId,
            localState: undefined,
            body: response.comment || html,
            isAdmin: Boolean(response.master),
            createdAt: response.created || Date.now(),
            avatar: response.avatar || optimistic.avatar,
          },
        ]),
      );
      setTotalCount((c) => c + 1);
      setInitialError('');
      setSyncError('');
      setLastSyncedAt(Date.now());
      requestAnimationFrame(() => scrollToBottom(true));
      void syncLatest();
    } catch (e) {
      const reason = getErrorMessage(e) || '消息发送失败';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, localState: 'failed', failureReason: reason } : m,
        ),
      );
    }
    return true;
  };

  const retryMessage = async (message: GuestbookMessage) => {
    const target = message.replyToId
      ? (messages.find((c) => c.id === message.replyToId) ?? null)
      : null;
    setReplyTarget(target);
    const text = message.body.replace(/<[^>]*>/gu, '').trim();
    await sendMessage(message.id, text);
  };

  const discardMessage = (message: GuestbookMessage) => {
    setMessages((prev) => prev.filter((c) => c.id !== message.id));
  };

  const selectReply = (message: GuestbookMessage) => {
    if (!message.localState) setReplyTarget(message);
  };

  const jumpToQuotedMessage = (message: GuestbookMessage) => {
    if (!message.replyToId) return;
    const target = messages.find((c) => c.id === message.replyToId);
    const el = document.getElementById(`guestbook-message-${message.replyToId}`);
    if (!target || !el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('is-highlighted');
    requestAnimationFrame(() => el.classList.add('is-highlighted'));
    window.setTimeout(() => el.classList.remove('is-highlighted'), 1600);
  };

  const requestDeleteMessage = (message: GuestbookMessage) => {
    if (!canManageMessage(message)) return;
    setMessageActionError(null);
    setDeleteTarget(message);
    requestAnimationFrame(() => {
      deleteDialogRef.current?.showModal();
      document.body.style.overflow = 'hidden';
    });
  };

  const closeDeleteDialog = () => {
    if (mutatingMessageId === deleteTarget?.id) return;
    if (deleteDialogRef.current?.open) deleteDialogRef.current.close();
    setDeleteTarget(null);
    document.body.style.overflow = '';
  };

  const confirmDeleteMessage = async () => {
    const target = deleteTarget;
    if (!target || !target.id || !canManageMessage(target) || mutatingMessageId) return;
    setMutatingMessageId(target.id);
    setMessageActionError(null);
    try {
      await deleteComment(target.id);
      setMessages((prev) => prev.filter((m) => m.id !== target.id));
      setTotalCount((c) => Math.max(0, c - 1));
      if (replyTarget?.id === target.id) setReplyTarget(null);
      setMutatingMessageId(null);
      setDeleteTarget(null);
      if (deleteDialogRef.current?.open) deleteDialogRef.current.close();
      document.body.style.overflow = '';
      void syncLatest();
    } catch (e) {
      setMessageActionError({
        id: target.id,
        message: getErrorMessage(e) || '消息删除失败，请稍后重试',
      });
      setMutatingMessageId(null);
    }
  };

  const openAnnouncement = (item: MessageAnnouncementItem) => {
    setSelectedAnnouncement(item);
    requestAnimationFrame(() => {
      announcementDialogRef.current?.showModal();
      document.body.style.overflow = 'hidden';
    });
  };

  const closeAnnouncement = () => {
    if (announcementDialogRef.current?.open) announcementDialogRef.current.close();
    document.body.style.overflow = '';
  };

  const dismissAnnouncementBar = () => {
    setAnnouncementBarVisible(false);
    try {
      localStorage.setItem(ANNOUNCEMENT_BAR_KEY, '1');
    } catch {
      // ignore
    }
  };

  const hasSeenAnnouncementDialog = (id: string): boolean => {
    try {
      return localStorage.getItem(ANNOUNCEMENT_DIALOG_KEY_PREFIX + id) === '1';
    } catch {
      return false;
    }
  };

  const markAnnouncementDialogSeen = (id: string) => {
    try {
      localStorage.setItem(ANNOUNCEMENT_DIALOG_KEY_PREFIX + id, '1');
    } catch {
      // ignore
    }
  };

  const closeAnnouncementDialogAndMarkSeen = () => {
    if (selectedAnnouncement) {
      markAnnouncementDialogSeen(selectedAnnouncement.id);
    }
    closeAnnouncement();
  };

  const formatSyncStatus = () => {
    if (isOffline) return '离线';
    if (syncing) return '同步中';
    if (syncError) return '同步失败';
    if (!lastSyncedAt) return '等待同步';
    return `同步于 ${new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(lastSyncedAt)}`;
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const near = isNearBottom();
    nearBottomRef.current = near;
    setShowScrollToBottom(!near);
    if (near) setNewMessageCount(0);
    if (el.scrollTop < 80 && hasMoreHistory && !loadingHistory && !initialLoading) {
      void loadMoreHistory();
    }
  };

  useEffect(() => {
    configureTwikoo(envId ?? '');
    const storedProfile = readStoredValue<unknown>(PROFILE_STORAGE_KEY);
    if (isProfile(storedProfile)) setProfile(storedProfile);
    const storedDraft = readStoredString(DRAFT_STORAGE_KEY);
    const draftBlank = storedDraft.replace(/["'`]/g, '').trim().length === 0;
    setDraft(draftBlank ? '' : storedDraft);
    setIsOffline(!navigator.onLine);

    try {
      if (localStorage.getItem(ANNOUNCEMENT_BAR_KEY) === '1') {
        setAnnouncementBarVisible(false);
      }
    } catch {
      // ignore
    }
    const firstAnnouncement = announcements[0];
    if (firstAnnouncement && !hasSeenAnnouncementDialog(firstAnnouncement.id)) {
      requestAnimationFrame(() => openAnnouncement(firstAnnouncement));
    }

    void loadEmojiPacks().catch(() => {});
    void loadInitial();
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      if (announcementDialogRef.current?.open) announcementDialogRef.current.close();
      if (deleteDialogRef.current?.open) deleteDialogRef.current.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="guestbook-chat" aria-label="留言板">
      <header className="guestbook-chat__header">
        <div className="guestbook-chat__channel">
          <div>
            <div className="guestbook-chat__title-row">
              <h2>留言板</h2>
              <span>· {initialLoading ? '--' : totalCount} 条留言</span>
              <div className="guestbook-chat__sync">
                <div
                  className={`guestbook-chat__status${syncError ? ' is-failed' : ''}`}
                  aria-live="polite"
                >
                  <span className={isOffline ? 'is-offline' : ''} />
                  {formatSyncStatus()} · 30 s
                </div>
                <button
                  className={`guestbook-chat__refresh${syncing ? ' is-syncing' : ''}`}
                  type="button"
                  onClick={() => void syncLatest()}
                  disabled={syncing || initialLoading || isOffline}
                  aria-label="立即刷新消息"
                  title="立即刷新"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`guestbook-chat__workspace${
          announcementBarVisible && announcements.length > 0 ? ' has-announcement-bar' : ''
        }`}
      >
        {announcementBarVisible && announcements.length > 0 && (
          <aside className="guestbook-chat__announcement-bar" aria-label="公告">
            <div className="guestbook-chat__announcement-bar-label">
              <Bell size={16} />
              <strong>公告</strong>
            </div>
            <div className="guestbook-chat__announcement-bar-items">
              {announcements.map((item) => (
                <button type="button" key={item.id} onClick={() => openAnnouncement(item)}>
                  {item.title}
                </button>
              ))}
            </div>
            <button
              className="guestbook-chat__announcement-bar-close"
              type="button"
              onClick={dismissAnnouncementBar}
              aria-label="关闭公告栏"
              title="关闭公告栏"
            >
              <X size={17} />
            </button>
          </aside>
        )}

        <div className="guestbook-chat__conversation">
          {initialLoading ? (
            <div className="guestbook-chat__loading" aria-label="正在加载留言" aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  className={`guestbook-chat__skeleton${index % 3 === 2 ? ' is-admin' : ''}`}
                  key={index}
                >
                  <div className="guestbook-chat__skeleton-avatar" />
                  <div className="guestbook-chat__skeleton-copy">
                    <div className="guestbook-chat__skeleton-name" />
                    <div className="guestbook-chat__skeleton-bubble" />
                    <div className="guestbook-chat__skeleton-meta" />
                  </div>
                </div>
              ))}
            </div>
          ) : initialError && messages.length === 0 ? (
            <div className="guestbook-chat__state" role="alert">
              <AlertCircle size={34} />
              <h3>留言板加载失败</h3>
              <p>{initialError}</p>
              <button type="button" onClick={() => void loadInitial()}>
                <RotateCcw size={17} />
                重新加载
              </button>
            </div>
          ) : (
            <div
              className="guestbook-chat__messages custom-scrollbar"
              ref={listRef}
              onScroll={handleScroll}
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.length === 0 && (
                <div className="guestbook-chat__empty">
                  <div className="guestbook-chat__empty-mark">GB</div>
                  <h3>还没有人发言</h3>
                  <p>发送第一条消息，开启这段对话。</p>
                </div>
              )}

              {hasMoreHistory && messages.length > 0 && (
                <div className="guestbook-chat__history-trigger">
                  {loadingHistory ? (
                    <span className="guestbook-chat__history-loading">
                      <LoaderCircle size={16} />
                      加载历史消息…
                    </span>
                  ) : (
                    <button type="button" onClick={() => void loadMoreHistory()}>
                      加载更多历史消息
                    </button>
                  )}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={m.id}>
                  {shouldShowDate(i, messages) && (
                    <div className="guestbook-chat__date">
                      <span>{dateLabel(m.createdAt)}</span>
                    </div>
                  )}
                  <ChatMessage
                    message={m}
                    referencedMessage={
                      m.replyToId ? messages.find((x) => x.id === m.replyToId) : undefined
                    }
                    timeLabel={formatMessageTime(m.createdAt)}
                    canManage={canManageMessage(m)}
                    onReply={selectReply}
                    onDelete={requestDeleteMessage}
                    onJump={(target) => jumpToQuotedMessage(target)}
                    onRetry={(target) => void retryMessage(target)}
                    onDiscard={discardMessage}
                    onCopyError={setComposerError}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="guestbook-chat__composer-area">
            {!initialLoading && !initialError && (showScrollToBottom || newMessageCount > 0) && (
              <button
                className="guestbook-chat__new-messages"
                type="button"
                onClick={() => scrollToBottom(true)}
                aria-label={newMessageCount > 0 ? `${newMessageCount} 条新消息，回到最新消息` : '回到底部'}
              >
                <ChevronDown size={20} />
              </button>
            )}

            {(syncError || isOffline) && (
              <div className="guestbook-chat__sync-error" role="status">
                <WifiOff size={15} />
                <span>{syncError || '当前处于离线状态'}</span>
                {!isOffline && (
                  <button type="button" onClick={() => void syncLatest()}>
                    重试同步
                  </button>
                )}
              </div>
            )}

            <ChatComposer
              profile={profile}
              draft={draft}
              replyTarget={replyTarget}
              composerError={composerError}
              isOffline={isOffline}
              isSending={isSending}
              onProfileChange={(next) => {
                setProfile(next);
                writeStoredValue(PROFILE_STORAGE_KEY, next);
                setComposerError('');
              }}
              onDraftChange={(next) => {
                setDraft(next);
                writeStoredValue(DRAFT_STORAGE_KEY, next);
                setComposerError('');
              }}
              onReplyCancel={() => setReplyTarget(null)}
              onSend={(content) => sendMessage(undefined, content)}
              onToolError={setComposerError}
            />
          </div>
        </div>
      </div>

      {announcements.length > 0 && (
        <dialog
          ref={announcementDialogRef}
          className="guestbook-modal guestbook-announcement-modal"
          aria-labelledby="guestbook-announcement-title"
          onClose={() => {
            document.body.style.overflow = '';
          }}
          onCancel={(e) => {
            e.preventDefault();
            closeAnnouncementDialogAndMarkSeen();
          }}
        >
          <div className="guestbook-modal__overlay" onClick={closeAnnouncementDialogAndMarkSeen} />
          {selectedAnnouncement && (
            <div className="guestbook-modal__panel guestbook-announcement-modal__panel">
              <div className="guestbook-modal__header">
                <h2 id="guestbook-announcement-title" className="guestbook-modal__title">
                  {selectedAnnouncement.title}
                </h2>
                <button
                  className="guestbook-modal__close"
                  type="button"
                  onClick={closeAnnouncementDialogAndMarkSeen}
                  aria-label="关闭公告"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="guestbook-modal__body guestbook-announcement-modal__body">
                <p>{selectedAnnouncement.summary}</p>
                {selectedAnnouncement.lead && <p>{selectedAnnouncement.lead}</p>}
                {selectedAnnouncement.rules && selectedAnnouncement.rules.length > 0 && (
                  <ul>
                    {selectedAnnouncement.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="guestbook-modal__footer">
                <button
                  className="guestbook-modal__confirm"
                  type="button"
                  onClick={closeAnnouncementDialogAndMarkSeen}
                >
                  我知道了
                </button>
              </div>
            </div>
          )}
        </dialog>
      )}

      <dialog
        ref={deleteDialogRef}
        className="guestbook-modal guestbook-delete-modal"
        aria-labelledby="guestbook-delete-title"
        onClose={() => {
          document.body.style.overflow = '';
          if (!mutatingMessageId) setDeleteTarget(null);
        }}
        onCancel={(e) => {
          e.preventDefault();
          closeDeleteDialog();
        }}
      >
        <div className="guestbook-modal__overlay" onClick={closeDeleteDialog} />
        {deleteTarget && (
          <div className="guestbook-modal__panel guestbook-delete-modal__panel">
            <div className="guestbook-modal__header">
              <h2 id="guestbook-delete-title">删除消息</h2>
              <button
                className="guestbook-modal__close"
                type="button"
                onClick={closeDeleteDialog}
                disabled={mutatingMessageId === deleteTarget.id}
                aria-label="关闭删除确认"
              >
                <X size={20} />
              </button>
            </div>
            <div className="guestbook-modal__body guestbook-delete-modal__body">
              <p>删除后无法恢复，Twikoo 服务端也会同步删除这条消息。</p>
              <blockquote>{deleteTarget.body.replace(/<[^>]*>/gu, '').slice(0, 160)}</blockquote>
              {messageActionError?.id === deleteTarget.id && (
                <p className="guestbook-delete-modal__error" role="alert">
                  {messageActionError.message}
                </p>
              )}
            </div>
            <div className="guestbook-modal__footer guestbook-delete-modal__actions">
              <button
                className="guestbook-delete-modal__cancel"
                type="button"
                onClick={closeDeleteDialog}
                disabled={mutatingMessageId === deleteTarget.id}
              >
                取消
              </button>
              <button
                className="guestbook-delete-modal__confirm"
                type="button"
                onClick={() => void confirmDeleteMessage()}
                disabled={mutatingMessageId === deleteTarget.id}
              >
                {mutatingMessageId === deleteTarget.id ? '删除中' : '确认删除'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
