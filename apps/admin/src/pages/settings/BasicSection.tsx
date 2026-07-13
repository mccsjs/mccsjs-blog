import type { UseFormReturn } from 'react-hook-form';
import type { SettingsData } from './types';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Field, SectionTitle, OptionCard } from '../../components/settings/ui';

export function BasicSection({ form }: { form: UseFormReturn<SettingsData> }) {
  const { register, watch, setValue } = form;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="网站标题">
        <Input id="siteTitle" placeholder="My Blog" {...register('siteTitle')} />
      </Field>

      <Field label="每页文章数">
        <Input id="postsPerPage" type="number" min={1} max={100} {...register('postsPerPage')} />
      </Field>

      <Field label="站点地址" helper="用于邮件链接与 RSS，留空则使用请求域名">
        <Input id="siteUrl" placeholder="https://your-domain.com" {...register('siteUrl')} />
      </Field>

      <Field label="ICP 备案号">
        <Input id="icp" placeholder="京ICP备XXXXXXXX号" {...register('icp')} />
      </Field>

      <Field label="Logo URL" className="md:col-span-2">
        <Input id="siteLogo" placeholder="https://example.com/logo.png" {...register('siteLogo')} />
      </Field>

      <Field label="Favicon URL" className="md:col-span-2">
        <Input id="favicon" placeholder="https://example.com/favicon.ico" {...register('favicon')} />
      </Field>

      <Field label="字体 CSS 链接" helper="Google Fonts 等在线字体样式地址" className="md:col-span-2">
        <Input
          id="fontCssUrl"
          placeholder="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap"
          {...register('fontCssUrl')}
        />
      </Field>

      <Field label="字体族名" className="md:col-span-2">
        <Input id="fontFamily" placeholder="'Noto Sans SC', sans-serif" {...register('fontFamily')} />
      </Field>

      <Field label="背景图 URL" helper="首页背景图，留空使用默认背景" className="md:col-span-2">
        <Input id="backgroundImage" placeholder="https://example.com/bg.jpg" {...register('backgroundImage')} />
      </Field>

      <SectionTitle className="md:col-span-2">首页 Hero 背景</SectionTitle>

      <Field label="背景类型" className="md:col-span-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard
            active={watch('heroType') === 'image'}
            onClick={() => setValue('heroType', 'image', { shouldDirty: true })}
            title="图片"
            desc="使用静态图片作为首页顶部背景，稳定且兼容性好。"
          />
          <OptionCard
            active={watch('heroType') === 'video'}
            onClick={() => setValue('heroType', 'video', { shouldDirty: true })}
            title="视频"
            desc="循环自动播放的视频背景（手机端静音自动播放），加载前显示图片封面。"
          />
        </div>
      </Field>

      <Field label="背景图片 URL" helper="图片模式使用；视频模式作为视频加载前的封面" className="md:col-span-2">
        <Input id="heroImage" placeholder="/hero.webp 或 https://example.com/hero.jpg" {...register('heroImage')} />
      </Field>

      {watch('heroType') === 'video' && (
        <Field label="背景视频 URL" helper="仅支持 mp4；留空则回退到图片" className="md:col-span-2">
          <Input id="heroVideo" placeholder="/hero.mp4 或 https://example.com/hero.mp4" {...register('heroVideo')} />
        </Field>
      )}

      <SectionTitle className="md:col-span-2">图床</SectionTitle>

      <Field label="图床地址" className="md:col-span-2">
        <Input id="imgbedUrl" placeholder="https://imgbed.example.com" {...register('imgbedUrl')} />
      </Field>

      <Field label="API Token" className="md:col-span-2">
        <Input
          id="imgbedToken"
          type="password"
          autoComplete="off"
          placeholder="imgbed_xxxxxxxxxxxxxxxx"
          {...register('imgbedToken')}
        />
      </Field>

      <SectionTitle className="md:col-span-2">内容</SectionTitle>

      <Field label="网站描述" className="md:col-span-2">
        <Textarea id="siteDescription" rows={3} placeholder="一句话介绍网站" {...register('siteDescription')} />
      </Field>

      <Field label="自定义页脚文本" helper="支持 HTML" className="md:col-span-2">
        <Textarea id="footerText" rows={2} placeholder="显示在默认页脚下方" {...register('footerText')} />
      </Field>

      <Field label="友链页 Markdown" className="md:col-span-2">
        <Textarea id="linkMarkdown" rows={8} placeholder="友链页顶部文本，支持 Markdown" {...register('linkMarkdown')} />
      </Field>
    </div>
  );
}
