---
title: "QEXO的注意事项"
slug: "qexo"
date: "2025-11-23T16:00:23.959770+08:00"
fl: "随笔"
tags: ["随笔"]
---

早上我发布了一篇[给静态博客添加一个优雅的在线后端](https://hexo.seln.cn/posts/fd555bb4/)

然后我发现每次更新，修改的以及没有修改的文章全部会更新一遍，后来发现是qexo的问题

之前的文章是每次hexo g之后生成更新时间，到了qexo他不认可hexo g，所以每次都按最新提交时间算

* 解决方法：
  打开qexo的文章页面，手动修改更新时间

<img src="https://youke1.picui.cn/s1/2025/11/23/6922bdcbd7a72.png" alt="1" style="zoom:30%;" />

重新修改一下更新时间即可，qexo只认自己的时间，修改后就固定了
