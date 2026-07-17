import type { UseFormReturn } from 'react-hook-form';
import type { SettingsData } from './types';
import { Input } from '../../components/ui/input';
import { Field, SectionTitle } from '../../components/settings/ui';
import { Icon } from '@iconify/react';
import { useState } from 'react';

export function ImageBedSection({ form }: { form: UseFormReturn<SettingsData> }) {
  const { register } = form;
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTestUpload = async () => {
    // 创建一个测试图片（1x1 像素 PNG）
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx?.fillRect(0, 0, 1, 1);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      setTestResult({ ok: false, message: '无法生成测试图片' });
      return;
    }

    const fd = new FormData();
    fd.append('file', blob, 'test-upload.png');

    setTestLoading(true);
    setTestResult(null);
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
      const response = await fetch(`${baseUrl}/api/imgbed/upload`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const err = data && typeof data === 'object' && 'error' in data ? String(data.error) : ('HTTP ' + response.status);
        setTestResult({ ok: false, message: err });
        return;
      }
      const url = (data as any)?.url;
      if (url) {
        setTestResult({ ok: true, message: `上传成功：${url}` });
      } else {
        setTestResult({ ok: false, message: '图床未返回图片地址' });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || '网络请求失败' });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <SectionTitle className="md:col-span-2 flex items-center gap-2">
        <Icon icon="line-md:image" width={18} height={18} className="text-[var(--primary)]" />
        图床配置
      </SectionTitle>

      <Field label="图床服务地址" helper="Cloudflare-ImgBed 等兼容服务的 API 地址" className="md:col-span-2">
        <Input id="imgbedUrl" placeholder="https://imgbed.example.com" {...register('imgbedUrl')} />
      </Field>

      <Field label="API Token" helper="用于鉴权的 Bearer Token，填写后仅管理员可见（GET 接口不返回）。评论区上传共用此 Token" className="md:col-span-2">
        <Input
          id="imgbedToken"
          type="password"
          autoComplete="off"
          placeholder="imgbed_xxxxxxxxxxxxxxxx"
          {...register('imgbedToken')}
        />
      </Field>

      {/* 评论区专用配置：独立地址 / 子路径，但共用上方 Token */}
      <SectionTitle className="md:col-span-2 flex items-center gap-2 text-[var(--fg-soft)]">
        <Icon icon="lucide:message-square-image" width={16} height={16} className="text-[var(--primary)]" />
        评论区专用配置（共用上方 Token）
      </SectionTitle>

      <Field label="图床地址（评论区）" helper="留空则复用上方主图床地址；可指向不同实例或子路径（如 https://imgbed.example.com/pl）" className="md:col-span-2">
        <Input id="imgbedCommentUrl" placeholder="https://imgbed.example.com/pl（留空则用主图床）" {...register('imgbedCommentUrl')} />
      </Field>

      <Field label="上传路径（评论区）" helper="Cloudflare-ImgBed 的 path 参数，如 pl；留空则存根目录" className="md:col-span-2">
        <Input id="imgbedCommentPath" placeholder="pl" {...register('imgbedCommentPath')} />
      </Field>

      <div className="md:col-span-2 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg)/0.5] p-4 text-sm text-[var(--fg-muted)]">
        <p>图床用于：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>评论区图片上传</strong> — 访客在评论中插入的图片将上传至此图床</li>
          <li><strong>后台文章编辑</strong> — Markdown 编辑器工具栏上传按钮使用此图床</li>
          <li><strong>封面图上传</strong> — 文章封面图片直传 R2 或此图床</li>
        </ul>

        {/* 上传测试 */}
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={handleTestUpload}
            disabled={testLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-[var(--accent)] text-white hover:brightness-110 disabled:opacity-50"
          >
            <Icon icon="lucide:upload" width={14} height={14} />
            {testLoading ? '测试中…' : '测试上传'}
          </button>
          {testResult && (
            <span className={`text-xs ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
              {testResult.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
