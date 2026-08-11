// 留言输入框：游客资料弹窗 / 图片粘贴拖拽 / 自适应高度 / 表情选择器
import { useEffect, useRef, useState } from 'react';
import { Image, LoaderCircle, Reply, Smile, TriangleAlert, X } from 'lucide-react';
import type { GuestbookMessage, GuestbookProfile } from './types';
import { MAX_IMAGE_SIZE_BYTES, MAX_MESSAGE_LENGTH, readImageAsDataUrl } from './utils';
import { getEmojiPacks, loadEmojiPacks, type OwOPack } from './emoji';

interface Props {
  profile: GuestbookProfile;
  draft: string;
  replyTarget: GuestbookMessage | null;
  composerError: string;
  isOffline: boolean;
  isSending: boolean;
  onProfileChange: (profile: GuestbookProfile) => void;
  onDraftChange: (draft: string) => void;
  onReplyCancel: () => void;
  onSend: (content: string) => Promise<boolean>;
  onToolError: (message: string) => void;
}

const isCompositionEvent = (e: React.KeyboardEvent) =>
  e.nativeEvent.isComposing;

export default function ChatComposer({
  profile,
  draft,
  replyTarget,
  composerError,
  isOffline,
  isSending,
  onProfileChange,
  onDraftChange,
  onReplyCancel,
  onSend,
  onToolError,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nickInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualHeight, setManualHeight] = useState<number | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [resizePointerId, setResizePointerId] = useState<number | null>(null);
  const [profileDraft, setProfileDraft] = useState<GuestbookProfile>({ nick: '', mail: '', link: '' });
  const [profileDialogError, setProfileDialogError] = useState('');
  const [pendingImage, setPendingImage] = useState<{ name: string; url: string; size: number } | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const resizeStart = useRef({ y: 0, height: 0 });
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const [emojiPacks, setEmojiPacks] = useState<OwOPack[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiTab, setEmojiTab] = useState(0);

  const hasGuestProfile = profile.nick.trim().length >= 2;

  useEffect(() => {
    let alive = true;
    loadEmojiPacks()
      .then((packs) => { if (alive) setEmojiPacks(packs); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => {
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [emojiOpen]);

  const insertEmoji = (item: { text: string; icon: string }) => {
    const token = `:${item.text}:`;
    const el = textareaRef.current;
    if (!el) {
      onDraftChange(draft + token);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + token + draft.slice(end);
    onDraftChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el || manualHeight !== null) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  };

  const getHeightBounds = () => {
    const el = textareaRef.current;
    if (!el) return null;
    const styles = getComputedStyle(el);
    const minHeight = Number.parseFloat(styles.minHeight);
    const configuredMax = Number.isFinite(Number.parseFloat(styles.maxHeight))
      ? Number.parseFloat(styles.maxHeight)
      : window.innerHeight * 0.45;
    const minimum = Number.isFinite(minHeight) ? minHeight : 56;
    return {
      min: minimum,
      max: Math.max(minimum, configuredMax),
      current: el.getBoundingClientRect().height,
    };
  };

  const setTextareaHeight = (height: number) => {
    const el = textareaRef.current;
    const bounds = getHeightBounds();
    if (!el || !bounds) return;
    const next = Math.round(Math.min(bounds.max, Math.max(bounds.min, height)));
    setManualHeight(next);
    el.style.height = `${next}px`;
  };

  const startResize = (e: React.PointerEvent) => {
    const el = textareaRef.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    setResizePointerId(e.pointerId);
    resizeStart.current = { y: e.clientY, height: el.getBoundingClientRect().height };
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
  };

  const moveResize = (e: React.PointerEvent) => {
    if (resizePointerId !== e.pointerId) return;
    setTextareaHeight(resizeStart.current.height + resizeStart.current.y - e.clientY);
  };

  const finishResize = (e: React.PointerEvent) => {
    if (resizePointerId !== e.pointerId) return;
    const handle = e.currentTarget as HTMLButtonElement;
    if (handle.hasPointerCapture(e.pointerId)) {
      handle.releasePointerCapture(e.pointerId);
    }
    setResizePointerId(null);
  };

  const handleResizeKeydown = (e: React.KeyboardEvent) => {
    const el = textareaRef.current;
    if (!el || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const bounds = getHeightBounds();
    if (!bounds) return;
    if (e.key === 'Home') setTextareaHeight(bounds.min);
    else if (e.key === 'End') setTextareaHeight(bounds.max);
    else setTextareaHeight(bounds.current + (e.key === 'ArrowUp' ? 16 : -16));
  };

  const handleKeydown = (e: React.KeyboardEvent) => {
    if (
      e.key !== 'Enter' ||
      e.shiftKey ||
      isCompositionEvent(e) ||
      isComposing
    ) {
      return;
    }
    e.preventDefault();
    void submitMessage();
  };

  const openGuestProfile = () => {
    setProfileDraft({ ...profile });
    setProfileDialogError('');
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => nickInputRef.current?.focus());
  };

  const closeGuestProfile = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    setProfileDialogError('');
    document.body.style.overflow = '';
  };

  const validateGuestProfile = (next: GuestbookProfile): string => {
    if (next.nick.length < 2) return '昵称至少需要 2 个字符';
    if (next.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(next.mail)) {
      return '邮箱格式不正确';
    }
    if (next.link) {
      try {
        const website = new URL(next.link);
        if (website.protocol !== 'http:' && website.protocol !== 'https:') {
          return '网站地址仅支持 http 或 https';
        }
      } catch {
        return '网站地址格式不正确';
      }
    }
    return '';
  };

  const saveGuestProfile = () => {
    const next = {
      nick: profileDraft.nick.trim(),
      mail: profileDraft.mail.trim(),
      link: profileDraft.link.trim(),
    };
    const error = validateGuestProfile(next);
    setProfileDialogError(error);
    if (error) return;
    onProfileChange(next);
    onToolError('');
    closeGuestProfile();
  };

  const handleImageFile = async (file: File) => {
    if (isProcessingImage) return;
    setIsProcessingImage(true);
    onToolError('');
    try {
      const result = await readImageAsDataUrl(file);
      if ('error' in result) {
        onToolError(result.error);
        return;
      }
      setPendingImage({
        name: file.name.replace(/[[\]]/gu, '').replace(/\.[^.]+$/u, '') || '图片',
        url: result.url,
        size: result.size,
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.type.startsWith('image/')) {
          e.preventDefault();
          void handleImageFile(file);
          return;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'));
    if (!imageFile) return;
    e.preventDefault();
    void handleImageFile(imageFile);
  };

  const submitMessage = async () => {
    if (!hasGuestProfile) {
      onToolError('请先填写昵称（信息）后再发送');
      return;
    }
    const content = pendingImage
      ? `${draft.trim()}\n\n![${pendingImage.name}](${pendingImage.url})`.trim()
      : draft.trim();
    const accepted = await onSend(content);
    if (accepted) {
      onDraftChange('');
      setPendingImage(null);
      textareaRef.current?.focus();
    }
  };

  return (
    <footer className="guestbook-composer">
      {replyTarget && (
        <div className="guestbook-composer__reply">
          <Reply size={16} />
          <div>
            <span>回复 @{replyTarget.nick}</span>
            <small>{replyTarget.body.replace(/<[^>]*>/gu, '').slice(0, 80)}</small>
          </div>
          <button type="button" onClick={onReplyCancel} aria-label="取消引用" title="取消引用">
            <X size={18} />
          </button>
        </div>
      )}

      <div className={`guestbook-composer__editor${resizePointerId !== null ? ' is-resizing' : ''}`}>
        <button
          className="guestbook-composer__resize-handle"
          type="button"
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
          onKeyDown={handleResizeKeydown}
          aria-label="调整输入框高度"
          title="向上拖动扩大输入框"
        />
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            onDraftChange(e.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeydown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="说点什么...（支持 :表情: 和粘贴图片）"
          aria-label="留言内容"
          disabled={isOffline}
        />

        {pendingImage && (
          <div className="guestbook-composer__image-preview">
            <img src={pendingImage.url} alt={pendingImage.name} />
            <span>
              {pendingImage.name}（{(pendingImage.size / 1024).toFixed(0)} KB）
            </span>
            <button type="button" onClick={() => setPendingImage(null)} aria-label="移除待发送图片" title="移除图片">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="guestbook-composer__footer">
          <div className="guestbook-composer__actions">
            <span className="guestbook-composer__count">
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </span>
            <button
              type="button"
              className={`guestbook-composer__emoji-trigger${emojiOpen ? ' is-active' : ''}`}
              onClick={() => setEmojiOpen((v) => !v)}
              aria-label="插入表情"
              aria-expanded={emojiOpen}
              title="表情"
              disabled={isOffline || emojiPacks.length === 0}
            >
              <Smile size={18} />
            </button>
            <button
              type="button"
              className="guestbook-composer__image-trigger"
              onClick={() => fileInputRef.current?.click()}
              aria-label="上传图片（粘贴或拖拽也可）"
              title={`图片（≤${MAX_IMAGE_SIZE_BYTES / 1024}KB）`}
              disabled={isOffline || isProcessingImage}
            >
              {isProcessingImage ? (
                <LoaderCircle size={18} className="is-spinning" />
              ) : (
                <Image size={18} />
              )}
            </button>
            <input
              ref={fileInputRef}
              className="guestbook-composer__file-input"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) void handleImageFile(f);
                e.currentTarget.value = '';
              }}
            />
          </div>
          <div className="guestbook-composer__tools">
            <button
              className="guestbook-composer__guest-profile"
              type="button"
              onClick={() => void openGuestProfile()}
              title={hasGuestProfile ? `游客：${profile.nick}（点击修改）` : '填写评论信息'}
            >
              {hasGuestProfile ? profile.nick : '信息'}
            </button>
            <button
              className="guestbook-composer__send"
              type="button"
              onClick={() => void submitMessage()}
              disabled={isOffline || isSending || isProcessingImage}
              aria-busy={isSending}
            >
              {isSending ? '发送中' : '发送'}
            </button>
          </div>
          {emojiOpen && emojiPacks.length > 0 && (
            <div className="guestbook-composer__emojis" ref={emojiPanelRef}>
              <div className="guestbook-composer__emoji-tabs" role="tablist">
                {emojiPacks.map((pack, i) => (
                  <button
                    key={pack.name}
                    type="button"
                    role="tab"
                    aria-selected={i === emojiTab}
                    title={pack.name}
                    className={i === emojiTab ? 'is-active' : ''}
                    onClick={() => setEmojiTab(i)}
                  >
                    {/^https?:\/\//i.test(pack.icon) && (
                      <img alt="" loading="lazy" src={pack.icon} />
                    )}
                    <span>{pack.name}</span>
                  </button>
                ))}
              </div>
              <div
                className={`guestbook-composer__emoji-grid${
                  /^https?:\/\//i.test(emojiPacks[emojiTab]?.icon ?? '') ? '' : ' is-text'
                }`}
              >
                {emojiPacks[emojiTab]?.items.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    title={item.text}
                    onClick={() => insertEmoji(item)}
                  >
                    {/^https?:\/\//i.test(item.icon) ? (
                      <img alt="" loading="lazy" src={item.icon} />
                    ) : (
                      <span>{item.icon}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {composerError && (
        <div className="guestbook-composer__error" role="alert">
          <TriangleAlert size={16} />
          <span>{composerError}</span>
          <button type="button" onClick={() => onToolError('')} aria-label="关闭提示" title="关闭提示">
            <X size={15} />
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="guestbook-modal guestbook-profile-modal"
        aria-labelledby="guestbook-profile-title"
        onClose={() => {
          setProfileDialogError('');
          document.body.style.overflow = '';
        }}
        onCancel={(e) => {
          e.preventDefault();
          closeGuestProfile();
        }}
      >
        <div className="guestbook-modal__overlay" onClick={closeGuestProfile} />
        <form
          className="guestbook-modal__panel guestbook-profile-modal__panel"
          onSubmit={(e) => {
            e.preventDefault();
            saveGuestProfile();
          }}
        >
          <div className="guestbook-modal__header">
            <h2 id="guestbook-profile-title">评论信息</h2>
            <button className="guestbook-modal__close" type="button" onClick={closeGuestProfile} aria-label="关闭评论信息">
              <X size={20} />
            </button>
          </div>
          <div className="guestbook-modal__body guestbook-profile-modal__body">
            <label>
              <span>昵称</span>
              <input
                ref={nickInputRef}
                value={profileDraft.nick}
                onChange={(e) => setProfileDraft({ ...profileDraft, nick: e.target.value })}
                maxLength={30}
                autoComplete="nickname"
                placeholder="至少 2 个字符"
                required
              />
            </label>
            <label>
              <span>邮箱</span>
              <input
                value={profileDraft.mail}
                onChange={(e) => setProfileDraft({ ...profileDraft, mail: e.target.value })}
                maxLength={100}
                type="email"
                autoComplete="email"
                placeholder="用于头像，不公开"
              />
            </label>
            <label>
              <span>网址</span>
              <input
                value={profileDraft.link}
                onChange={(e) => setProfileDraft({ ...profileDraft, link: e.target.value })}
                maxLength={200}
                type="url"
                autoComplete="url"
                placeholder="可选"
              />
            </label>
            {profileDialogError && (
              <p className="guestbook-profile-modal__error" role="alert">
                {profileDialogError}
              </p>
            )}
          </div>
          <div className="guestbook-modal__footer guestbook-profile-modal__actions">
            <button className="guestbook-modal__cancel" type="button" onClick={closeGuestProfile}>
              取消
            </button>
            <button className="guestbook-modal__confirm" type="submit">
              保存资料
            </button>
          </div>
        </form>
      </dialog>
    </footer>
  );
}
