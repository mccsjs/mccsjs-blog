const { createSatteriMarkdownProcessor } = require('@astrojs/markdown-satteri');
(async () => {
  const renderer = await createSatteriMarkdownProcessor({
    syntaxHighlight: 'shiki',
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, wrap: true }
  });
  const result = await renderer.render('```go\npackage main\n```');
  console.log(result.code);
})();
