import type Quill from 'quill'

export default class ImageBar {
  quill: Quill
  image: HTMLImageElement
  domNode: HTMLElement
  template: string

  constructor(quill, target) {
    this.quill = quill
    this.image = target

    this.template = [
      // `<a class="ql-image-preview"><i class="icon-preview"></i></a>`,
      `<a class="ql-image-download"><i class="icon-download"></i></a>`,
      `<a class="ql-image-copy">
          <svg width="16" height="16" t="1736062378465" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1630"><path d="M394.666667 106.666667h448a74.666667 74.666667 0 0 1 74.666666 74.666666v448a74.666667 74.666667 0 0 1-74.666666 74.666667H394.666667a74.666667 74.666667 0 0 1-74.666667-74.666667V181.333333a74.666667 74.666667 0 0 1 74.666667-74.666666z m0 64a10.666667 10.666667 0 0 0-10.666667 10.666666v448a10.666667 10.666667 0 0 0 10.666667 10.666667h448a10.666667 10.666667 0 0 0 10.666666-10.666667V181.333333a10.666667 10.666667 0 0 0-10.666666-10.666666H394.666667z m245.333333 597.333333a32 32 0 0 1 64 0v74.666667a74.666667 74.666667 0 0 1-74.666667 74.666666H181.333333a74.666667 74.666667 0 0 1-74.666666-74.666666V394.666667a74.666667 74.666667 0 0 1 74.666666-74.666667h74.666667a32 32 0 0 1 0 64h-74.666667a10.666667 10.666667 0 0 0-10.666666 10.666667v448a10.666667 10.666667 0 0 0 10.666666 10.666666h448a10.666667 10.666667 0 0 0 10.666667-10.666666v-74.666667z" fill="#000000" p-id="1631"></path></svg>
      </a>`,
    ].join('')

    this.createImageBar()
  }

  createImageBar() {
    this.domNode = document.createElement('div')
    this.domNode.className = 'ql-image-bar'
    this.domNode.innerHTML = this.template
    // 下载图片
    const imageDownload = this.domNode.querySelector('a.ql-image-download')
    if (imageDownload) {
      imageDownload.addEventListener('click', (event) => {
        this.operateImage(event, 'download')
      })
    }
    // 复制图片
    const imageCopy = this.domNode.querySelector('a.ql-image-copy')
    if (imageCopy) {
      imageCopy.addEventListener('click', (event) => {
        this.operateImage(event, 'copy')
      })
    }

    this.setPosition()
    this.quill.root.parentNode.appendChild(this.domNode)
  }

  destroy() {
    if (this.domNode) {
      this.domNode.remove()
      this.domNode = null
      this.image = null
    }
  }

  async operateImage(event, operate) {
    event.preventDefault()
    // const imageId = this.image.dataset.id || ''
    const imageName = this.image.dataset.title || ''
    const imageDownloadUrl = this.image.src || ''
    // if (imageId) {
    //   this.quill.emitter.emit('image-change', {
    //     operation: operate,
    //     data: { imageId, imageDownloadUrl },
    //   })
    // }
    if (operate === 'download') {
      try {
        const a = document.createElement('a')
        a.href = imageDownloadUrl
        a.target = '_blank'
        a.id = 'exppub'
        a.download = imageName
        document.body.appendChild(a)
        const alink = document.getElementById('exppub')
        alink.click()
        alink.parentNode.removeChild(a)
      }
      catch (_e) {
        throw new Error('Download image failed')
      }
    }
    else if (operate === 'copy') {
      const imageUrl = this.image.src
      try {
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error('Copy image failed')
        }
        const blob = await response.blob()
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      }
      catch (_e) {
        throw new Error('Copy image failed')
      }
    }
    this.destroy()
  }

  setPosition() {
    if (this.domNode && this.image) {
      const parent = this.quill.root.parentNode
      const containerRect = parent.getBoundingClientRect()
      const imageRect = this.image.getBoundingClientRect()
      this.css(this.domNode, {
        left: `${imageRect.left + imageRect.width - containerRect.left - 92}px`,
        top: `${imageRect.top - containerRect.top}px`,
      })
    }
  }

  css(domNode, rules) {
    if (typeof rules === 'object') {
      for (const prop in rules) {
        if (prop) {
          if (Array.isArray(rules[prop])) {
            // 兼容IE11浏览器
            rules[prop].forEach((val) => {
              domNode.style[prop] = val
            })
          }
          else {
            domNode.style[prop] = rules[prop]
          }
        }
      }
    }
  }
}