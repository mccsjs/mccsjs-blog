// 留言板数据类型（Twikoo 后端协议 + 内部消息模型）

/** Twikoo 服务端评论对象（COMMENT_GET 实测结构） */
export interface TwikooComment {
  id: string;
  nick: string;
  avatar: string | null;
  mailMd5?: string;
  link?: string;
  comment: string;
  os?: string;
  browser?: string;
  ipRegion?: string;
  master?: boolean;
  replies?: TwikooComment[];
  rid?: string | null;
  pid?: string | null;
  ruser?: { nick?: string } | null;
  isSpam?: boolean;
  isOwner?: boolean;
  created: number;
  updated?: number;
  status?: string;
}

/** 留言板内部消息模型（评论树扁平化后的气泡数据） */
export interface GuestbookMessage {
  id: string;
  nick: string;
  avatar: string;
  link?: string;
  body: string;
  createdAt: number;
  isAdmin: boolean;
  isOwner?: boolean;
  replyToId?: string;
  replyToNick?: string;
  browser?: string;
  os?: string;
  addr?: string;
  label?: string;
  localState?: 'sending' | 'failed';
  failureReason?: string;
}

/** 游客资料（localStorage） */
export interface GuestbookProfile {
  nick: string;
  mail: string;
  link: string;
}
