const cloud = require('wx-server-sdk')
const https = require('https')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const BASE_URL = 'dashscope.aliyuncs.com'
const MODEL = 'wan2.6-t2i'

function request(method, path, apiKey, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: `/api/v1${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    }
    if (method === 'POST' && path.includes('image-generation')) {
      options.headers['X-DashScope-Async'] = 'enable'
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('响应解析失败'))
        }
      })
    })

    req.on('error', (e) => { reject(e) })

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

async function createTask(apiKey, { prompt, negativePrompt, size, n }) {
  const body = {
    model: MODEL,
    input: {
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }]
        }
      ]
    },
    parameters: {
      prompt_extend: true,
      watermark: false,
      n: n || 1,
      size: size || '1280*1280',
    }
  }
  if (negativePrompt) {
    body.parameters.negative_prompt = negativePrompt
  }

  const data = await request('POST', '/services/aigc/image-generation/generation', apiKey, body)
  if (data.code) {
    throw new Error(data.message || `创建任务失败: ${data.code}`)
  }
  return data
}

async function queryTask(apiKey, taskId) {
  const data = await request('GET', `/tasks/${taskId}`, apiKey)
  if (data.code) {
    throw new Error(data.message || `查询任务失败: ${data.code}`)
  }
  return data
}

exports.main = async (event, context) => {
  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey) {
    return { code: -1, message: '未配置 DASHSCOPE_API_KEY 环境变量', data: null }
  }

  const { name } = event

  try {
    if (name === 'create') {
      const { prompt, negativePrompt, size, n } = event
      if (!prompt || !prompt.trim()) {
        return { code: -1, message: '提示词不能为空', data: null }
      }

      const result = await createTask(apiKey, { prompt, negativePrompt, size, n })
      const taskStatus = result.output.task_status
      const taskId = result.output.task_id

      if (taskStatus === 'SUCCEEDED' && result.output.choices) {
        const images = result.output.choices
          .flatMap(c => c.message.content)
          .filter(c => c.type === 'image')
          .map(c => c.image)

        return {
          code: 0,
          message: '生成成功',
          data: {
            taskId,
            taskStatus,
            images,
            finished: true,
          },
        }
      }

      return {
        code: 0,
        message: '任务已创建',
        data: {
          taskId,
          taskStatus,
          finished: false,
        },
      }
    }

    if (name === 'query') {
      const { taskId } = event
      if (!taskId) {
        return { code: -1, message: 'taskId 不能为空', data: null }
      }

      const result = await queryTask(apiKey, taskId)
      const taskStatus = result.output.task_status
      const finished = ['SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN'].includes(taskStatus)

      if (taskStatus === 'SUCCEEDED') {
        const images = result.output.choices
          .flatMap(c => c.message.content)
          .filter(c => c.type === 'image')
          .map(c => c.image)

        return {
          code: 0,
          message: '生成完成',
          data: {
            taskId: result.output.task_id,
            taskStatus,
            images,
            finished: true,
          },
        }
      }

      if (taskStatus === 'FAILED') {
        return {
          code: -1,
          message: '生成失败，请重试',
          data: {
            taskId: result.output.task_id,
            taskStatus,
            finished: true,
          },
        }
      }

      return {
        code: 0,
        message: '任务进行中',
        data: {
          taskId: result.output.task_id,
          taskStatus,
          finished: false,
        },
      }
    }

    return { code: -1, message: `未知的操作类型: ${name}`, data: null }
  } catch (err) {
    return { code: -1, message: err.message || '请求失败', data: null }
  }
}
