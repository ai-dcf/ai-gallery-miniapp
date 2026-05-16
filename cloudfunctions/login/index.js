const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const usersCollection = db.collection('users')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const { data: existUser } = await usersCollection
      .where({ _openid: openid })
      .get()

    if (existUser.length > 0) {
      const user = existUser[0]
      await usersCollection.doc(user._id).update({
        data: {
          lastLoginTime: db.serverDate(),
        },
      })
      return {
        code: 0,
        message: '登录成功',
        data: {
          _id: user._id,
          openid,
          avatarUrl: user.avatarUrl || '',
          nickName: user.nickName || '',
          stats: user.stats || { works: 0, likes: 0, favorites: 0 },
          createTime: user.createTime,
          lastLoginTime: user.lastLoginTime,
          isNewUser: false,
        },
      }
    }

    const newUser = {
      _openid: openid,
      avatarUrl: '',
      nickName: '',
      stats: { works: 0, likes: 0, favorites: 0 },
      createTime: db.serverDate(),
      lastLoginTime: db.serverDate(),
    }

    const addResult = await usersCollection.add({ data: newUser })

    return {
      code: 0,
      message: '注册成功',
      data: {
        _id: addResult._id,
        openid,
        avatarUrl: '',
        nickName: '',
        stats: { works: 0, likes: 0, favorites: 0 },
        createTime: newUser.createTime,
        lastLoginTime: newUser.lastLoginTime,
        isNewUser: true,
      },
    }
  } catch (err) {
    return {
      code: -1,
      message: '登录失败: ' + err.message,
      data: null,
    }
  }
}
