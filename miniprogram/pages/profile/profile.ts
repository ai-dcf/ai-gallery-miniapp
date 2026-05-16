const app = getApp<IAppOption>()

Component({
  data: {
    isLoggedIn: false,
    isLoading: true,
    isSubmitting: false,
    showEditModal: false,
    editAvatarUrl: '',
    editNickName: '',
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
      if (!this.data.isLoggedIn && !this.data.showEditModal) {
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
              showEditModal: true,
              editAvatarUrl: '',
              editNickName: '',
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

    onWechatLogin() {
      this.setData({ isLoading: true })
      this.autoLogin()
    },

    onEditProfile() {
      this.setData({
        showEditModal: true,
        editAvatarUrl: '',
        editNickName: this.data.userInfo.nickName,
      })
    },

    onOverlayTap(e: any) {
      if (e.target.dataset.role !== 'overlay') {
        return
      }
      this.onCloseEditModal()
    },

    onCloseEditModal() {
      if (!this.data.isLoggedIn) {
        return
      }
      this.setData({
        showEditModal: false,
        editAvatarUrl: '',
        editNickName: '',
      })
    },

    onEditChooseAvatar(e: any) {
      this.setData({ editAvatarUrl: e.detail.avatarUrl })
    },

    onEditNickNameInput(e: any) {
      this.setData({ editNickName: e.detail.value })
    },

    async onSubmitEditProfile() {
      const { editNickName, editAvatarUrl } = this.data
      if (!editNickName.trim()) {
        wx.showToast({ title: '请输入昵称', icon: 'none' })
        return
      }

      this.setData({ isSubmitting: true })

      try {
        let cloudAvatarUrl = this.data.userInfo.avatarUrl

        if (editAvatarUrl && (editAvatarUrl.startsWith('http://tmp/') || editAvatarUrl.startsWith('wxfile://'))) {
          const ext = editAvatarUrl.split('.').pop() || 'png'
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: `avatars/${app.globalData.openid}.${ext}`,
            filePath: editAvatarUrl,
          })
          cloudAvatarUrl = uploadRes.fileID
        } else if (editAvatarUrl) {
          cloudAvatarUrl = editAvatarUrl
        }

        if (!cloudAvatarUrl) {
          this.setData({ isSubmitting: false })
          wx.showToast({ title: '请选择头像', icon: 'none' })
          return
        }

        const updateRes = await wx.cloud.callFunction({
          name: 'updateUserInfo',
          data: {
            avatarUrl: cloudAvatarUrl,
            nickName: editNickName.trim(),
          },
        }) as any

        if (updateRes.result.code === 0) {
          app.globalData.userInfo = {
            avatarUrl: cloudAvatarUrl,
            nickName: editNickName.trim(),
          }
          this.setData({
            isLoggedIn: true,
            showEditModal: false,
            isSubmitting: false,
            userInfo: {
              avatarUrl: cloudAvatarUrl,
              nickName: editNickName.trim(),
            },
            editAvatarUrl: '',
            editNickName: '',
          })
          wx.showToast({ title: '保存成功', icon: 'success' })
        } else {
          this.setData({ isSubmitting: false })
          wx.showToast({ title: updateRes.result.message || '保存失败', icon: 'none' })
        }
      } catch (err) {
        console.error('submitEditProfile error:', err)
        this.setData({ isSubmitting: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
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
          showEditModal: false,
          userInfo: { avatarUrl: '', nickName: '' },
          stats: { works: 0, likes: 0, favorites: 0 },
          myGallery: [],
          editAvatarUrl: '',
          editNickName: '',
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
