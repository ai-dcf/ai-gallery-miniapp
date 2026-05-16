const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const usersCollection = db.collection('users')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { avatarUrl, nickName } = event

  try {
    const { data: existUser } = await usersCollection
      .where({ _openid: openid })
      .get()

    if (existUser.length === 0) {
      return {
        code: -1,
        message: '用户不存在，请先登录',
        data: null,
      }
    }

    const updateData = {}
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (nickName !== undefined) updateData.nickName = nickName

    if (Object.keys(updateData).length === 0) {
      return {
        code: -1,
        message: '没有需要更新的字段',
        data: null,
      }
    }

    await usersCollection.doc(existUser[0]._id).update({
      data: updateData,
    })

    return {
      code: 0,
      message: '更新成功',
      data: {
        avatarUrl: avatarUrl !== undefined ? avatarUrl : existUser[0].avatarUrl,
        nickName: nickName !== undefined ? nickName : existUser[0].nickName,
      },
    }
  } catch (err) {
    return {
      code: -1,
      message: '更新失败: ' + err.message,
      data: null,
    }
  }
}
