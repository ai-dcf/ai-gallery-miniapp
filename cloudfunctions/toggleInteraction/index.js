const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const imagesCollection = db.collection('images')
const imageLikeCollection = db.collection('image_like')
const imageCollectCollection = db.collection('image_collect')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, imageId } = event

  if (!imageId) {
    return { code: -1, message: '缺少图片id', data: null }
  }

  if (action !== 'like' && action !== 'collect') {
    return { code: -1, message: 'action参数仅支持like或collect', data: null }
  }

  const isLike = action === 'like'
  const targetCollection = isLike ? imageLikeCollection : imageCollectCollection
  const countField = isLike ? 'like_count' : 'collect_count'

  try {
    const { data: existing } = await targetCollection
      .where({ _openid: openid, imageId: imageId })
      .get()

    if (existing.length > 0) {
      await targetCollection.doc(existing[0]._id).remove()
      await imagesCollection.doc(imageId).update({
        data: { [countField]: _.inc(-1) },
      })
      return {
        code: 0,
        message: isLike ? '取消点赞成功' : '取消收藏成功',
        data: { active: false, action },
      }
    } else {
      await targetCollection.add({
        data: {
          _openid: openid,
          imageId: imageId,
          timestamp: db.serverDate(),
        },
      })
      await imagesCollection.doc(imageId).update({
        data: { [countField]: _.inc(1) },
      })
      return {
        code: 0,
        message: isLike ? '点赞成功' : '收藏成功',
        data: { active: true, action },
      }
    }
  } catch (err) {
    return { code: -1, message: err.message || '操作失败', data: null }
  }
}
