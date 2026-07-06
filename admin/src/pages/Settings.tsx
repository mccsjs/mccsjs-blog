import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Icon } from '@iconify/react';

interface SettingsData {
  siteTitle: string;
  siteDescription: string;
  siteLogo: string;
  favicon: string;
  icp: string;
  footerText: string;
  postsPerPage: string;
  twikooEnvId: string;
  fontCssUrl: string;
  fontFamily: string;
  backgroundImage: string;
  linkMarkdown: string;
}

const defaultValues: SettingsData = {
  siteTitle: '',
  siteDescription: '',
  siteLogo: '',
  favicon: '',
  icp: '',
  footerText: '',
  postsPerPage: '10',
  twikooEnvId: '',
  fontCssUrl: '',
  fontFamily: '',
  backgroundImage: '',
  linkMarkdown: '',
};

export default function Settings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: () => api('/api/settings'),
  });

  const {
    register,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<SettingsData>({ defaultValues });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: SettingsData) =>
      api<SettingsData>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const onSubmit = (values: SettingsData) => {
    mutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-h)]">系统设置</h1>
          <p className="mt-1 text-sm text-[var(--text)]">管理网站基本信息与评论配置</p>
        </div>
        <Icon icon="lucide:settings-2" width={20} height={20} className="text-[var(--text)]" />
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
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="网站标题">
              <Input id="siteTitle" placeholder="My Blog" {...register('siteTitle')} />
            </Field>

            <Field label="每页文章数">
              <Input
                id="postsPerPage"
                type="number"
                min={1}
                max={100}
                {...register('postsPerPage')}
              />
            </Field>

            <Field label="Logo URL" className="md:col-span-2">
              <Input id="siteLogo" placeholder="https://example.com/logo.png" {...register('siteLogo')} />
            </Field>

            <Field label="Favicon URL" className="md:col-span-2">
              <Input id="favicon" placeholder="https://example.com/favicon.ico" {...register('favicon')} />
            </Field>

            <Field label="字体 CSS 链接" className="md:col-span-2">
              <Input
                id="fontCssUrl"
                placeholder="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap"
                {...register('fontCssUrl')}
              />
            </Field>

            <Field label="字体族名" className="md:col-span-2">
              <Input
                id="fontFamily"
                placeholder="'Noto Sans SC', sans-serif"
                {...register('fontFamily')}
              />
            </Field>

            <Field label="背景图 URL" className="md:col-span-2">
              <Input
                id="backgroundImage"
                placeholder="https://example.com/bg.jpg"
                {...register('backgroundImage')}
              />
            </Field>

            <Field label="ICP 备案号" className="md:col-span-2">
              <Input id="icp" placeholder="京ICP备XXXXXXXX号" {...register('icp')} />
            </Field>

            <Field label="Twikoo envId" className="md:col-span-2">
              <Input
                id="twikooEnvId"
                placeholder="https://twikoo.xxx.vercel.app"
                {...register('twikooEnvId')}
              />
            </Field>

            <Field label="网站描述" className="md:col-span-2">
              <Textarea
                id="siteDescription"
                rows={3}
                placeholder="一句话介绍网站"
                {...register('siteDescription')}
              />
            </Field>

            <Field label="自定义页脚文本" className="md:col-span-2">
              <Textarea
                id="footerText"
                rows={2}
                placeholder="支持 HTML，会显示在默认页脚下方"
                {...register('footerText')}
              />
            </Field>

            <Field label="友链页 Markdown" className="md:col-span-2">
              <Textarea
                id="linkMarkdown"
                rows={8}
                placeholder="友链页顶部文本，支持 Markdown"
                {...register('linkMarkdown')}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
            {mutation.isSuccess && (
              <span className="text-sm text-green-600">保存成功</span>
            )}
            {mutation.isError && (
              <span className="text-sm text-red-500">
                {mutation.error instanceof Error ? mutation.error.message : '保存失败'}
              </span>
            )}
            <Button
              type="submit"
              disabled={!isDirty || isSubmitting || mutation.isPending}
            >
              <Icon icon="lucide:save" width={16} height={16} />
              {mutation.isPending ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={label}>{label}</Label>
      {children}
    </div>
  );
}
