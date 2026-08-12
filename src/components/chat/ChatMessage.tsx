// 单条 QQ 群聊气泡
import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  ArrowUpToLine,
  Check,
  Copy,
  Laptop,
  LoaderCircle,
  MapPin,
  Monitor,
  Reply,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { GuestbookMessage } from './types';
import { getInitials } from './utils';

interface Props {
  message: GuestbookMessage;
  referencedMessage?: GuestbookMessage;
  timeLabel: string;
  canManage: boolean;
  onReply: (message: GuestbookMessage) => void;
  onDelete: (message: GuestbookMessage) => void;
  onJump: (message: GuestbookMessage) => void;
  onRetry: (message: GuestbookMessage) => void;
  onDiscard: (message: GuestbookMessage) => void;
  onCopyError: (message: string) => void;
}

const quotePreview = (referenced?: GuestbookMessage) =>
  referenced
    ? referenced.body.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').slice(0, 72)
    : '原消息暂未加载';

export default function ChatMessage({
  message,
  referencedMessage,
  timeLabel,
  canManage,
  onReply,
  onDelete,
  onJump,
  onRetry,
  onDiscard,
  onCopyError,
}: Props) {
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 渲染前统一消毒：覆盖所有来源（含 Twikoo 拉回的历史评论），防御存储型 XSS
  const safeBody =
    typeof window === 'undefined'
      ? message.body
      : DOMPurify.sanitize(message.body, { USE_PROFILES: { html: true } });

  // 图片灯箱：给用户图片（非 emoji）加 data-fancybox；全局只 bind 一次（document 事件委托，动态图片也生效）
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const w = window as unknown as {
      Fancybox?: { bind: (targets: unknown, options?: unknown) => void };
      __gbFancyboxBound?: boolean;
    };
    root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      if (img.title === 'emoji') return;
      img.dataset.fancybox = 'guestbook';
      if (img.alt) img.dataset.caption = img.alt;
    });
    if (!w.Fancybox || w.__gbFancyboxBound) return;
    w.Fancybox.bind('[data-fancybox="guestbook"]', { Carousel: { infinite: false } });
    w.__gbFancyboxBound = true;
  }, [message.body]);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.body.replace(/<[^>]*>/gu, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      onCopyError('复制失败，请检查浏览器剪贴板权限');
    }
  };

  const cls = [
    'guestbook-message',
    message.isAdmin ? 'is-admin' : '',
    message.localState === 'failed' ? 'is-failed' : '',
    message.localState === 'sending' ? 'is-sending' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article id={`guestbook-message-${message.id}`} className={cls}>
      <div className="guestbook-message__avatar" aria-hidden="true">
        <span>{getInitials(message.nick)}</span>
        {message.avatar && (
          <img
            src={message.avatar}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>

      <div className="guestbook-message__column">
        <div className="guestbook-message__heading">
          <span className="guestbook-message__author">
            {message.link ? (
              <a
                className="guestbook-message__author-link"
                href={message.link}
                target="_blank"
                rel="nofollow noopener noreferrer"
                title={`访问 ${message.nick} 的网站`}
              >
                {message.nick}
              </a>
            ) : (
              <strong>{message.nick}</strong>
            )}
          </span>
          {message.isAdmin && (
            <span className="guestbook-message__badge guestbook-message__badge--admin">大家长</span>
          )}
          {message.label && (
            <span className="guestbook-message__badge guestbook-message__badge--waiting">
              {message.label}
            </span>
          )}
          <time className="guestbook-message__time" dateTime={new Date(message.createdAt).toISOString()}>
            {timeLabel}
          </time>
        </div>

        <div className="guestbook-message__bubble-row">
          <div className="guestbook-message__bubble">
            {message.replyToId && (
              <button
                className="guestbook-message__quote"
                type="button"
                onClick={() => onJump(message)}
                title="跳转到原消息"
              >
                <ArrowUpToLine className="guestbook-message__quote-jump" size={15} />
                <span>@{message.replyToNick || '访客'}</span>
                <small>{quotePreview(referencedMessage)}</small>
              </button>
            )}
            <div
              className="guestbook-message__body"
              ref={bodyRef}
              dangerouslySetInnerHTML={{ __html: safeBody }}
            />
          </div>

          {!message.localState && (
            <div className="guestbook-message__tools" role="group" aria-label="消息操作">
              <button
                type="button"
                onClick={() => onReply(message)}
                aria-label={`回复 ${message.nick}`}
                title="引用回复"
              >
                <Reply size={15} />
              </button>
              <button
                type="button"
                onClick={() => void copyMessage()}
                aria-label={copied ? '已复制' : '复制消息'}
                title={copied ? '已复制' : '复制消息'}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onDelete(message)}
                  aria-label="删除消息"
                  title="删除消息"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="guestbook-message__meta">
          {message.browser && (
            <span>
              <Monitor size={14} />
              {message.browser}
            </span>
          )}
          {message.os && (
            <span>
              <Laptop size={14} />
              {message.os}
            </span>
          )}
          {message.addr && (
            <span>
              <MapPin size={14} />
              {message.addr}
            </span>
          )}
          {message.localState === 'sending' && (
            <span>
              <LoaderCircle size={14} className="is-spinning" />
              发送中
            </span>
          )}
        </div>

        {message.localState === 'failed' && (
          <div className="guestbook-message__failure" role="alert">
            <span>{message.failureReason}</span>
            <button type="button" onClick={() => onRetry(message)}>
              <RotateCcw size={14} />
              重试
            </button>
            <button type="button" onClick={() => onDiscard(message)}>
              <Trash2 size={14} />
              删除
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
