import type { ExpandedQuillOptions, Module, Parchment as TypeParchment } from 'quill'
import type { IEditorConfig } from './config/types'
import Quill from 'quill'
import HeaderList from 'quill-header-list'
import { FontStyle, LineHeightStyle, SizeStyle, TextIndentStyle } from './attributors'
import { CHANGE_LANGUAGE_EVENT, defaultLanguage, getListValue, ICONS_CONFIG, inputFile, LANG_CONF } from './config'
import Counter from './counter' // 字符统计
import CustomClipboard from './custom-clipboard' // 粘贴板
import CustomImage from './custom-image/BlotFormatter' // 图片
import { CustomImageSpec } from './custom-image/specs/CustomImageSpec' // 图片拉伸模块
import CustomUploader from './custom-uploader' // 上传
import DividerBlot from './divider' // 分割线
import Emoji from './emoji' // 表情
import FileModule from './file' // 文件
import { FormatPainter } from './format-painter'
import { fullscreenHandler } from './fullscreen/handler'
import Link from './link' // 超链接
import MathliveModule from './mathlive' // latex公式
import MathliveBlot from './mathlive/formats'
import Mention from './mention/Mention' // @提醒
import { Screenshot } from './screenshot'// 截图
import SoftBreak from './soft-break' // 软回车
import Strike from './strike' // 删除线
import CustomSyntax from './syntax' // 代码块高亮
import BetterTable from './table/better-table' // 表格
import Toolbar, { ToolbarTip } from './toolbar' // 工具栏
import { isUndefined } from './utils/is'
import Video from './video' // 视频
// import GlobalLink from './global-link' // 全局链接
// import QuickMenu from './quick-menu' // 快捷菜单
export interface I18NOptions {
  lang: string
  langText: Record<string, string>
}
function resolveLanguageOption(options: Partial<I18NOptions>): I18NOptions {
  if (isUndefined(options.lang)) {
    options.lang = defaultLanguage
  }
  if (!(options.lang in LANG_CONF)) {
    console.warn(`The language ${options.lang} is not supported. Use the default language: ${defaultLanguage}`)
    options.lang = defaultLanguage
  }
  return {
    lang: options.lang,
    langText: Object.assign({}, LANG_CONF[options.lang], options.langText || {}),
  }
}
export class FluentEditor extends Quill {
  isFullscreen: boolean = false
  options: IEditorConfig & ExpandedQuillOptions
  constructor(container: HTMLElement | string, options: IEditorConfig = {}) {
    options = Object.assign(options, resolveLanguageOption(options || {}))
    super(container, options)
  }

  changeLanguage(options: Partial<I18NOptions>) {
    const langOps = resolveLanguageOption(options)
    if (langOps.lang === this.options.lang) return
    this.options.lang = langOps.lang
    this.options.langText = langOps.langText
    this.emitter.emit(CHANGE_LANGUAGE_EVENT, this.options.lang, this.options.langText)
  }
}

const registerModules = function () {
  const Icons = Quill.import('ui/icons')
  Object.entries(ICONS_CONFIG).forEach(([key, icon]) => {
    Icons[key] = icon
  })

  const SnowTheme = Quill.imports['themes/snow'] as typeof Module
  SnowTheme.DEFAULTS = {
    modules: {
      'keyboard': {
        bindings: {
          ...BetterTable.keyboardBindings,
        },
      },
      'toolbar': {
        handlers: {
          ...(SnowTheme.DEFAULTS as Record<string, any>).modules.toolbar.handlers,
          'formula': function () {
            if (!this.quill.isEnabled()) return
            const mathlive = this.quill.getModule('mathlive')
            if (!mathlive) {
              this.quill.theme.tooltip.edit('formula')
            }
            else {
              mathlive.createDialog()
            }
          },
          'undo': function () {
            this.quill.history.undo()
          },
          'redo': function () {
            this.quill.history.redo()
          },
          'better-table': function () {
            this.quill.getModule('better-table').insertTable(3, 3)
          },
          'file': function () {
            const accept = this.quill.options?.uploadOption?.fileAccept
            inputFile.call(this, 'file', accept)
          },
          'image': function () {
            const accept = this.quill.options?.uploadOption?.imageAccept
            inputFile.call(this, 'image', accept)
          },
          'emoji': function () {},
          'fullscreen': fullscreenHandler,
          'list': function (value) {
            const range = this.quill.getSelection()
            const formats = this.quill.getFormat(range)
            const preListValue = Array.isArray(formats.list) ? formats.list[0]?.value : formats.list?.value
            const curListValue = getListValue(value, preListValue)
            // 如果设置list的选区中有表格，判断第一个table-col位置，将表格前的内容设置为list格式
            const lines = this.quill.getLines(range.index, range.length)
            const tableCols = lines.filter(line => line.statics.blotName === 'table-col' && !line.prev)
            if (tableCols.length) {
              let start = range.index
              // 遍历table-col群组，以之获取表格，将表格前选区设置为对应list格式
              tableCols.forEach((item, index) => {
                const table = item.domNode.closest('table.quill-better-table')
                const tableBlot = Quill.find(table) as TypeParchment.Blot
                const tableLength = tableBlot.length()
                const tableStart = this.quill.getIndex(item)
                const tableEnd = tableStart + tableLength
                const beforeTableRangeLength = tableStart - start
                // 在表格前设置列表
                this.quill.setSelection(start, beforeTableRangeLength, Quill.sources.SILENT)
                this.quill.format('list', curListValue, Quill.sources.USER)
                table.parentNode.classList.remove('quill-better-table-selected')
                // 当前表格末尾为下一个选取的开始
                start = tableEnd
                if (index === tableCols.length - 1) {
                  // 将最后一个表格之后所有选区内容设置list格式
                  this.quill.setSelection(tableEnd, range.index + range.length - tableEnd)
                  this.quill.format('list', curListValue, Quill.sources.USER)
                }
              })
            }
            else {
              this.quill.format('list', curListValue, Quill.sources.USER)
            }
          },
          [FormatPainter.toolName]: FormatPainter,
          [Screenshot.toolName]: Screenshot,
          'lineheight': function (value) {
            this.quill.format('line-height', value)
          },
          [HeaderList.toolName]: HeaderList.toolbarHandle,
          'divider': function () {
            const range = this.quill.getSelection(true)
            this.quill.insertText(range.index, '\n', Quill.sources.USER)
            this.quill.insertEmbed(range.index + 1, 'divider', true, Quill.sources.USER)
            this.quill.setSelection(range.index + 2, Quill.sources.SILENT)
          },
        },
      },
      'better-table': {
        operationMenu: {
          color: true,
        },
      },
      'image': {
        specs: [CustomImageSpec],
        overlay: {
          style: {
            border: '1px dashed rgb(68, 68, 68)',
          },
        },
        align: {
          icons: {
            left: '<i class="icon-text-align-left"></i>',
            center: '<i class="icon-text-align-center"></i>',
            right: '<i class="icon-text-align-right"></i>',
          },
        },
      },
      [ToolbarTip.moduleName]: true,
    },
  }

  FluentEditor.register(
    {
      'modules/toolbar': Toolbar,
      'modules/mention': Mention,
      'modules/clipboard': CustomClipboard,
      'modules/uploader': CustomUploader, // 三者关联性最强
      'modules/image': CustomImage, // 三者关联性最强
      'modules/file': FileModule, // 三者关联性最强
      'modules/counter': Counter,
      'modules/emoji-toolbar': Emoji.ToolbarEmoji,
      'modules/emoji-shortname': Emoji.ShortNameEmoji,
      // 'modules/global-link': GlobalLink,//暂未开发
      'modules/link': Link, // 报错
      // 'modules/quickmenu': QuickMenu,//暂未开发
      'modules/syntax': CustomSyntax,
      'modules/mathlive': MathliveModule,
      'modules/divider': DividerBlot,
      [`modules/${ToolbarTip.moduleName}`]: ToolbarTip,
      [`modules/${HeaderList.moduleName}`]: HeaderList,
      // make sure register after `HeaderList`
      'modules/better-table': BetterTable,

      'formats/strike': Strike,
      'formats/softBreak': SoftBreak,
      'formats/video': Video,
      'formats/emoji': Emoji.EmojiBlot,
      'formats/font': FontStyle,
      'formats/size': SizeStyle,
      'formats/line-height': LineHeightStyle,
      'formats/text-indent': TextIndentStyle,
      [`formats/${MathliveBlot.blotName}`]: MathliveBlot,
    },
    true, // 覆盖内部模块
  )

  return FluentEditor
}

export default registerModules()
