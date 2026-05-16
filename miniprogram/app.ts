App<IAppOption>({
  globalData: {
    userInfo: undefined,
    openid: '',
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud-test-d6glt9z3i76cbdb21',
      traceUser: true,
    })
  },
})
