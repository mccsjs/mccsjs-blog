import { api } from './api';

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
};

// 登录：后端首次登录会用预设管理员账号自动初始化，成功后下发 HttpOnly 的 sid cookie
export async function loginRequest(email: string, password: string): Promise<void> {
  await api<{ ok: true }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// 获取当前登录用户；未登录返回 null
export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const res = await api<{ user: SessionUser }>('/api/admin/me');
    return res.user;
  } catch {
    return null;
  }
}

// 登出：清除服务端 session 与 cookie
export async function logoutRequest(): Promise<void> {
  await api<{ ok: true }>('/api/admin/logout', { method: 'POST' });
}

// 修改当前管理员资料（昵称 / 邮箱 / 密码）
export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export async function updateProfileRequest(
  payload: UpdateProfilePayload
): Promise<{ user: SessionUser }> {
  return api<{ user: SessionUser }>('/api/admin/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
