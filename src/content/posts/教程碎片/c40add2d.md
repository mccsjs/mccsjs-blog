---
title: "引入阿里iconfont自定义图标"
slug: "c40add2d"
date: "2025-10-13 16:40:16"
fl: "教程碎片"
tags: ["教程碎片"]
zy: "butterfly引入自定义图标"
---

# 新建图标项目
 1. 访问[阿里巴巴矢量图标库](https://www.iconfont.cn/),注册登录。
 2. 搜索自己想要的图标，然后选择**添加入库**，加到购物车。
 3. 选择完毕后点击右上角的购物车图标，打开侧栏，选择添加到项目，没有项目就新建一个。
 4. 可以通过上方资源管理->我的项目，找到之前添加的图标项目。(现在的iconfont可以在图标库的项目设置里直接打开彩色设置，然后采用fontclass的引用方式即可使用多彩图标。但是**单一项目彩色图标上限是40个图标**，酌情采用。)

 ## 引入图标
 1. 复制你的font class代码和symbol代码并引入到主题文件
<img src="https://www.csjs.eu.org/jc/Pasted%20image%2020251013164721.png" alt="image (1)" style="zoom:60%;" />
 ```yml
 inject:  
  head:  
    - <link rel="stylesheet" href="这里填写font class项" media="defer" onload="this.media='all'">  
  bottom:   
    - <script async src="这里填写sybol项"></script>
```

2. 可以在自定义`CSS`中添加如下样式来控制图标默认大小和颜色等属性（**若已经在项目设置中勾选了彩色选项，则无需再定义图标颜色**）
```css
.iconfont {  
  font-family: "iconfont" !important;  
  /* 这里可以自定义图标大小 */  
  font-size: 3em;  
  font-style: normal;  
  -webkit-font-smoothing: antialiased;  
  -moz-osx-font-smoothing: grayscale;  
}
```

 ## 菜单栏多色动态图标
 **请确保您已经完成了前置教程，并实现了在文章中使用`symbol`写法来引入`iconfont`图标**
 1. 替换`themes\butterfly\layout\includes\header\menu_item.pug`为以下代码，本方案默认使用观感最佳的悬停父元素触发子元素动画效果，默认动画为`faa-tada`。注意：可以把之前的代码注释掉，再在后面加上如下代码，以便于回滚
 ```pug
 if theme.menu

  .menus_items

    each value, label in theme.menu

      if typeof value !== 'object'

        .menus_item

          - const valueArray = value.split('||')

          a.site-page.faa-parent.animated-hover(href=url_for(trim(value.split('||')[0])))

            if valueArray[1]

              i.fa-fw(class=trim(valueArray[1]))

              - var icon_value = trim(value.split('||')[1])

              - var anima_value = value.split('||')[2] ? trim(value.split('||')[2]) : 'faa-tada'

              if icon_value.substring(0,2)=="fa"      

                i.fa-fw(class=icon_value + ' ' + anima_value)

              else if icon_value.substring(0,4)=="icon"          

                svg.icon(aria-hidden="true" class=anima_value)

                  use(xlink:href=`#`+ icon_value)

            span=' '+label

      else

        .menus_item

          - const labelArray = label.split('||')

          - const hideClass = labelArray[3] && trim(labelArray[3]) === 'hide' ? 'hide' : ''

          a.site-page.group.faa-parent.animated-hover(class=`${hideClass}` href='javascript:void(0);')

            if labelArray[1]

              - var icon_label = trim(label.split('||')[1])

              - var anima_label = label.split('||')[2] ? trim(label.split('||')[2]) : 'faa-tada'

              if icon_label.substring(0,2)=="fa"      

                i.fa-fw(class=icon_label + ' ' + anima_label)

              else if icon_label.substring(0,4)=="icon"    

                svg.icon(aria-hidden="true" class=anima_label)

                  use(xlink:href=`#`+ icon_label)

            span=' '+ trim(labelArray[0])

            i.fas.fa-chevron-down

          ul.menus_item_child

            each val,lab in value

              - const valArray = val.split('||')

              li

                a.site-page.child.faa-parent.animated-hover(href=url_for(trim(val.split('||')[0])))

                  if valArray[1]

                    - var icon_val = trim(val.split('||')[1])

                    - var anima_val = val.split('||')[2] ? trim(val.split('||')[2]) : 'faa-tada'

                    if icon_val.substring(0,2)=="fa"      

                      i.fa-fw(class=icon_val + ' ' + anima_val)

                    else if icon_val.substring(0,4)=="icon"

                      svg.icon(aria-hidden="true" class=anima_val)

                        use(xlink:href=`#`+ icon_val)                    

                  span=' '+ lab
 ```

2. 以下是填写示例，在`_config.butterfly.yml`中修改。`icon-xxx`字样的为`iconfont`的`symbol`引入方案的`id`值，可以在你的`iconfont`图标库内查询，其中hide属性也是可以用的。
<img src="https://www.csjs.eu.org/jc/Pasted%20image%2020251013165846.png" alt="image (1)" style="zoom:60%;" />
```yml
menu:  
首页: / || icon-home || faa-tada  
文章 || icon--article || faa-tada || hide:  
归档: /archives/ || icon-guidang1 || faa-tada  
标签: /tags/ || icon-sekuaibiaoqian || faa-tada  
分类: /categories/ || icon-fenlei || faa-tada  
```

3. 这里的动态图标是`svg.icon`的标签，因此上面调节`.iconfont`的css并不适用，需要在`custom.css`里加上一些样式来限制图标的大小和颜色等，具体大小自行调节。
```css
svg.icon {  
  width: 1.28em;  
  height: 1.28em;  
  vertical-align: -0.15em;  
  fill: currentColor;  
  overflow: hidden;  
}
```
修改完在手机上是默认展开二级栏的，可以在后面➕hide:收起，例：
```yml
  文章|| icon-book || faa-tada || hide:
    归档: /archives/ || icon-archive || faa-tada
    标签: /tags/ || icon-tag || faa-tada
    分类: /categories/ || icon-fenlei || faa-tada
```

4. 重启项目即可看到效果：
```bash
hexo cl;hexo g;hexo s
```
