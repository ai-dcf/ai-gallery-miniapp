/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: {
      avatarUrl: string
      nickName: string
    }
    openid: string
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}
