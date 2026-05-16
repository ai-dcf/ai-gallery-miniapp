const app = getApp<IAppOption>()

Component({
  data: {
    isLoggedIn: false,
    isLoading: true,
    isSubmitting: false,
    showProfileForm: false,
    tempAvatarUrl: '',
    nickName: '',
    userInfo: {
      avatarUrl: '',
      nickName: '',
    },
    stats: {
      works: 0,
      likes: 0,
      favorites: 0,
    },
    myGallery: [] as string[],
  },

  lifetimes: {
    attached() {
      this.autoLogin()
    },
  },

  pageLifetimes: {
    show() {
      if (!this.data.isLoggedIn) {
        this.autoLogin()
      }
    },
  },

  methods: {
    async autoLogin() {
      try {
        const res = await wx.cloud.callFunction({
          name: 'login',
        }) as any

        if (res.result.code === 0) {
          const userData = res.result.data
          app.globalData.openid = userData.openid

          if (userData.nickName && userData.avatarUrl) {
            app.globalData.userInfo = {
              avatarUrl: userData.avatarUrl,
              nickName: userData.nickName,
            }
            this.setData({
              isLoggedIn: true,
              isLoading: false,
              userInfo: {
                avatarUrl: userData.avatarUrl,
                nickName: userData.nickName,
              },
              stats: userData.stats || { works: 0, likes: 0, favorites: 0 },
            })
          } else {
            this.setData({
              isLoading: false,
              showProfileForm: true,
            })
          }
        } else {
          this.setData({ isLoading: false })
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        }
      } catch (err) {
        console.error('autoLogin error:', err)
        this.setData({ isLoading: false })
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    },

    onChooseAvatar(e: any) {
      const avatarUrl = e.detail.avatarUrl
      this.setData({ tempAvatarUrl: avatarUrl })
    },

    onNicknameInput(e: any) {
      this.setData({ nickName: e.detail.value })
    },

    async onSubmitProfile() {
      if (!this.data.tempAvatarUrl) {
        wx.showToast({ title: '请选择头像', icon: 'none' })
        return
      }
      if (!this.data.nickName.trim()) {
        wx.showToast({ title: '请输入昵称', icon: 'none' })
        return
      }

      this.setData({ isSubmitting: true })

      try {
        let cloudAvatarUrl = this.data.tempAvatarUrl

        if (this.data.tempAvatarUrl.startsWith('http://tmp/') || this.data.tempAvatarUrl.startsWith('wxfile://')) {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: `avatars/${app.globalData.openid}_${Date.now()}.png`,
            filePath: this.data.tempAvatarUrl,
          })
          cloudAvatarUrl = uploadRes.fileID
        }

        const updateRes = await wx.cloud.callFunction({
          name: 'updateUserInfo',
          data: {
            avatarUrl: cloudAvatarUrl,
            nickName: this.data.nickName.trim(),
          },
        }) as any

        if (updateRes.result.code === 0) {
          const finalAvatarUrl = cloudAvatarUrl
          const finalNickName = this.data.nickName.trim()

          app.globalData.userInfo = {
            avatarUrl: finalAvatarUrl,
            nickName: finalNickName,
          }

          this.setData({
            isLoggedIn: true,
            showProfileForm: false,
            isSubmitting: false,
            userInfo: {
              avatarUrl: finalAvatarUrl,
              nickName: finalNickName,
            },
          })

          wx.showToast({ title: '登录成功', icon: 'success' })
        } else {
          this.setData({ isSubmitting: false })
          wx.showToast({ title: updateRes.result.message || '保存失败', icon: 'none' })
        }
      } catch (err) {
        console.error('submitProfile error:', err)
        this.setData({ isSubmitting: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    },

    onWechatLogin() {
      this.setData({ showProfileForm: true })
    },

    async onLogout() {
      const res = await wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
      })

      if (res.confirm) {
        app.globalData.userInfo = undefined
        app.globalData.openid = ''
        this.setData({
          isLoggedIn: false,
          showProfileForm: false,
          userInfo: { avatarUrl: '', nickName: '' },
          stats: { works: 0, likes: 0, favorites: 0 },
          myGallery: [],
          tempAvatarUrl: '',
          nickName: '',
        })
      }
    },

    onGalleryItemTap(e: any) {
      const { index } = e.currentTarget.dataset
      console.log('gallery item tap:', index)
    },

    onViewAllTap() {
      console.log('view all')
    },

    onCreateTap() {
      wx.navigateTo({ url: '/pages/create/create' })
    },

    onHistoryTap() {
      console.log('history')
    },

    onPrivacyTap() {
      console.log('privacy')
    },

    onHelpTap() {
      console.log('help')
    },
  },
})
