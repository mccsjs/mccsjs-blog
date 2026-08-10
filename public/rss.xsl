<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" omit-xml-declaration="yes" />

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title><xsl:value-of select="rss/channel/title" /> · RSS 订阅</title>
        <style>
          :root {
            --bg: 255 248 241; --bg-soft: 255 241 227; --surface: 255 255 255;
            --fg: 35 25 21; --fg-soft: 83 67 60; --fg-muted: 120 110 100;
            --primary: 165 85 38; --primary-soft: 255 235 210;
            --border: 220 200 180; --card-bg: 255 255 255; --tag-bg: 255 241 227;
            --glass: 255 248 241;
          }
          html.dark {
            --bg: 17 19 28; --bg-soft: 29 31 41; --surface: 45 48 58;
            --fg: 225 225 239; --fg-soft: 220 210 200; --fg-muted: 180 175 168;
            --primary: 255 182 147; --primary-soft: 100 45 10;
            --border: 90 80 70; --card-bg: 45 48 58; --tag-bg: 29 31 41;
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
          .wrap { max-width: 760px; margin: 0 auto; padding: 0 1.25rem 4rem; }

          /* 顶栏 */
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
          .topbar-actions { display: flex; align-items: center; gap: .5rem; }
          .icon-btn {
            width: 38px; height: 38px; display: grid; place-items: center;
            border: 1px solid rgb(var(--border)); border-radius: 12px;
            background: rgb(var(--surface) / .6); color: rgb(var(--fg-soft));
            cursor: pointer; transition: transform .25s cubic-bezier(.16,1,.3,1), border-color .2s, background .2s;
          }
          .icon-btn:hover { transform: scale(1.06); border-color: rgb(var(--primary)); }
          .icon-btn svg { width: 18px; height: 18px; }

          /* Hero */
          .hero { padding: 3.5rem 0 2rem; }
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

          /* 订阅按钮 */
          .subscribe { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 1.6rem; }
          .btn {
            display: inline-flex; align-items: center; gap: .5rem;
            padding: .6rem 1.1rem; border-radius: 12px; font-weight: 600; font-size: .9rem;
            text-decoration: none; cursor: pointer;
            transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s, background .2s;
          }
          .btn-primary { background: rgb(var(--primary)); color: #fff; border: 1px solid transparent; box-shadow: 0 6px 20px rgb(var(--primary) / .28); }
          .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgb(var(--primary) / .38); }
          .btn-ghost { background: rgb(var(--surface) / .6); color: rgb(var(--fg)); border: 1px solid rgb(var(--border)); }
          .btn-ghost:hover { transform: translateY(-2px); border-color: rgb(var(--primary)); }
          .btn svg { width: 16px; height: 16px; }

          /* 列表 */
          .list { display: flex; flex-direction: column; gap: 1rem; margin-top: 2.5rem; }
          .item {
            position: relative;
            padding: 1.4rem 1.5rem;
            border-radius: 20px;
            background: rgb(var(--card-bg));
            border: 1px solid rgb(var(--border) / .7);
            backdrop-filter: blur(8px);
            transition: transform .3s cubic-bezier(.16,1,.3,1), border-color .25s, box-shadow .3s;
            opacity: 0; transform: translateY(14px);
            animation: rise .55s cubic-bezier(.16,1,.3,1) forwards;
          }
          .item:hover { transform: translateY(-3px); border-color: rgb(var(--primary) / .6); box-shadow: 0 14px 40px rgb(0 0 0 / .08); }
          .item h2 { font-size: 1.2rem; font-weight: 700; letter-spacing: -.01em; line-height: 1.4; }
          .item h2 a { color: rgb(var(--fg)); text-decoration: none; background-image: linear-gradient(rgb(var(--primary)), rgb(var(--primary))); background-size: 0% 2px; background-repeat: no-repeat; background-position: 0 100%; transition: background-size .3s ease; }
          .item h2 a:hover { background-size: 100% 2px; }
          .item .date { display: block; margin: .5rem 0 .7rem; color: rgb(var(--fg-muted)); font-size: .82rem; }
          .item .desc { color: rgb(var(--fg-soft)); font-size: .95rem; }
          .tags { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .9rem; }
          .tag { font-size: .76rem; padding: .2rem .6rem; border-radius: 999px; background: rgb(var(--tag-bg)); border: 1px solid rgb(var(--border) / .6); color: rgb(var(--fg-soft)); }

          .foot { margin-top: 3rem; text-align: center; color: rgb(var(--fg-muted)); font-size: .85rem; }
          .foot code { font-family: ui-monospace, monospace; background: rgb(var(--bg-soft)); padding: .15rem .45rem; border-radius: 6px; }

          @keyframes rise { to { opacity: 1; transform: translateY(0); } }
          @media (prefers-reduced-motion: reduce) {
            .item { animation: none; opacity: 1; transform: none; }
            * { transition: none !important; }
          }
        </style>
      </head>
      <body>
        <header class="topbar">
          <div class="brand"><span class="dot"></span><xsl:value-of select="rss/channel/title" /></div>
          <div class="topbar-actions">
            <button class="icon-btn" id="themeToggle" aria-label="切换主题" title="切换明暗主题">
              <svg id="iconTheme" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            </button>
          </div>
        </header>

        <div class="wrap">
          <section class="hero">
            <span class="eyebrow">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
              RSS Feed
            </span>
            <h1><xsl:value-of select="rss/channel/title" /></h1>
            <p><xsl:value-of select="rss/channel/description" /></p>
            <div class="meta-row">
              <span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/></svg>
                <xsl:value-of select="count(rss/channel/item)" /> 篇文章
              </span>
              <span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>
                <xsl:value-of select="rss/channel/language" />
              </span>
              <span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <xsl:value-of select="rss/channel/generator" />
              </span>
            </div>
            <div class="subscribe">
              <a class="btn btn-primary" href="/rss.xml">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                订阅 RSS
              </a>
            </div>
          </section>

          <section class="list">
            <xsl:for-each select="rss/channel/item">
              <xsl:sort select="pubDate" order="descending" />
              <article class="item" style="animation-delay: {position() * 60}ms">
                <h2><a href="{link}"><xsl:value-of select="title" /></a></h2>
                <span class="date"><xsl:value-of select="pubDate" /></span>
                <xsl:if test="description and string-length(description) &gt; 0">
                  <p class="desc"><xsl:value-of select="description" /></p>
                </xsl:if>
                <xsl:if test="category">
                  <div class="tags">
                    <xsl:for-each select="category">
                      <span class="tag"><xsl:value-of select="." /></span>
                    </xsl:for-each>
                  </div>
                </xsl:if>
              </article>
            </xsl:for-each>
          </section>
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
</xsl:stylesheet>
