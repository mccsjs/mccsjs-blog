---
title: "hexo博客添加安全跳转页面"
slug: "dff715bb"
date: "2025-10-28 15:56:44"
fl: "教程碎片"
tags: ["教程碎片"]
---

## 样式预览
<details><summary>blue</summary>


<img src="https://youke1.picui.cn/s1/2025/10/28/690079ab8a713.png" alt="1" style="zoom:40%;" />


</details>

## 安装插件
 **安装依赖 `cheerio`**和**`hexo-safego` 插件**
```bash
npm install cheerio --save
```

```bash
npm install hexo-safego --save
```

## 配置
在`hexo`根目录的`_config.yml`文件中添加以下配置：
```yml
hexo_safego:
  # --- 基本功能设置 ---
  general:
    enable: true                      # 【必填】插件总开关
    enable_base64_encode: true      # 【推荐】是否对链接进行Base64编码，让URL更干净，也能轻微防止爬虫
    enable_target_blank: true       # 【推荐】是否在新标签页中打开外链

  # --- 安全与路径设置 ---
  security:
    url_param_name: 'u'               # URL中的参数名, 例如 /go.html?u=...
    html_file_name: 'go.html'         # 跳转页面的文件名，可自定义
    ignore_attrs:                     # 忽略带有这些属性的链接，例如相册的链接
      - 'data-fancybox'

  # --- 生效范围设置 ---
  scope:
    apply_containers:                 # 指定插件在哪些HTML容器内生效
      - '#article-container'          # 默认为文章内容区，您可以添加其他选择器，如 '#aside-content'
    # apply_pages:                      # 【可选】只在特定路径下的页面生效，例如 ['/posts/']
    # exclude_pages:                    # 【可选】在哪些页面完全禁用此插件

  # --- 域名白名单 ---
  whitelist:
    domain_whitelist:                 # 【重要】白名单内的域名不会被跳转，请务必加入您自己的所有域名
      - "hexo.seln.cn"                 # <--- 请替换为您自己的主域名
      - "syys.eu.org"             # <--- 您绑定的Waline/Twikoo域名

  # --- 跳转页面外观设置 ---
  appearance:
    avatar: '/img/head.jpg'   # 【可选】跳转页面上显示的头像
    title: "mccsjs"             # 【可选】跳转页面大标题
    subtitle: "安全中心"              # 【可选】跳转页面副标题
    darkmode: true                    # 【可选】是否为跳转页启用深色模式
    countdowntime: 4               # 【可选】自动跳转的倒计时秒数，设置为 -1 则不自动跳转，需要用户手动点击
  
  # --- 调试设置 ---
  debug:
    enable: false   
```

## 结尾
接下来hexo三连即可，不过插件默认的黑白天模式有点问题，我直接把黑夜删了，你们也可以用我的
打开`\node_modules\hexo-safego\go.html`，替换为以下代码
```html
<!DOCTYPE html><html lang="zh"><head><meta http-equiv="X-UA-Compatible"content="IE=edge"><meta name="viewport"content="width=device-width,initial-scale=1,user-scalable=no"><!--添加一个网站图标--><link rel="icon"href="{{avatar}}"type="image/x-icon"><meta http-equiv="Content-Type"content="text/html; charset=UTF-8"><meta name="robots"content="noindex, nofollow"/><title>😃页面加载中，请稍候...</title><style type="text/css">body{overflow:hidden;height:100vh;width:100vw;margin:0;padding:0;background:linear-gradient(135deg,#E9E9E9,#FFFFFF)}.container{display:flex;align-items:center;justify-content:center;height:100%;width:100%;margin:0;flex-direction:column}.avatar-placeholder,.avatar{width:100px;height:100px;border-radius:50%;margin-bottom:15px;display:block}.avatar{display:none}.description{font-size:20px;font-weight:600}.subtitle{font-size:15px;margin-bottom:20px;color:#C4C4C4}.loading{text-align:center;padding:30px;border-radius:25px;animation:fadein 2s;width:450px;max-width:80%;transition:all 0.3s ease-in-out;border:1px solid#ccc;background:rgba(255,255,255,0.7);box-shadow:0 16px 32px rgba(0,0,0,0.1)}.loading:hover{box-shadow:0 16px 32px rgba(0,0,0,0.2)}@keyframes fadein{from{opacity:0}to{opacity:1}}.content{margin-bottom:20px}.url-text{margin-bottom:10px;font-size:16px;letter-spacing:1px;color:#333}.jump-url{position:relative;font-size:20px;display:block;margin-top:5px;margin-bottom:25px;padding:15px;border-radius:18px;height:25px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid#ccc;background-color:#F7F9FE;color:#333}.copy-btn-container{position:absolute;display:flex;align-items:center;right:10px;top:50%;transform:translateY(-50%);height:100%;width:63px;flex-direction:row-reverse;background:linear-gradient(to left,#F7F9FE 75%,transparent 100%)}.copy-btn{width:40px;height:40px;border-radius:12px;border:1px solid#a4a4a4;transition:all 0.3s ease-in-out;background-color:#F7F9FE}.copy-btn:hover{box-shadow:0 16px 32px rgba(100,100,100,0.2)}.copy-btn-container svg{width:25px;height:25px;fill:#888}.countdown-text{margin-top:12px;font-size:12px;color:#515151}.button-container{display:flex;justify-content:center;gap:20%;margin-top:20px}.button{padding:10px 20px;border-radius:16px;border:none;cursor:pointer;font-size:16px;width:120px;height:40px}.cancel-button{background-color:#a6e3e9;color:black}.confirm-button{background-color:#3fc1c9;color:white}.progress-bar{width:100%;border-radius:5px;overflow:hidden;height:10px;margin-top:20px}.progress{width:100%;height:100%;transition:width 1s;background-color:#abedd8}</style><script type="text/javascript">const host=window.location.host;function GetQueryString(name){var reg=new RegExp("(^|&)"+name+"=([^&]*)(&|$)","i");var r=window.location.search.substr(1).match(reg);return r?decodeURI(r[2]):null}function decodeSafeUrlParam(paramStr){const base64=paramStr.replace(/-/g,'+').replace(/_/g,'/');const decoded=decodeURIComponent(atob(base64).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));return decoded}let countdown={{countdown}};let jump_url=GetQueryString('{{url_param_name}}');jump_url=decodeSafeUrlParam(jump_url);const UrlReg='^((http|https|thunder|qqdl|ed2k|Flashget|qbrowser|ftp|rtsp|mms)://)';if(!jump_url||!jump_url.match(UrlReg)){document.title='参数错误，正在返回首页...';jump_url=location.origin}let progressElement;let countdownElement;let countdownTextElement;let jumpUrlElement;function updateCountdown(){if(countdown<0){countdownTextElement.textContent="💡自行点击跳转，请注意您的账号和财产安全";return}countdownElement.textContent=countdown;progressElement.style.width=(countdown/{{countdown}}*100)+'%';if(countdown===0){jump()}else{countdown--;setTimeout(updateCountdown,1000)}}function jump(){location.href=jump_url}function closeWindow(){function isWeChat(){return/MicroMessenger/i.test(navigator.userAgent)}function isQQ(){return/QQ/i.test(navigator.userAgent)&&!/MicroMessenger/i.test(navigator.userAgent)}if(isWeChat()){if(typeof WeixinJSBridge!=="undefined"){WeixinJSBridge.call('closeWindow')}else{document.addEventListener('WeixinJSBridgeReady',function(){WeixinJSBridge.call('closeWindow')},false)}}else if(isQQ()){if(typeof mqq!=="undefined"&&mqq.ui&&mqq.ui.closeWebView){mqq.ui.closeWebView()}else{window.history.back()}}else{window.opener=null;window.open('','_self');window.close()}}function copyToClipboard(){const urlText=document.getElementById('jump-url-text').textContent;const tempInput=document.createElement('input');tempInput.value=urlText;document.body.appendChild(tempInput);tempInput.select();document.execCommand('copy');document.body.removeChild(tempInput);alert('链接已复制到剪贴板！')}async function loadAvatar(){const avatarImg=document.querySelector('.avatar');const placeholder=document.querySelector('.avatar-placeholder');const img=new Image();img.src='{{avatar}}';img.onload=function(){avatarImg.src=img.src;avatarImg.style.display='block';placeholder.style.display='none'}}window.addEventListener('load',function(){loadAvatar();progressElement=document.getElementById('progress');countdownElement=document.getElementById('countdown');countdownTextElement=document.querySelector('.countdown-text');jumpUrlElement=document.getElementById('jump-url-text');jumpUrlElement.textContent=jump_url;updateCountdown()});</script></head><body><div class="container"><div class="avatar-placeholder"></div><img src=""alt="头像"class="avatar"><div class="description">{{title}}</div><div class="subtitle">{{subtitle}}</div><div class="loading"><div class="content"><div class="url-text">您即将离开本站，跳转到：</div><div class="jump-url"id="jump-url"><span id="jump-url-text"></span><div class="copy-btn-container"><button class="copy-btn"onclick="copyToClipboard()"><svg xmlns="http://www.w3.org/2000/svg"viewBox="0 0 448 512"><path d="M208 0L332.1 0c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9L448 336c0 26.5-21.5 48-48 48l-192 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48zM48 128l80 0 0 64-64 0 0 256 192 0 0-32 64 0 0 48c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 176c0-26.5 21.5-48 48-48z"/></svg></button></div></div></div><div class="countdown-text">⚡将在<span id="countdown"></span>秒后跳转，请自行确认链接安全性</div><div class="progress-bar"><div class="progress"id="progress"></div></div><div class="button-container"><button class="button cancel-button"onclick="closeWindow()">取消跳转</button><button class="button confirm-button"onclick="jump()">立即跳转</button></div></div></div></body></html>
```
然后
```bash
hexo cl;hexo g;hexo d
```
