import Message from 'tdesign-miniprogram/message/index'

const STYLE_TAGS = [
  { label: '写实', icon: '🎨', selected: false },
  { label: '动漫', icon: '🌸', selected: false },
  { label: '电影感', icon: '🎬', selected: false },
  { label: '梦幻', icon: '✨', selected: false },
  { label: '油画', icon: '🖌️', selected: false },
  { label: '水彩', icon: '💧', selected: false },
]

const STYLE_LABELS = STYLE_TAGS.map(t => t.label)

const POLL_INTERVAL = 3000
const MAX_POLL_COUNT = 60

type CreateState = 'input' | 'generating' | 'complete'

Component({
  data: {
    currentState: 'input' as CreateState,
    prompt: '',
    negativePrompt: '',
    styleTags: STYLE_TAGS,
    generatedImageUrl: '',
    progress: 0,
    taskId: '',
    pollCount: 0,
  },

  _pollTimer: null as ReturnType<typeof setInterval> | null,
  _progressTimer: null as ReturnType<typeof setInterval> | null,

  methods: {
    onPromptChange(e: any) {
      this.setData({ prompt: e.detail.value })
    },

    onNegativePromptChange(e: any) {
      this.setData({ negativePrompt: e.detail.value })
    },

    onStyleTagTap(e: any) {
      const { index } = e.currentTarget.dataset
      const tags = this.data.styleTags.slice()
      tags[index].selected = !tags[index].selected
      const selectedStyles = tags
        .filter(t => t.selected)
        .map(t => t.label)
        .join('、')
      const currentPrompt = this.data.prompt
      const stylePattern = STYLE_LABELS.join('|')
      const basePrompt = currentPrompt.replace(new RegExp(`[,，]\\s*(?:${stylePattern})(?:[,，]\\s*(?:${stylePattern}))*$`), '').trim()
      this.setData({
        styleTags: tags,
        prompt: selectedStyles ? `${basePrompt}${basePrompt ? '，' : ''}${selectedStyles}` : basePrompt,
      })
    },

    async onGenerate() {
      if (!this.data.prompt.trim()) {
        this.showMessage('请输入画面描述', 'warning')
        return
      }

      this.setData({
        currentState: 'generating',
        progress: 0,
        taskId: '',
        pollCount: 0,
      })

      this.startProgressSimulation()

      try {
        const res = await wx.cloud.callFunction({
          name: 'text2image',
          data: {
            name: 'create',
            prompt: this.data.prompt,
            negativePrompt: this.data.negativePrompt,
            size: '1280*1280',
            n: 1,
          },
        })

        const result: any = res.result
        if (result.code !== 0) {
          this.onGenerateError(result.message || '创建任务失败')
          return
        }

        if (result.data.finished && result.data.images && result.data.images.length > 0) {
          this.onGenerateSuccess(result.data.images[0])
          return
        }

        this.setData({ taskId: result.data.taskId })
        this.startPolling()
      } catch (err: any) {
        this.onGenerateError(err.message || '调用云函数失败')
      }
    },

    startProgressSimulation() {
      this._progressTimer = setInterval(() => {
        const current = this.data.progress
        if (current < 90) {
          const increment = Math.random() * 3 + 1
          this.setData({ progress: Math.min(Math.round(current + increment), 90) })
        }
      }, 1000)
    },

    stopProgressSimulation() {
      if (this._progressTimer) {
        clearInterval(this._progressTimer)
        this._progressTimer = null
      }
    },

    startPolling() {
      this.setData({ pollCount: 0 })
      this._pollTimer = setInterval(() => {
        this.pollTaskResult()
      }, POLL_INTERVAL)
    },

    stopPolling() {
      if (this._pollTimer) {
        clearInterval(this._pollTimer)
        this._pollTimer = null
      }
    },

    async pollTaskResult() {
      const pollCount = this.data.pollCount + 1
      this.setData({ pollCount })

      if (pollCount > MAX_POLL_COUNT) {
        this.stopPolling()
        this.stopProgressSimulation()
        this.onGenerateError('生成超时，请重试')
        return
      }

      try {
        const res = await wx.cloud.callFunction({
          name: 'text2image',
          data: {
            name: 'query',
            taskId: this.data.taskId,
          },
        })

        const result: any = res.result

        if (result.code !== 0 && result.data && result.data.taskStatus === 'FAILED') {
          this.stopPolling()
          this.stopProgressSimulation()
          this.onGenerateError(result.message || '生成失败')
          return
        }

        if (result.code === 0 && result.data.finished) {
          this.stopPolling()
          if (result.data.images && result.data.images.length > 0) {
            this.onGenerateSuccess(result.data.images[0])
          } else {
            this.onGenerateError('未获取到生成结果')
          }
        }
      } catch (err: any) {
        this.stopPolling()
        this.stopProgressSimulation()
        this.onGenerateError(err.message || '查询结果失败')
      }
    },

    onGenerateSuccess(imageUrl: string) {
      this.stopProgressSimulation()
      this.setData({
        currentState: 'complete',
        progress: 100,
        generatedImageUrl: imageUrl,
      })
    },

    onGenerateError(message: string) {
      this.stopPolling()
      this.stopProgressSimulation()
      this.setData({
        currentState: 'input',
        progress: 0,
      })
      this.showMessage(message, 'error')
    },

    onRegenerate() {
      this.stopPolling()
      this.stopProgressSimulation()
      this.setData({
        currentState: 'input',
        progress: 0,
        generatedImageUrl: '',
        taskId: '',
        pollCount: 0,
      })
    },

    onInspirationTap() {
      this.showMessage('灵感推荐功能开发中', 'info')
    },

    showMessage(content: string, type: string) {
      const themeMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
        info: 'info',
        success: 'success',
        warning: 'warning',
        error: 'error',
      }
      const theme = themeMap[type] || 'info'
      Message[theme]({
        context: this,
        selector: '#t-message',
        content,
        duration: 2000,
      })
    },
  },

  detached() {
    this.stopPolling()
    this.stopProgressSimulation()
  },
})
