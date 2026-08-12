---
title: "友链样式魔改"
slug: "97eebedd"
date: "2025-10-11 15:23:28"
fl: "教程碎片"
tags: ["教程碎片"]
zy: "更改友链样式，如本站"
---

<blockquote>
魔改前请备份，要不然出错了又不知道怎么改就完啦！！！
请注意，魔改此部分会让markdown语法和标签失效

</blockquote>

## 修改模板文件
打开`"\themes\butterfly\layout\includes\page\flink.pug"`文件，覆盖式写入下面的内容：
```pug
#article-container
  if top_img === false
    h1.page-title= page.title
  
  .flink
    if site.data.link
      each linkGroup in site.data.link
        //- 友链分类标题
        if linkGroup.class_name
          h2!= linkGroup.class_name
        
        //- 友链分类描述
        if linkGroup.class_desc
          .flink-desc!= linkGroup.class_desc
        
        //- 生成随机列表（如果需要）
        - let linkList = linkGroup.link_list.slice()
        if linkGroup.random
          - linkList.sort(() => Math.random() - 0.5)
        
        //- Butterfly 样式
        if linkGroup.flink_style === 'butterfly'
          .butterfly-flink-list
            each item in linkList
              .flink-list-item
                a(
                  href=url_for(item.link)
                  title=item.name
                  target="_blank"
                  rel="noopener"
                )
                  .flink-item-icon
                    +flink-img(item.avatar, item.name, 'flink')
                  .flink-item-info
                    .flink-item-name= item.name
                    .flink-item-desc(title=item.descr)= item.descr
        
        //- Flexcard 样式
        else if linkGroup.flink_style === 'flexcard'
          .flexcard-flink-list
            each item in linkList
              a.flink-list-card(
                href=url_for(item.link)
                target='_blank'
                rel='noopener'
                data-title=item.descr
              )
                .wrapper.cover
                  - const siteshot = item.siteshot ? url_for(item.siteshot) : `https://s0.wp.com/mshots/v1/${item.link}?w=400&h=300`
                  +flink-img(siteshot, '', 'post_page')
                  +flink-img(item.avatar, '', 'post_page')
                .info
                  +flink-img(item.avatar, item.name, 'flink')
                  span.flink-sitename= item.name
        
        //- Volantis 样式
        else if linkGroup.flink_style === 'volantis'
          .volantis-flink-list
            each item in linkList
              a.site-card(
                href=url_for(item.link)
                target='_blank'
                rel='noopener'
              )
                .img
                  - const siteshot = item.siteshot ? url_for(item.siteshot) : `https://s0.wp.com/mshots/v1/${item.link}?w=400&h=300`
                  img.no-lightbox(
                    src=siteshot
                    onerror=imgError('post_page')
                    alt=item.name
                  )
                .info
                  img.no-lightbox(
                    src=url_for(item.avatar)
                    onerror=imgError('flink')
                    alt=item.name
                  )
                  span.title= item.name
                  span.desc(title=item.descr)= item.descr
        
        //- Byer 样式
        else if linkGroup.flink_style === 'byer'
          .byer-flink-list
            each item in linkList
              .flink-list-item
                a(
                  href=url_for(item.link)
                  title=item.name
                  target="_blank"
                  rel="noopener"
                )
                  .flink-item-bar
                    span.flink-item-bar-yellow
                    span.flink-item-bar-green
                    span.flink-item-bar-red
                    span.flink-item-bar-x +
                  .flink-item-content
                    .flink-item-text
                      .flink-item-name= item.name
                      .flink-item-desc(title=item.descr)= item.descr
                    .flink-item-icon
                      img.no-lightbox(
                        src=url_for(item.avatar)
                        onerror=imgError('flink')
                        alt=item.name
                      )
        
        //- Ark 样式
        else if linkGroup.flink_style === 'ark'
          .ark-flink-list
            each item in linkList
              a.ark-flink-list-card(
                href=url_for(item.link)
                target='_blank'
                rel='noopener'
                title=item.descr
              )
                .ark-flink-progress-bar-A
                .ark-flink-progress-bar-B
                .ark-flink-progress-bar-C
                .ark-flink-content
                  .ark-flink-name
                    .flink-sitename= item.name
                    .flink-block
                  .ark-flink-avatar
                    img.no-lightbox(
                      src=url_for(item.avatar)
                      onerror=imgError('flink')
                      alt=item.name
                    )
                  .ark-flink-mask
                    .ark-flink-mask-left
                    .ark-flink-mask-right
                  .ark-flink-descr
                    .ark-flink-descr-text= item.descr
                  .ark-flink-siteshot
                    - const siteshot = item.siteshot ? url_for(item.siteshot) : `https://s0.wp.com/mshots/v1/${item.link}?w=400&h=300`
                    img.no-lightbox(
                      src=siteshot
                      onerror=imgError('post_page')
                      alt=item.name
                    )

    //- 页面内容
    != page.content

//- Mixin: 友链图片处理
mixin flink-img(src, alt, errorType)
  if theme.lazyload.enable
    img.nolazyload(
      data-lazy-src=url_for(src)
      onerror=imgError(errorType)
      alt=alt
    )
  else
    img.nolazyload(
      src=url_for(src)
      onerror=imgError(errorType)
      alt=alt
    )

//- 函数: 图片错误处理
- function imgError(type) { return `this.onerror=null;this.src='${url_for(theme.error_img[type])}'` }
```
注意缩进问题，整个文件全部覆盖

## 修改样式文件
打开`"\themes\butterfly\source\css\_page\flink.styl"`文件，覆盖以下内容：
```styl
.flink-desc
  margin: .2rem 0 .5rem
//bf原生
.butterfly-flink-list
  overflow: auto
  padding: 10px 10px 0
  text-align: center

  & > .flink-list-item
    position: relative
    float: left
    overflow: hidden
    line-height: 17px
    -webkit-transform: translateZ(0)
    height: 100px;
    padding: 10px;
    width: calc(100% / 5 - 0.5rem)
    margin: 0.5rem 0.25rem;
    border-radius: 12px;
    border: var(--style-border);
    -webkit-transition: all .3s ease-in-out;
    -moz-transition: all .3s ease-in-out;
    -o-transition: all .3s ease-in-out;
    -ms-transition: all .3s ease-in-out;
    transition: all .3s ease-in-out;

    +maxWidth1200()
      width: calc(50% - 15px) !important

    +maxWidth600()
      width: calc(100% - 15px) !important

    &:hover
      border-color: #101010 !important;
      background-color: #eeeeee !important;
      box-shadow: #cccccc !important;

      .flink-item-icon
        width: 0;
        height: 0;
        margin-left: -10px;
      

    &:hover:before,
    &:focus:before,
    &:active:before
      transform: scale(1)

    a
      color: var(--font-color)
      text-decoration: none

      .flink-item-icon
        float: left
        overflow: hidden
        margin: 15px 10px
        width: 60px
        height: 60px
        border-radius: 35px
        transition: all .3s ease-out
        margin: 8px 0 8px 0;
        border-radius: 50%;
        overflow: hidden;

        img
          width: 100%
          height: 100%
          transition: filter 375ms ease-in .2s, transform .3s
          object-fit: cover

      .img-alt
        display: none

.flink-item-info
  display: flex;
  flex-wrap: wrap;
  padding-left: 10px;
  text-align: left;
  flex-direction: column;

  .flink-item-name
    @extend .limit-one-line
    padding: 12px 0 16px 0;
    height: auto;
    font-weight: bold
    font-size: 1.2em

  .flink-item-desc
    @extend .limit-one-line
    padding: 0
    height: 35px
    font-size: .93em
    opacity: .7;
    word-break: break-all;
    white-space: break-spaces;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;

.flink-name
  margin-bottom: 5px
  font-weight: bold
  font-size: 1.5em
//flexcard卡片
#article-container img
  margin-bottom: 0.5rem;
  object-fit: cover;
  max-height: 900px;
.flexcard-flink-list
  overflow hidden
  .flink-list-card
    .wrapper img
      transition: transform .5s ease-out !important;

  & > a
    width: calc(100% / 5 - 0.5rem);
    height 150px
    position relative
    display block
    margin: 0.5rem 0.25rem;
    float left
    overflow hidden
    padding: 0;
    border-radius: 8px;
    transition all .3s ease 0s, transform .6s cubic-bezier(.6, .2, .1, 1) 0s
    box-shadow none
    border: var(--style-border)!important;
    &:hover
      .info
        transform translateY(-100%)
      .wrapper
        img
          transform scale(1.2)
      &::before
        position: fixed
        width:inherit
        margin:auto
        left:0
        right:0
        top:10%
        border-radius: 10px
        text-align: center
        z-index: 100
        content: attr(data-title)
        font-size: 20px
        color: #fff
        padding: 10px
        background-color: rgba($theme-color,0.8)

    .cover
      width 100%
      transition transform .5s ease-out
    .wrapper
      position relative
      .fadeIn
        animation coverIn .8s ease-out forwards
      img
        height 150px
        pointer-events none
    .info
      display flex
      flex-direction column
      justify-content center
      align-items center
      width 100%
      height 100%
      overflow hidden
      border-radius 3px
      background-color hsla(0, 0%, 100%, .7)
      transition transform .5s cubic-bezier(.6, .2, .1, 1) 0s
      img
        position relative
        top 45px
        width 80px
        height 80px
        border-radius 50%
        box-shadow 0 0 10px rgba(0, 0, 0, .3)
        z-index 1
        text-align center
        pointer-events none
      span
        padding 20px 10% 60px 10%
        font-size 16px
        width 100%
        text-align center
        box-shadow 0 0 10px rgba(0, 0, 0, .3)
        background-color hsla(0, 0%, 100%, .7)
        color var(--font-color)
        white-space nowrap
        overflow hidden
        text-overflow ellipsis
.flexcard-flink-list>a .info,
.flexcard-flink-list>a .wrapper .cover
  position absolute
  top 0
  left 0

@media screen and (max-width:1024px)
  .flexcard-flink-list
    & > a
      width calc(33.33333% - 15px)

@media screen and (max-width:600px)
  .flexcard-flink-list
    & > a
      width calc(50% - 15px)

[data-theme=dark]
  .flexcard-flink-list a .info,
  .flexcard-flink-list a .info span
    background-color rgba(0, 0, 0, .6)
  .flexcard-flink-list
    & > a
      &:hover
        &:before
          background-color: rgba(#121212,0.8);
.justified-gallery > div > img,
.justified-gallery > figure > img,
.justified-gallery > a > a > img,
.justified-gallery > div > a > img,
.justified-gallery > figure > a > img,
.justified-gallery > a > svg,
.justified-gallery > div > svg,
.justified-gallery > figure > svg,
.justified-gallery > a > a > svg,
.justified-gallery > div > a > svg,
.justified-gallery > figure > a > svg
  position static!important


trans($time = 0.28s)
  transition: all $time ease
  -moz-transition: all $time ease
  -webkit-transition: all $time ease
  -o-transition: all $time ease

//volantis卡片，我的最爱
.volantis-flink-list
  display: flex
  flex-wrap: wrap
  justify-content: flex-start
  margin: -0.5 * 16px
  align-items: stretch
.site-card
  margin: 16px * 0.5
  width: "calc(100% / 4 - %s)" % 16px
  @media screen and (min-width: 2048px)
      width: "calc(100% / 5 - %s)" % 16px
  @media screen and (max-width: 768px)
      width: "calc(100% / 3 - %s)" % 16px
  @media screen and (max-width: 500px)
      width: "calc(100% / 2 - %s)" % 16px
  display: block
  line-height: 1.4
  height 100%
  .img
    width: 100%
    height 150px
    @media screen and (max-width: 500px)
      height 100px
    overflow: hidden
    border-radius: 12px * 0.5
    box-shadow: 0 1px 2px 0px rgba(0, 0, 0, 0.2)
    background: #f6f6f6
    img
      width: 100%
      height 100%
      pointer-events:none;
      // trans(.75s)
      transition: transform 2s ease
      object-fit: cover

  .info
    margin-top: 16px * 0.5
    img
      width: 32px
      height: 32px
      pointer-events:none;
      border-radius: 16px
      float: left
      margin-right: 8px
      margin-top: 2px
    span
      display: block
    .title
      font-weight: 600
      font-size: var(--global-font-size)
      color: #444
      display: -webkit-box
      -webkit-box-orient: vertical
      overflow: hidden
      -webkit-line-clamp: 1
      trans()
    .desc
      font-size: var(--global-font-size)
      word-wrap: break-word;
      line-height: 1.2
      color: #888
      display: -webkit-box
      -webkit-box-orient: vertical
      overflow: hidden
      -webkit-line-clamp: 2
  .img
    trans()
  &:hover
    .img
      box-shadow: 0 4px 8px 0px rgba(0, 0, 0, 0.1), 0 2px 4px 0px rgba(0, 0, 0, 0.1), 0 4px 8px 0px rgba(0, 0, 0, 0.1), 0 8px 16px 0px rgba(0, 0, 0, 0.1)
    .info .title
      color: #ff5722
//byer卡片
#article-container
  .flink
    margin-bottom: 20px

    .byer-flink-list
      overflow: auto
      padding: 10px 10px 0
      text-align: center

      & > .flink-list-item
        position: relative
        background: #ffffff
        float: left
        overflow: hidden
        margin: 15px 7px
        width: calc(100% / 3 - 15px)
        height: 120px
        border-radius: 2px
        line-height: 17px
        -webkit-transform: translateZ(0)
        border: 1px solid
        box-shadow: 3px 3px 1px 1px #fee34c;

        +maxWidth1024()
          width: calc(50% - 15px) !important

        +maxWidth600()
          width: calc(100% - 15px) !important

        a
          color: var(--font-color)
          text-decoration: none
          .flink-item-bar
            height: 15px
            border-width: 0 0 1px 0
            border-style: none none solid none
            background: #fde135
            display: flex;
            align-items: center;
            flex-direction: row;
            flex-wrap: nowrap;
            padding: 0 3px 0 3px
            sapn
              width: 10px;
              height: 10px;
              margin: 0 1px 0 1px
              border-radius: 50%;
              display: block;
              border: 1px solid;
              display: flex;
              align-items: center;
              justify-content: flex-start;
              &.flink-item-bar-yellow
                background: #fde135
              &.flink-item-bar-green
                background: #249a33
              &.flink-item-bar-red
                background: #f13b06
              &.flink-item-bar-x
                background: transparent
                border: 0px
                margin-left: auto
                transform: rotate(45deg);
                font-size: 23px;
                padding: 0px 0px 6px 0px;
          .flink-item-content
            display: flex;
            height: 105px
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 0 5px 0 5px;
            .flink-item-text
              width: 60%;
              display: flex;
              flex-direction: column;
              align-items: center;
              .flink-item-name
                @extend .limit-one-line
                max-width: 100%;
                padding: 0px 5px 0px 5px;
                margin: 0px 0 6px 0;
                height: 50%;
                font-weight: bold;
                font-size: 1.43em;
                border-width: 0 0 7px 0;
                border-style: solid;
                border-color: #fbf19f;
              .flink-item-desc
                @extend .limit-one-line
                max-width: 100%;
                height: 50%;
                padding: 5px 5px 5px 5px;
                font-size: 0.93em;
                position: relative
                &:before
                  content: "";
                  background: transparent;
                  display: block;
                  height: calc(100% - 4px);
                  width: calc(100% - 4px);
                  position: absolute;
                  left: 0;
                  top: 0;
                  border-radius: 2px;
                  border: 1px solid;
                  clip-path: polygon(0 0, 100% 0, 100% 100%, 95% 100%, 95% 50%, 90% 50%, 90% 100%, 0 100%);


            .flink-item-icon
              overflow: hidden;
              margin: 0px 5px;
              width: 70px;
              height: 70px;
              border: 1px solid;
              border-radius: 2px;
              transition: width .3s ease-out
              box-shadow: 2px 2px 1px 1px #fee34c;
              img
                width: 50px;
                height: 50px;
                margin: 9px 9px;
                transition: filter 375ms ease-in .2s, transform .3s
                object-fit: cover

              .img-alt
                display: none
//byer卡片暗夜模式改造
[data-theme=dark]
  #article-container
    .flink
      .byer-flink-list
        & > .flink-list-item
          background: rgb(40,40,40)
          box-shadow: 3px 3px 1px 1px #1B5A70;
          a
            .flink-item-bar
              background: #1B5A70;
            .flink-item-content
              .flink-item-text
                .flink-item-name
                  border-color: #5EBAD9;
              .flink-item-icon
                box-shadow: 2px 2px 1px 1px #1B5A70;
              
          

//下面是aki及其自定义配色:
:root
  --ark-flink-default-color: rgba(153, 54, 44,0.8) /*主色调*/
  --ark-flink-mask: #818181  /*遮罩层配色*/
  --ark-flink-progress-default: rgba(227, 236, 238, 0.8) /*能量条默认配色*/
  --ark-flink-progress-charge: #d97f17 /*能量条充能配色*/
  --flink-name-border-color: #d97f17 /*ID边框配色*/

[data-theme="dark"]
  --ark-flink-default-color: rgba(55, 112, 143,0.8)
  --ark-flink-mask: #37708f
  --ark-flink-progress-default: rgba(46, 160, 221, 0.8)
  --ark-flink-progress-charge: rgba(227, 236, 238, 0.8)
  --flink-name-border-color: rgba(227, 236, 238, 0.8)


//适配ark方舟友链卡片
#article-container
  .flink
    margin-bottom: 20px

    .ark-flink-list
      overflow: auto
      padding: 10px 10px 0
      text-align: center

      & > .ark-flink-list-card
        position: relative
        display: block
        color: var(--font-color)
        text-decoration: none
        float: left
        overflow: hidden
        margin: 15px 7px
        width: calc(100% / 3 - 15px)
        height: 220px
        border-radius: 2px
        line-height: 17px
        -webkit-transform: translateZ(0)

        +maxWidth1024()
          width: calc(50% - 15px) !important

        +maxWidth600()
          width: calc(100% - 15px) !important
        

      a.ark-flink-list-card
        *
          transition: all 0.3s cubic-bezier(.6, 0, .5, 1)
        &:hover
          *
            transition: all 0.3s cubic-bezier(.6, 0, .5, 1)
          .ark-flink-progress-bar-A,
          .ark-flink-progress-bar-B,
          .ark-flink-progress-bar-C
            background: var(--ark-flink-progress-charge)
          .ark-flink-content
            .ark-flink-name
              bottom: 0px;
            .ark-flink-avatar
              transform: rotateX(90deg)
            .ark-flink-mask
              .ark-flink-mask-left
                transition-delay: 0.3s;
                left: -35%;
              .ark-flink-mask-right
                transition-delay: 0.3s;
                right: -55%;
            .ark-flink-descr
              .ark-flink-descr-text
                transition-delay: 0.3s;
                opacity: 1
                animation: ark-flink-type 1.5s steps(20, end) 0.3s,ark-flink-blink .75s step-end infinite; /* 定义光标的闪烁动画 */  
        .ark-flink-progress-bar-A,
        .ark-flink-progress-bar-B,
        .ark-flink-progress-bar-C
          display: block
          position: absolute;
          background: var(--ark-flink-progress-default)
          z-index 6
        .ark-flink-progress-bar-A
          height: 8px;
          width: 100px;
          top: 3px;
          left: 6px;
          clip-path: polygon(0% 100%, 8% 0%, 28% 0%, 20% 100%, 23% 100%, 31% 0%, 46% 0%, 38% 100%, 41% 100%, 49% 0%, 64% 0%, 56% 100%, 59% 100%, 67% 0%, 82% 0%, 74% 100%, 77% 100%, 85% 0%, 100% 0%, 90% 100%);
        .ark-flink-progress-bar-B
          height: 8px;
          width: 35px;
          bottom: 35px;
          left: 0;
          clip-path: polygon(0% 0%, 40% 0%, 15% 100%, 25% 100%, 50% 0%, 85% 0%, 60% 100%, 70% 100%, 90% 0%, 100% 100%, 15% 100%);
        .ark-flink-progress-bar-C
          height: 100px
          width: 8px
          bottom: 50px
          right: 0
          clip-path: polygon( 0% 0%, 100% 8%, 100% 28%, 0% 20%, 0% 23%, 100% 31%,100% 46% ,0% 38% ,0% 41% ,100% 49% ,100% 64% ,0% 56% ,0% 59% ,100% 67% ,100% 82% ,0% 74% , 0% 77%,100% 85% , 100% 100%,0% 90% );
        .ark-flink-content
          display: block
          position: absolute
          background: radial-gradient(var(--ark-flink-default-color),transparent)
          width: calc(100% - 10px)
          height: 100%
          top: 0
          left: 0
          clip-path: polygon(0 15px, 100px 15px, 115px 0, calc(100% - 45px) 0, calc(100% - 15px) 45px, 100% 45px, 100% calc(100% - 25px), calc(100% - 30px) calc(100% - 25px), calc(100% - 55px) calc(100% - 10px), calc(100% - 90px) calc(100% - 10px), calc(100% - 100px) 100%, 100px 100%, 90px calc(100% - 10px), 55px calc(100% - 10px), 35px calc(100% - 45px), 0% calc(100% - 45px));
          .ark-flink-avatar,
          .ark-flink-mask,
          .ark-flink-descr,
          .ark-flink-siteshot
            position: absolute
            width: 100%
            height: 100%
            top: 0
            left: 0
          .ark-flink-name
            display: block;
            position: absolute;
            z-index: 5;
            bottom: 10px;
            left: 20%;
            color: white;
            text-shadow: 1px 1px 5px black;
            background: transparent;
            height: 40px;
            width: 60%;
            border-style: double;
            border-width: 5px 5px 0 5px;
            border-color: var(--flink-name-border-color);
            transform: perspective(0.5em) rotateX(3deg);
            .flink-sitename
              transform: perspective(0.5em) rotateX(-3deg);
              font-size: 15px;
              margin: 5px 0 0 0;
            .flink-block
              transform: perspective(0.5em) rotateX(-10deg);
              display: block;
              width: 60%;
              height: 13px;
              background: var(--flink-name-border-color);
              position: absolute;
              bottom: 0px;
              left: 20%;
          .ark-flink-avatar
            z-index 4
            display: flex
            align-items: center;
            justify-content: center;
            transform: rotateX(0deg)
            img
              width: 100px;
              height: 100px;
              margin: 0 auto 20px;
              object-fit: cover
              clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
            .img-alt
              display: none
          .ark-flink-mask
            z-index 3
            .ark-flink-mask-left
              width: 100%;
              height: 100%;
              background: repeating-linear-gradient(0deg, var(--ark-flink-mask),transparent 1px);
              clip-path: polygon(50% 0, 50% calc(50% - 60px), calc(50% - 20px) calc(50% - 60px), calc(50% - 50px) calc(50% - 30px), calc(50% - 50px) calc(50% + 10px), calc(50% - 20px) calc(50% + 40px), 50% calc(50% + 40px), 50% 100%, 0% 100%, 0% 0%);
              left: 0%;
              position: absolute;
            .ark-flink-mask-right
              background: repeating-linear-gradient(0deg, var(--ark-flink-mask),transparent 1px);
              width: 100%;
              height: 100%;
              clip-path: polygon(100% 0%, 50% 0%, 50% calc(50% - 60px), calc(50% - 20px) calc(50% - 60px), calc(50% - 50px) calc(50% - 30px), calc(50% - 50px) calc(50% + 10px), calc(50% - 20px) calc(50% + 40px), 50% calc(50% + 40px), 50% 100%, 100% 100%);
              right: 0%;
              position: absolute;
          
          .ark-flink-descr
            z-index 2
            display: flex
            align-items: center;
            justify-content: center;
            .ark-flink-descr-text
              color: white;
              text-shadow: 1px 1px 5px black;
              font-size: 1.5em;
              height: 1.5em;
              line-height: 1.5em;
              overflow: hidden; /* 隐藏超出容器的文本 */
              border-right: .15em solid orange; /* 打字效果的光标动画 */
              white-space: nowrap; /* 确保文本在一行内显示，不换行 */
              margin: 20px;
              opacity: 0
          .ark-flink-siteshot
            z-index 1
            display: flex
            align-items: center;
            justify-content: center;
            img
              height: 75%;
              width: 100%;
              margin: 0 auto 20px;
              object-fit: cover;

/* 定义打字机动画 */
@keyframes ark-flink-type
  from
    width: 0;
  to
    width: 100%;


/* 定义光标闪烁动画 */
@keyframes ark-flink-blink
  from,
  to
    border-color: transparent;
  50%
    border-color: orange
```
## 修改友链数据文件
打开`"\source\_data\link.yml"`按照下方格式写入文件：
```yml
- class_name: 1.技术支持
  class_desc: 由以下人员提供技术支持
  flink_style: volantis # 可选择样式
  link_list:
    - name: mccsjs
      link: https://hexo.seln.cn/
      avatar: https://s2.loli.net/2023/02/04/47DVRIgbGyQwcO9.jpg
      descr: 第一是我自己！！！
      siteshot: https://hexo.seln.cn/img/a.jpg
```
下面是选项的用途及可选项：

| 一级属性        | 二级属性     | butterfly | volantis | flexcard | byer | ark | 解释    |
| ----------- | -------- | --------- | -------- | -------- | ---- | --- | ----- |
| class_name  | *        | ✅         | ✅        | ✅        | ✅    | ✅   | 每类提示词 |
| flink_style | *        | ✅         | ✅        | ✅        | ✅    | ✅   | 卡片样式  |
| *           | name     | ✅         | ✅        | ✅        | ✅    | ✅   | 卡片名称  |
| *           | link     | ✅         | ✅        | ✅        | ✅    | ✅   | 卡片链接  |
| link_list   | avatar   | ✅         | ✅        | ✅        | ✅    | ✅   | 卡片头像  |
| *           | descr    | ✅         | ✅        | ✅        | ✅    | ✅   | 卡片描述  |
| *           | siteshot | ❌         | (✅)      | (✅)      | ❌    | (✅) | 网站截图  |

* ❌：不支持选项
* ✅：支持项，不可省略
* (✅)：可选选项，可以省略，比如siteshot，可以根据网站信息采用api截图生成，api如下：'https://s0.wp.com/mshots/v1/' + 你的域名 + '?w=400&h=300'

各友链样式预览：


<!-- tab butterfly -->
![butterfly](https://csjs.eu.org/img/6616178b03ebf.png)
<!-- endtab -->

<!-- tab 本站在用：volantis -->
![volantis](https://csjs.eu.org/img/66161742d0252.png)
<!-- endtab -->

<!-- tab flexcard -->
![flexcard](https://csjs.eu.org/img/661617ad47e5a.png)
<!-- endtab -->

<!-- tab byer -->
![byer](https://csjs.eu.org/img/661617cfd8839.png)
<!-- endtab -->

<!-- tab ark店长 -->
![ark](https://csjs.eu.org/img/661617ffb988b.png)
<!-- endtab -->


接下来三连看看成果
```bash
hexo cl;hexo g;hexo s
```
