// Twikoo 客户端（URL 模式直连云函数）
// 协议：POST {envId}，body { event, accessToken, envId, ...params }
// 响应 accessToken 为访客会话令牌，需保存回传（删除自己评论的鉴权）
import { messageConfig } from '../../config/messageConfig';
import type { TwikooComment } from './types';

const ACCESS_TOKEN_KEY = 'twikoo-access-token';
const LANG = 'zh-CN';

let ENV_ID = '';

/** 设置 Twikoo 服务地址（页面挂载时由组件注入） */
export function configureTwikoo(envId: string) {
  if (envId) ENV_ID = envId;
}

function readAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveAccessToken(token: string) {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // 隐私模式忽略
  }
}

async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const accessToken = readAccessToken();
  const response = await fetch(ENV_ID, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: action,
      accessToken,
      envId: ENV_ID,
      ...params,
    }),
  });
  if (!response.ok) {
    throw new Error(`留言服务请求失败 (${response.status})`);
  }
  const json = (await response.json()) as Record<string, unknown> & {
    accessToken?: string;
    code?: number;
    message?: string;
  };
  if (typeof json.accessToken === 'string') {
    saveAccessToken(json.accessToken);
  }
  if (typeof json.code === 'number' && json.code !== 0) {
    throw new Error(
      (typeof json.message === 'string' ? json.message : '留言服务异常') + ` (${json.code})`,
    );
  }
  return json as T;
}

export interface CommentGetResult {
  data: TwikooComment[];
  more: boolean;
  count: number;
}

/** COMMENT_GET：分页拉取留言 */
export async function getComments(page: number, pageSize: number): Promise<CommentGetResult> {
  return call<CommentGetResult>('COMMENT_GET', {
    url: messageConfig.path,
    page,
    pageSize,
    lang: LANG,
  });
}

export interface SubmitCommentOptions {
  nick: string;
  mail?: string;
  link?: string;
  comment: string;
  pid?: string;
  rid?: string;
}

/** COMMENT_SUBMIT：发留言，返回服务端生成的评论 */
export async function submitComment(
  options: SubmitCommentOptions,
): Promise<Partial<TwikooComment> & { id: string }> {
  const result = await call<Partial<TwikooComment> & { id: string }>('COMMENT_SUBMIT', {
    nick: options.nick,
    mail: options.mail || '',
    link: options.link || '',
    ua: navigator.userAgent,
    url: messageConfig.path,
    href: window.location.href,
    comment: options.comment,
    pid: options.pid ?? undefined,
    rid: options.rid ?? undefined,
  });
  if (!result.id) {
    throw new Error('留言发送失败，请稍后重试');
  }
  return result;
}

/** COMMENT_DELETE_FOR_USER：删除自己的留言（参数是 id，不是 commentId） */
export async function deleteComment(commentId: string): Promise<void> {
  await call('COMMENT_DELETE_FOR_USER', {
    url: messageConfig.path,
    id: commentId,
  });
}
