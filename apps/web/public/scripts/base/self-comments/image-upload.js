// ===== 评论区图片上传（按钮点击 + 拖拽） =====
// 上传到图床公开接口 /api/imgbed/public-upload，成功后插入 ![name](url)

var _uploading = false

function scGetApiUrl(root) {
  return (root && root.getAttribute('data-api-url')) || ''
}

function scInsertImage(textarea, url, name) {
  if (!textarea || !url) return
  var pos = textarea.selectionEnd || 0
  var val = textarea.value
  // 用文件名作为 alt text，去掉扩展名
  var alt = name ? name.replace(/\.[^.]+$/, '') : 'image'
  var insert = '![' + alt + '](' + url + ') '
  textarea.value = val.slice(0, pos) + insert + val.slice(pos)
  var np = pos + insert.length
  try { textarea.focus(); textarea.setSelectionRange(np, np); } catch (e) {}
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

export function scInitImageUpload(form) {
  if (!form || form.dataset.imgUploadReady === '1') return
  form.dataset.imgUploadReady = '1'

  var root = form.closest('#self-comments')
  if (!root) return

  var apiUrl = scGetApiUrl(root)
  var btn = form.querySelector('.sc-img-btn')
  var input = form.querySelector('.sc-img-input')
  var textarea = form.querySelector('textarea')
  var tip = form.querySelector('.sc-tip')

  if (!btn || !input || !textarea) return

  // 初始化图标为 iconify（与 emoji 按钮一致，避免 swup 复用问题）
  btn.innerHTML = '<iconify-icon icon="line-md:image" width="19" height="19"></iconify-icon>'

  function uploadFile(file) {
    if (_uploading) return
    if (!file || !file.type.startsWith('image/')) return

    // 前端预校验：3MB 以内
    if (file.size > 3 * 1024 * 1024) {
      if (tip) { tip.textContent = '图片不能超过 3MB'; tip.className = 'sc-tip sc-tip-error'; }
      return
    }

    _uploading = true
    if (tip) { tip.textContent = '上传中…'; tip.className = 'sc-tip'; }
    btn.disabled = true
    btn.style.opacity = '0.5'

    var fd = new FormData()
    fd.append('file', file)

    fetch(apiUrl + '/api/imgbed/public-upload', { method: 'POST', body: fd })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error((d && d.error) || ('HTTP ' + r.status)); })
        return r.json()
      })
      .then(function (data) {
        var url = data && data.url
        if (!url) throw new Error('未返回图片地址')
        scInsertImage(textarea, url, file.name)
        if (tip) { tip.textContent = '图片插入成功'; tip.className = 'sc-tip sc-tip-ok'; }
        setTimeout(function () { if (tip) { tip.textContent = ''; tip.className = 'sc-tip'; } }, 2000)
      })
      .catch(function (err) {
        if (tip) { tip.textContent = ((err && err.message) || '上传失败'); tip.className = 'sc-tip sc-tip-error'; }
      })
      .finally(function () {
        _uploading = false
        btn.disabled = false
        btn.style.opacity = ''
      })
  }

  // 按钮点击 → 触发隐藏的 file input
  btn.addEventListener('click', function (e) {
    e.preventDefault()
    input.click()
  })

  // 文件选择回调
  input.addEventListener('change', function () {
    var file = input.files && input.files[0]
    if (file) { uploadFile(file); input.value = '' } // 重置以允许重复选同一文件
  })

  // 拖拽上传到 textarea
  textarea.addEventListener('dragover', function (e) {
    e.preventDefault()
    e.stopPropagation()
    textarea.classList.add('sc-dragover')
  })

  textarea.addEventListener('dragleave', function (e) {
    e.preventDefault()
    e.stopPropagation()
    textarea.classList.remove('sc-dragover')
  })

  textarea.addEventListener('drop', function (e) {
    e.preventDefault()
    e.stopPropagation()
    textarea.classList.remove('sc-dragover')
    var dt = e.dataTransfer
    var files = dt && dt.files
    if (files && files.length) {
      // 只取第一个图片文件
      for (var i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) { uploadFile(files[i]); break }
      }
    }
  })

  // 粘贴图片（Ctrl+V 粘贴剪贴板中的图片）
  textarea.addEventListener('paste', function (e) {
    var cb = e.clipboardData
    var items = cb && cb.items
    if (!items) return
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        var file = items[i].getAsFile()
        if (file) { e.preventDefault(); uploadFile(file); break }
      }
    }
  })
}
