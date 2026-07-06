:::note info 🤣🤣
本站实际支持的 Markdown 语法，按现有 markdown-it 配置整理，供复制用。
:::endnote

---

# 1. 基础语法

## 1.1 多级标题

```markdown
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

---

## 1.2 文字样式

```markdown
**粗体文字**
*斜体文字*
~~删除线~~
```

---

## 1.3 代码

```markdown
`const x = 1`

​```javascript
function hello(name) {
  console.log(`Hello, ${name}!`);
}
​```
```

---

## 1.4 列表

```markdown
- Java
- Python
- Go

1. 第一步
2. 第二步
3. 第三步

- [x] 已完成任务
- [ ] 未完成任务
```

---

## 1.5 引用

```markdown
> 一级引用内容
> > 二级引用内容
> > **引用内也支持所有 Markdown 语法**
> 回到一级
```

---

## 1.6 链接与图片

```markdown
[普通链接](https://github.com)
[带标题的链接](https://github.com "GitHub 首页")

![替代文本](https://placehold.co/600x200/3b82f6/white?text=示例图片)
```

---

## 1.7 表格

```markdown
| 语言   | 用途     | 难度 |
| ------ | -------- | ---- |
| Go     | 后端开发 | 中等 |
| Vue    | 前端框架 | 简单 |
| Python | AI/数据  | 简单 |
```

---

# 2. 本站渲染配置说明

本站正文使用 **markdown-it** 渲染，配置如下：

- `html: true`：允许 HTML 片段
- `linkify: true`：自动识别裸链接
- `typographer: true`：启用排版优化
- `breaks: true`：换行转 `<br>`

---

# 3. 可直接复制的内容区

## 3.1 基础示例

**粗体**、*斜体*、~~删除线~~

`行内代码`

- 列表 A
- 列表 B

1. 步骤一
2. 步骤二

> 这是一段引用。

[示例链接](https://example.com)

![示例图片](https://placehold.co/600x200/3b82f6/white?text=示例图片)

---

## 3.2 代码示例

​```javascript
function hello(name) {
  console.log(`Hello, ${name}!`);
}
​```

---

## 3.3 表格示例

| 语言   | 用途     | 难度 |
| ------ | -------- | ---- |
| Go     | 后端开发 | 中等 |
| Vue    | 前端框架 | 简单 |
| Python | AI/数据  | 简单 |

---

## 3.4 HTML 示例

由于开启了 `html: true`，这里可以直接写 HTML：

<details>
  <summary>点击展开</summary>
  <p>这是一段隐藏内容。</p>
</details>

---

## 3.5 换行与裸链接示例

这是第一行  
这是第二行，因为开启了 breaks，所以会换行。

https://github.com 会被自动转成链接。
