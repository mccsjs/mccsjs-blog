<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes" omit-xml-declaration="yes" />

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>站点地图 · Sitemap</title>
        <style>
          :root {
            --bg: 255 248 241; --bg-soft: 255 241 227; --surface: 255 255 255;
            --fg: 35 25 21; --fg-soft: 83 67 60; --fg-muted: 120 110 100;
            --primary: 165 85 38; --primary-soft: 255 235 210;
            --border: 220 200 180; --card-bg: 255 255 255;
            --glass: 255 248 241;
          }
          html.dark {
            --bg: 17 19 28; --bg-soft: 29 31 41; --surface: 45 48 58;
            --fg: 225 225 239; --fg-soft: 220 210 200; --fg-muted: 180 175 168;
            --primary: 255 182 147; --primary-soft: 100 45 10;
            --border: 90 80 70; --card-bg: 45 48 58;
            --glass: 29 31 41;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; }
          body {
            font-family: 'BlogFont', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            background: rgb(var(--bg));
            color: rgb(var(--fg));
            line-height: 1.7;
            min-height: 100dvh;
            -webkit-font-smoothing: antialiased;
            transition: background-color .4s ease, color .4s ease;
          }
          .wrap { max-width: 820px; margin: 0 auto; padding: 0 1.25rem 4rem; }

          .topbar {
            position: sticky; top: 0; z-index: 10;
            display: flex; align-items: center; justify-content: space-between;
            padding: 1rem 1.25rem;
            backdrop-filter: blur(16px) saturate(160%);
            background: rgb(var(--glass) / .72);
            border-bottom: 1px solid rgb(var(--border) / .6);
          }
          .brand { display: flex; align-items: center; gap: .6rem; font-weight: 700; letter-spacing: -.01em; }
          .brand .dot { width: 10px; height: 10px; border-radius: 50%; background: rgb(var(--primary)); box-shadow: 0 0 0 4px rgb(var(--primary) / .18); }
          .icon-btn {
            width: 38px; height: 38px; display: grid; place-items: center;
            border: 1px solid rgb(var(--border)); border-radius: 12px;
            background: rgb(var(--surface) / .6); color: rgb(var(--fg-soft));
            cursor: pointer; transition: transform .25s cubic-bezier(.16,1,.3,1), border-color .2s, background .2s;
          }
          .icon-btn:hover { transform: scale(1.06); border-color: rgb(var(--primary)); }
          .icon-btn svg { width: 18px; height: 18px; }

          .hero { padding: 3.5rem 0 1.5rem; }
          .eyebrow {
            display: inline-flex; align-items: center; gap: .45rem;
            font-size: .8rem; letter-spacing: .06em; text-transform: uppercase;
            color: rgb(var(--primary)); font-weight: 600;
            padding: .3rem .7rem; border-radius: 999px;
            background: rgb(var(--primary-soft) / .5); border: 1px solid rgb(var(--border) / .5);
          }
          .hero h1 { font-size: clamp(2rem, 5vw, 2.8rem); font-weight: 800; letter-spacing: -.03em; margin: 1rem 0 .6rem; }
          .hero p { color: rgb(var(--fg-soft)); max-width: 60ch; }
          .meta-row { display: flex; flex-wrap: wrap; gap: .5rem 1.2rem; margin-top: 1.3rem; color: rgb(var(--fg-muted)); font-size: .9rem; }
          .meta-row span { display: inline-flex; align-items: center; gap: .35rem; }

          .group { margin-top: 2.5rem; }
          .group-head { display: flex; align-items: center; gap: .6rem; margin-bottom: 1rem; }
          .group-head h2 { font-size: 1.15rem; font-weight: 700; letter-spacing: -.01em; }
          .group-head .count { font-size: .8rem; color: rgb(var(--fg-muted)); padding: .1rem .55rem; border-radius: 999px; background: rgb(var(--bg-soft)); border: 1px solid rgb(var(--border) / .5); }
          .group-head svg { width: 18px; height: 18px; color: rgb(var(--primary)); }

          .url-list { display: flex; flex-direction: column; gap: .6rem; }
          .row {
            display: flex; align-items: center; gap: .9rem;
            padding: .9rem 1.1rem; border-radius: 16px;
            background: rgb(var(--card-bg));
            border: 1px solid rgb(var(--border) / .7);
            transition: transform .3s cubic-bezier(.16,1,.3,1), border-color .25s, box-shadow .3s;
            opacity: 0; transform: translateY(10px);
            animation: rise .5s cubic-bezier(.16,1,.3,1) forwards;
          }
          .row:hover { transform: translateY(-2px); border-color: rgb(var(--primary) / .6); box-shadow: 0 12px 34px rgb(0 0 0 / .08); }
          .row .bullet { width: 8px; height: 8px; border-radius: 50%; background: rgb(var(--primary)); flex: 0 0 auto; }
          .row a { color: rgb(var(--fg)); text-decoration: none; font-weight: 600; word-break: break-all; background-image: linear-gradient(rgb(var(--primary)), rgb(var(--primary))); background-size: 0% 2px; background-repeat: no-repeat; background-position: 0 100%; transition: background-size .3s ease; }
          .row a:hover { background-size: 100% 2px; }
          .row .badges { margin-left: auto; display: flex; gap: .4rem; flex: 0 0 auto; }
          .badge { font-size: .72rem; padding: .18rem .55rem; border-radius: 999px; border: 1px solid rgb(var(--border) / .6); color: rgb(var(--fg-muted)); white-space: nowrap; }
          .badge.prio { background: rgb(var(--primary-soft) / .5); color: rgb(var(--primary)); border-color: rgb(var(--primary) / .3); font-weight: 600; }

          .foot { margin-top: 3rem; text-align: center; color: rgb(var(--fg-muted)); font-size: .85rem; }
          .foot code { font-family: ui-monospace, monospace; background: rgb(var(--bg-soft)); padding: .15rem .45rem; border-radius: 6px; }

          @keyframes rise { to { opacity: 1; transform: translateY(0); } }
          @media (max-width: 560px) {
            .row { flex-wrap: wrap; }
            .row .badges { margin-left: 0; width: 100%; padding-left: 1.7rem; }
          }
          @media (prefers-reduced-motion: reduce) {
            .row { animation: none; opacity: 1; transform: none; }
            * { transition: none !important; }
          }
        </style>
      </head>
      <body>
        <header class="topbar">
          <div class="brand"><span class="dot"></span>Sitemap</div>
          <div class="topbar-actions">
            <button class="icon-btn" id="themeToggle" aria-label="切换主题" title="切换明暗主题">
              <svg id="iconTheme" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            </button>
          </div>
        </header>

        <div class="wrap">
          <section class="hero">
            <span class="eyebrow">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Sitemap
            </span>
            <h1>站点地图</h1>
            <p>本站点所有可被搜索引擎抓取的页面一览：<code>/sitemap.xml</code></p>
            <div class="meta-row">
              <span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <xsl:value-of select="count(s:urlset/s:url)" /> 个页面
              </span>
            </div>
          </section>

          <!-- 分组：页面 -->
          <section class="group">
            <div class="group-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              <h2>页面</h2>
              <span class="count"><xsl:value-of select="count(s:urlset/s:url[not(contains(s:loc,'/posts/')) and not(contains(s:loc,'/categories/')) and not(contains(s:loc,'/tags/'))])" /></span>
            </div>
            <div class="url-list">
              <xsl:for-each select="s:urlset/s:url[not(contains(s:loc,'/posts/')) and not(contains(s:loc,'/categories/')) and not(contains(s:loc,'/tags/'))]">
                <xsl:call-template name="urlRow" />
              </xsl:for-each>
            </div>
          </section>

          <!-- 分组：文章 -->
          <section class="group">
            <div class="group-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              <h2>文章</h2>
              <span class="count"><xsl:value-of select="count(s:urlset/s:url[contains(s:loc,'/posts/')])" /></span>
            </div>
            <div class="url-list">
              <xsl:for-each select="s:urlset/s:url[contains(s:loc,'/posts/')]">
                <xsl:call-template name="urlRow" />
              </xsl:for-each>
            </div>
          </section>

          <!-- 分组：分类 -->
          <section class="group">
            <div class="group-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <h2>分类</h2>
              <span class="count"><xsl:value-of select="count(s:urlset/s:url[contains(s:loc,'/categories/')])" /></span>
            </div>
            <div class="url-list">
              <xsl:for-each select="s:urlset/s:url[contains(s:loc,'/categories/')]">
                <xsl:call-template name="urlRow" />
              </xsl:for-each>
            </div>
          </section>

          <!-- 分组：标签 -->
          <section class="group">
            <div class="group-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4v5.59A2 2 0 0 0 4.59 10l9.58 9.59a2 2 0 0 0 2.83 0l3.59-3.59a2 2 0 0 0 0-2.59z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              <h2>标签</h2>
              <span class="count"><xsl:value-of select="count(s:urlset/s:url[contains(s:loc,'/tags/')])" /></span>
            </div>
            <div class="url-list">
              <xsl:for-each select="s:urlset/s:url[contains(s:loc,'/tags/')]">
                <xsl:call-template name="urlRow" />
              </xsl:for-each>
            </div>
          </section>

          <p class="foot">本页为站点地图的美化视图：<code>/sitemap.xml</code></p>
        </div>

        <script>
          (function () {
            var root = document.documentElement;
            var saved = localStorage.getItem('theme');
            var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (dark) root.classList.add('dark');
            var icon = document.getElementById('iconTheme');
            var sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
            var moon = '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>';
            function paint() { icon.innerHTML = root.classList.contains('dark') ? sun : moon; }
            paint();
            document.getElementById('themeToggle').addEventListener('click', function () {
              root.classList.toggle('dark');
              localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
              paint();
            });
          })();
        </script>
      </body>
    </html>
  </xsl:template>

  <!-- 单行 URL 模板（须为 stylesheet 直接子节点；s: 前缀对应 sitemap 命名空间） -->
  <xsl:template name="urlRow">
    <xsl:variable name="afterScheme" select="substring-after(s:loc, '://')" />
    <xsl:variable name="path" select="substring-after($afterScheme, '/')" />
    <div class="row" style="animation-delay: {position() * 40}ms">
      <span class="bullet"></span>
      <a href="{s:loc}">
        <xsl:choose>
          <xsl:when test="string-length($path) = 0">/</xsl:when>
          <xsl:otherwise><xsl:value-of select="$path" /></xsl:otherwise>
        </xsl:choose>
      </a>
      <div class="badges">
        <xsl:if test="s:changefreq">
          <span class="badge"><xsl:value-of select="s:changefreq" /></span>
        </xsl:if>
        <xsl:if test="s:priority">
          <span class="badge prio">P<xsl:value-of select="s:priority" /></span>
        </xsl:if>
      </div>
    </div>
  </xsl:template>
</xsl:stylesheet>
