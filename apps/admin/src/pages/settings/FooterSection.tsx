import type { UseFormReturn } from 'react-hook-form';
import type { SettingsData, Badge } from './types';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import Button from '../../components/ui/button';
import { Icon } from '@iconify/react';
import { Field } from '../../components/settings/ui';

interface FooterSectionProps {
  form: UseFormReturn<SettingsData>;
  badges: Badge[];
  updateBadge: (i: number, key: keyof Badge, val: string) => void;
  addBadge: () => void;
  removeBadge: (i: number) => void;
}

export function FooterSection({ form, badges, updateBadge, addBadge, removeBadge }: FooterSectionProps) {
  const { register, watch, setValue } = form;
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2>版权</h2>
        <Field label="网站起始时间" helper="留空只显示当前年份">
          <Input id="siteStartDate" type="date" {...register('siteStartDate')} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2>框架信息</h2>
        <Field label="框架信息文本" helper="留空显示默认文案">
          <Textarea
            id="footerTechInfo"
            rows={2}
            placeholder="由 Astro | Tailwind CSS | ElysiaJS + Bun 驱动"
            {...register('footerTechInfo')}
          />
        </Field>
      </section>

      <section className="space-y-4">
        <div>
          <h2>格言卡片</h2>
          <p className="text-xs text-[var(--text)]">配置后显示在页脚。</p>
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--border-strong)]"
            checked={watch('showMotto') === 'true'}
            onChange={(e) =>
              setValue('showMotto', e.target.checked ? 'true' : 'false', { shouldDirty: true })
            }
          />
          <span className="text-sm text-[var(--text)]">显示格言卡片</span>
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="标题">
            <Input id="mottoTitle" placeholder="格言" {...register('mottoTitle')} />
          </Field>
          <Field label="按钮文本">
            <Input id="mottoCtaText" placeholder="了解作者" {...register('mottoCtaText')} />
          </Field>
          <Field label="按钮链接">
            <Input id="mottoCtaUrl" placeholder="/about/" {...register('mottoCtaUrl')} />
          </Field>
          <Field label="打开方式">
            <select
              id="mottoCtaTarget"
              {...register('mottoCtaTarget')}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="_self">当前窗口</option>
              <option value="_blank">新窗口</option>
            </select>
          </Field>
          <Field label="格言正文" className="md:col-span-2">
            <Textarea id="mottoText" rows={3} placeholder="支持换行" {...register('mottoText')} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2>页脚徽标</h2>
        <p className="text-xs text-[var(--text)]">显示在页脚底部，支持 shields.io 风格图片。</p>

        <div className="space-y-3">
          {badges.length === 0 && (
            <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-4 text-center text-sm text-[var(--text)]">
              还没有徽标
            </p>
          )}

          {badges.map((b, i) => (
            <div
              key={i}
              className="grid items-center gap-3 rounded-lg border border-[var(--border)] p-3 md:grid-cols-[1fr_1.5fr_2fr_auto]"
            >
              <Input
                placeholder="标题"
                value={b.title}
                onChange={(e) => updateBadge(i, 'title', e.target.value)}
              />
              <Input
                placeholder="链接 URL"
                value={b.href}
                onChange={(e) => updateBadge(i, 'href', e.target.value)}
              />
              <Input
                placeholder="图片 URL"
                value={b.img}
                onChange={(e) => updateBadge(i, 'img', e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={() => removeBadge(i)} title="删除徽标">
                <Icon icon="lucide:trash-2" width={16} height={16} />
              </Button>
            </div>
          ))}

          <Button type="button" variant="secondary" onClick={addBadge}>
            <Icon icon="lucide:plus" width={16} height={16} />
            添加徽标
          </Button>
        </div>
      </section>
    </div>
  );
}
