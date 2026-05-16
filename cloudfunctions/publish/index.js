const cloud = require('wx-server-sdk')
const https = require('https')
const http = require('http')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const imagesCollection = db.collection('images')

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`下载图片失败，状态码: ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', (chunk) => { chunks.push(chunk) })
      res.on('end', () => { resolve(Buffer.concat(chunks)) })
    }).on('error', reject)
  })
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { name } = event

  try {
    if (name === 'publish') {
      const { imageUrl, prompt } = event
      if (!imageUrl || !prompt) {
        return { code: -1, message: '缺少必要参数', data: null }
      }

      const buffer = await downloadBuffer(imageUrl)

      const timestamp = Date.now()
      const cloudPath = `images/${openid}_${timestamp}.png`

      const uploadRes = await cloud.uploadFile({
        cloudPath,
        fileContent: buffer,
      })

      const { data: users } = await db.collection('users')
        .where({ _openid: openid })
        .get()

      const user = users[0] || {}
      const nickName = user.nickName || ''
      const avatarUrl = user.avatarUrl || ''

      const record = {
        _openid: openid,
        imageUrl: uploadRes.fileID,
        prompt,
        nickName,
        avatarUrl,
        likes: 0,
        createTime: db.serverDate(),
      }

      const addRes = await imagesCollection.add({ data: record })

      await db.collection('users').doc(user._id).update({
        data: { 'stats.works': db.command.inc(1) },
      })

      return {
        code: 0,
        message: '发布成功',
        data: {
          _id: addRes._id,
          imageUrl: uploadRes.fileID,
          prompt,
        },
      }
    }

    if (name === 'getMyImages') {
      const { page = 0, pageSize = 10 } = event
      const skip = page * pageSize

      const countRes = await imagesCollection
        .where({ _openid: openid })
        .count()

      const { data: list } = await imagesCollection
        .where({ _openid: openid })
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()

      return {
        code: 0,
        message: '获取成功',
        data: {
          list,
          total: countRes.total,
          hasMore: skip + list.length < countRes.total,
        },
      }
    }

    if (name === 'getAllImages') {
      const { page = 0, pageSize = 10 } = event
      const skip = page * pageSize

      const countRes = await imagesCollection.count()

      const { data: list } = await imagesCollection
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()

      return {
        code: 0,
        message: '获取成功',
        data: {
          list,
          total: countRes.total,
          hasMore: skip + list.length < countRes.total,
        },
      }
    }

    return { code: -1, message: `未知的操作类型: ${name}`, data: null }
  } catch (err) {
    return { code: -1, message: err.message || '操作失败', data: null }
  }
}
