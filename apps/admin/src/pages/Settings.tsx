import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import Button from '../components/ui/button';
import { Icon } from '@iconify/react';
import { type SettingsData, type Badge, defaultValues } from './settings/types';
import { BasicSection } from './settings/BasicSection';
import { CommentSection } from './settings/CommentSection';
import { FooterSection } from './settings/FooterSection';

const TAB_LIST = [
  { key: 'basic', label: '基本信息' },
  { key: 'comment', label: '评论' },
  { key: 'footer', label: '页脚' },
] as const;

export default function Settings() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'basic' | 'comment' | 'footer'>('basic');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgesDirty, setBadgesDirty] = useState(false);

  // 邮件通知测试状态
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleTestEmail = async () => {
    const to = testEmail.trim();
    if (!to) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api<{ ok: boolean; message: string }>('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: to }),
      });
      setTestResult({ ok: !!res.ok, message: res.message || (res.ok ? '发送成功' : '发送失败') });
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || '网络请求失败' });
    } finally {
      setTestLoading(false);
    }
  };

  const { data, isLoading } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: () => api('/api/settings'),
  });

  const form = useForm<SettingsData>({ defaultValues });
  const {
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = form;

  useEffect(() => {
    if (data) {
      reset({ ...defaultValues, ...data });
      try {
        setBadges(data.footerBadges ? JSON.parse(data.footerBadges) : []);
      } catch {
        setBadges([]);
      }
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: SettingsData) =>
      api<SettingsData>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ ...values, footerBadges: JSON.stringify(badges) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setBadgesDirty(false);
    },
  });

  const onSubmit = (values: SettingsData) => {
    mutation.mutate(values);
  };

  const updateBadge = (i: number, key: keyof Badge, val: string) => {
    setBadges((prev) => prev.map((b, idx) => (idx === i ? { ...b, [key]: val } : b)));
    setBadgesDirty(true);
  };
  const addBadge = () => {
    setBadges((prev) => [...prev, { title: '', href: '', img: '' }]);
    setBadgesDirty(true);
  };
  const removeBadge = (i: number) => {
    setBadges((prev) => prev.filter((_, idx) => idx !== i));
    setBadgesDirty(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1>系统设置</h1>
          <p className="text-sm text-[var(--text)]">网站基本信息、评论与页脚配置</p>
        </div>
        <Icon icon="lucide:settings-2" width={20} height={20} className="text-[var(--text)]" />
      </div>

      {/* Tab 切换 */}
      <div className="flex w-fit gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1">
        {TAB_LIST.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text)] hover:text-[var(--text-h)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-8 text-center text-sm text-[var(--text)]">
          加载中...
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm"
        >
          {tab === 'basic' && <BasicSection form={form} />}
          {tab === 'comment' && (
            <CommentSection
              form={form}
              showTestEmail={showTestEmail}
              setShowTestEmail={setShowTestEmail}
              testEmail={testEmail}
              setTestEmail={setTestEmail}
              testResult={testResult}
              setTestResult={setTestResult}
              testLoading={testLoading}
              handleTestEmail={handleTestEmail}
            />
          )}
          {tab === 'footer' && (
            <FooterSection
              form={form}
              badges={badges}
              updateBadge={updateBadge}
              addBadge={addBadge}
              removeBadge={removeBadge}
            />
          )}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
            {mutation.isSuccess && <span className="text-sm text-green-600">保存成功</span>}
            {mutation.isError && (
              <span className="text-sm text-red-500">
                {mutation.error instanceof Error ? mutation.error.message : '保存失败'}
              </span>
            )}
            <Button type="submit" disabled={(!isDirty && !badgesDirty) || isSubmitting || mutation.isPending}>
              <Icon icon="lucide:save" width={16} height={16} />
              {mutation.isPending ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
