import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { updateProfileRequest } from '../lib/auth';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Icon } from '@iconify/react';

const schema = z
  .object({
    name: z.string().optional(),
    email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((d) => !d.newPassword || d.newPassword.length >= 6, {
    message: '新密码至少 6 位',
    path: ['newPassword'],
  })
  .refine((d) => !d.newPassword || d.newPassword === d.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // 每次打开时预填当前用户并清空状态
  useEffect(() => {
    if (open && user) {
      reset(
        {
          name: user.name ?? '',
          email: user.email ?? '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        },
        { keepDefaultValues: true }
      );
      setError(null);
      setSuccess(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setSuccess(false);

    const newEmail = (data.email ?? '').trim().toLowerCase();
    const emailChanged = newEmail !== (user?.email ?? '').toLowerCase();
    const changingPassword = !!data.newPassword;

    // 改账号或改密码都要先验证当前密码
    if ((emailChanged || changingPassword) && !data.currentPassword) {
      setError('修改账号或密码需先填写当前密码');
      return;
    }

    try {
      const res = await updateProfileRequest({
        name: data.name?.trim() || undefined,
        email: emailChanged ? newEmail : undefined,
        currentPassword: data.currentPassword || undefined,
        newPassword: data.newPassword || undefined,
      });

      setSuccess(true);
      // 刷新侧边栏显示的当前用户
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      reset(
        {
          name: res.user.name ?? '',
          email: res.user.email ?? '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        },
        { keepDefaultValues: true }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 弹窗头部 */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent)]">
              <Icon icon="lucide:user-round" width={18} height={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-h)]">账号设置</h2>
              <p className="text-xs text-[var(--text)]">修改登录账号、昵称与密码</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--text)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-h)]"
            aria-label="关闭"
          >
            <Icon icon="lucide:x" width={18} height={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label htmlFor="pd-name" className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
              昵称
            </Label>
            <Input id="pd-name" type="text" placeholder="显示名称" {...register('name')} />
            {errors.name && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="pd-email" className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
              登录邮箱（账号）
            </Label>
            <Input id="pd-email" type="text" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="mt-1.5 text-xs text-[#dc2626]">{errors.email.message}</p>}
          </div>

          <div className="border-t border-[var(--border)] pt-5">
            <p className="mb-4 text-sm font-medium text-[var(--text-h)]">修改密码</p>
            <div className="space-y-5">
              <div>
                <Label
                  htmlFor="pd-currentPassword"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-h)]"
                >
                  当前密码
                </Label>
                <Input
                  id="pd-currentPassword"
                  type="password"
                  placeholder="修改账号或密码时必填"
                  autoComplete="current-password"
                  {...register('currentPassword')}
                />
              </div>

              <div>
                <Label
                  htmlFor="pd-newPassword"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-h)]"
                >
                  新密码
                </Label>
                <Input
                  id="pd-newPassword"
                  type="password"
                  placeholder="留空则不修改（至少 6 位）"
                  autoComplete="new-password"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="mt-1.5 text-xs text-[#dc2626]">{errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="pd-confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-h)]"
                >
                  确认新密码
                </Label>
                <Input
                  id="pd-confirmPassword"
                  type="password"
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-[#dc2626]">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] px-3 py-2 text-sm text-[#dc2626]">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.06)] px-3 py-2 text-sm text-[#16a34a]">
              保存成功，新账号信息已生效
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isDirty && !success)}>
              {isSubmitting ? '保存中...' : '保存修改'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
