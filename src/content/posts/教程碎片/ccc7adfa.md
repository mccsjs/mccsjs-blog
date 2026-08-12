---
title: "友链一行显示多个"
slug: "ccc7adfa"
date: "2025-10-12 17:35:33"
fl: "教程碎片"
tags: ["教程碎片"]
zy: "butterfly主题友链魔改"
---

* `请先一步完成`[友链样式魔改](https://mccsjs.eu.org/posts/97eebedd/)
1. volantis样式
在自定义css中添加以下代码
```css
/* 友链一行显示更多 */
.site-card {
  width: calc(100% / 5 - 16px) !important;
  border-radius: 18px !important;
}
.site-card .img {
  height: 165px !important;
  border-radius: 18px !important;
}
/* 适应宽度不同的设备 */
@media screen and (max-width: 1200px) {
  .site-card {
    width: calc(100% / 4 - 16px) !important;
  }
}
@media screen and (max-width: 900px) {
  .site-card {
    width: calc(100% / 3 - 16px) !important;
  }
}
@media screen and (max-width: 600px) {
  .site-card {
    width: calc(100% / 2 - 16px) !important;
  }
}
```
其中，  `width: calc(100% / 5 - 16px) !important;`的5可以更改成更多，宽度按自己喜欢的样式进行修改
2. 博客宽屏适配
在`custom.css`中加入以下样式：
```css
/* 全局宽度 */  
.layout {  
  max-width: 1400px;  
}  
  
/* 侧边卡片栏宽度 */  
.aside-content {  
  max-width: 318px;  
  min-width: 300px;  
}  
  
/* 平板尺寸自适应(不启用侧边栏宽度限制) */  
@media screen and (max-width: 900px) {  
  .aside-content {  
    max-width: none !important;  
    padding: 0 5px 0 5px;  
  }  
}
```
3. 因为以上代码有重复，也可以复制下面的整合版：
```css
/* 友链卡片布局优化 */
.site-card {
  width: calc(100% / 5 - 16px) !important;
  border-radius: 18px !important;
}

.site-card .img {
  height: 165px !important;
  border-radius: 18px !important;
}

/* 响应式布局调整 */
@media screen and (max-width: 1200px) {
  .site-card {
    width: calc(100% / 4 - 16px) !important;
  }
}

@media screen and (max-width: 900px) {
  .site-card {
    width: calc(100% / 3 - 16px) !important;
  }
  
  /* 平板尺寸侧边栏调整 */
  .aside-content {
    max-width: none !important;
    padding: 0 5px;
  }
}

@media screen and (max-width: 600px) {
  .site-card {
    width: calc(100% / 2 - 16px) !important;
  }
}

/* 全局布局设置 */
.layout {
  max-width: 1400px;
}

/* 侧边栏默认样式 */
.aside-content {
  max-width: 318px;
  min-width: 300px;
}
```
4. 有的小伙伴想友链页面不显示侧边栏，可以在主题文件中aside部分增加一项
```yml
aside:

  enable: true

  hide: false

  # Show the button to hide the aside in bottom right button

  button: true

  mobile: true

  # Position: left / right

  position: right

  display:

    archive: true

    tag: true

    category: true

    flink: false # 友链页隐藏侧栏
```
增加flink: false
这样友链页面就不会显示侧边栏了
