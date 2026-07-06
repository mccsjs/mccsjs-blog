import { randomUUID } from 'node:crypto';

// ─── 日志级别 ────────────────────────────────────────────────────────────
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ─── 日志条目 ────────────────────────────────────────────────────────────
interface LogEntry {
  t: string;                                     // timestamp
  l: LogLevel;                                    // level
  msg: string;                                    // message
  rid?: string;                                   // request id
  [key: string]: unknown;
}

function formatLevel(l: LogLevel): string {
  return l === 'debug' ? '\x1b[90mDBG\x1b[0m'
    : l === 'info' ? '\x1b[36mINF\x1b[0m'
    : l === 'warn' ? '\x1b[33mWRN\x1b[0m'
    : '\x1b[31mERR\x1b[0m';
}

const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[LOG_LEVEL];
}

// ─── 核心输出 ────────────────────────────────────────────────────────────
function write(entry: LogEntry) {
  const ts = entry.t as string;
  const lvl = entry.l;
  const msg = entry.msg as string;
  const rid = entry.rid as string | undefined;

  // 人类可读格式（开发环境）
  const line = process.env.NODE_ENV === 'production'
    ? JSON.stringify(entry)
    : `\x1b[90m${ts.slice(11, 23)}\x1b[0m ${formatLevel(lvl)} ${rid ? `\x1b[90m[${rid}]\x1b[0m ` : ''}${msg}`;

  if (lvl === 'error' || lvl === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

// ─── Logger 类 ───────────────────────────────────────────────────────────
export class Logger {
  constructor(private readonly reqId?: string) {}

  private log(level: LogLevel, message: string, extra: Record<string, unknown> = {}) {
    if (!shouldLog(level)) return;
    write({
      t: new Date().toISOString(),
      l: level,
      msg: message,
      ...(this.reqId ? { rid: this.reqId } : {}),
      ...extra,
    });
  }

  debug(message: string, extra?: Record<string, unknown>) {
    this.log('debug', message, extra);
  }

  info(message: string, extra?: Record<string, unknown>) {
    this.log('info', message, extra);
  }

  warn(message: string, extra?: Record<string, unknown>) {
    this.log('warn', message, extra);
  }

  error(message: string, error?: Error, extra?: Record<string, unknown>) {
    write({
      t: new Date().toISOString(),
      l: 'error',
      msg: message,
      ...(this.reqId ? { rid: this.reqId } : {}),
      ...extra,
      ...(error ? { err: { name: error.name, message: error.message, stack: error.stack } } : {}),
    });
  }

  /** 创建带额外固定字段的子 logger */
  child(extra: Record<string, unknown>): LoggerWithChild {
    return new LoggerWithChild(this.reqId, extra);
  }
}

// ─── 带固定字段的 Logger ────────────────────────────────────────────────
class LoggerWithChild {
  constructor(
    private readonly reqId?: string,
    private readonly fixed: Record<string, unknown> = {},
  ) {}

  private log(level: LogLevel, message: string, extra: Record<string, unknown> = {}) {
    if (!shouldLog(level)) return;
    write({
      t: new Date().toISOString(),
      l: level,
      msg: message,
      ...(this.reqId ? { rid: this.reqId } : {}),
      ...this.fixed,
      ...extra,
    });
  }

  debug(message: string, extra?: Record<string, unknown>) {
    this.log('debug', message, extra ?? {});
  }

  info(message: string, extra?: Record<string, unknown>) {
    this.log('info', message, extra ?? {});
  }

  warn(message: string, extra?: Record<string, unknown>) {
    this.log('warn', message, extra ?? {});
  }

  error(message: string, error?: Error, extra?: Record<string, unknown>) {
    write({
      t: new Date().toISOString(),
      l: 'error',
      msg: message,
      ...(this.reqId ? { rid: this.reqId } : {}),
      ...this.fixed,
      ...extra,
      ...(error ? { err: { name: error.name, message: error.message, stack: error.stack } } : {}),
    });
  }

  child(extra: Record<string, unknown>): LoggerWithChild {
    return new LoggerWithChild(this.reqId, { ...this.fixed, ...extra });
  }
}

// ─── 导出全局 logger（无 reqId） ────────────────────────────────────────
export const logger = new Logger();

// ─── 创建带 reqId 的 logger ────────────────────────────────────────────
export function reqLogger(reqId: string): Logger {
  return new Logger(reqId);
}

// ─── Elysia 请求 ID 中间件 ────────────────────────────────────────────
export function withRequestId() {
  return (app: any) =>
    app.derive(({ request }: { request: Request }) => {
      const reqId =
        request.headers.get('x-request-id') ??
        randomUUID().slice(0, 8);
      return { reqId, logger: new Logger(reqId) };
    });
}
