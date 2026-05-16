const app = getApp<IAppOption>()

Component({
  data: {
    galleryList: [] as Array<{
      _id: string
      imageUrl: string
      prompt: string
      avatarUrl: string
      nickName: string
    }>,
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 0,
    pageSize: 10,
  },

  lifetimes: {
    attached() {
      this.loadGalleryList()
    },
  },

  pageLifetimes: {
    show() {
      if (this.data.galleryList.length > 0 && !this.data.loading) {
        this.refreshList()
      }
    },
  },

  methods: {
    async loadGalleryList() {
      this.setData({ loading: true })
      try {
        const res = await wx.cloud.callFunction({
          name: 'publish',
          data: {
            name: 'getAllImages',
            page: 0,
            pageSize: this.data.pageSize,
          },
        }) as any

        if (res.result.code === 0) {
          const list = res.result.data.list || []
          this.setData({
            galleryList: list.map((item: any) => ({
              _id: item._id,
              imageUrl: item.imageUrl,
              prompt: item.prompt,
              avatarUrl: item.avatarUrl || '',
              nickName: item.nickName || '匿名用户',
            })),
            loading: false,
            page: 1,
            hasMore: res.result.data.hasMore,
          })
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      } catch (err) {
        console.error('loadGalleryList error:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    },

    async refreshList() {
      try {
        const res = await wx.cloud.callFunction({
          name: 'publish',
          data: {
            name: 'getAllImages',
            page: 0,
            pageSize: this.data.pageSize,
          },
        }) as any

        if (res.result.code === 0) {
          const list = res.result.data.list || []
          this.setData({
            galleryList: list.map((item: any) => ({
              _id: item._id,
              imageUrl: item.imageUrl,
              prompt: item.prompt,
              avatarUrl: item.avatarUrl || '',
              nickName: item.nickName || '匿名用户',
            })),
            page: 1,
            hasMore: res.result.data.hasMore,
          })
        }
      } catch (err) {
        console.error('refreshList error:', err)
      }
    },

    async onLoadMore() {
      if (this.data.loadingMore || !this.data.hasMore) return
      this.setData({ loadingMore: true })

      try {
        const nextPage = this.data.page
        const res = await wx.cloud.callFunction({
          name: 'publish',
          data: {
            name: 'getAllImages',
            page: nextPage,
            pageSize: this.data.pageSize,
          },
        }) as any

        if (res.result.code === 0) {
          const list = res.result.data.list || []
          const newItems = list.map((item: any) => ({
            _id: item._id,
            imageUrl: item.imageUrl,
            prompt: item.prompt,
            avatarUrl: item.avatarUrl || '',
            nickName: item.nickName || '匿名用户',
          }))
          this.setData({
            galleryList: [...this.data.galleryList, ...newItems],
            loadingMore: false,
            page: nextPage + 1,
            hasMore: res.result.data.hasMore,
          })
        } else {
          this.setData({ loadingMore: false })
        }
      } catch (err) {
        console.error('onLoadMore error:', err)
        this.setData({ loadingMore: false })
      }
    },

    onImageTap(e: any) {
      const { id } = e.currentTarget.dataset
      const item = this.data.galleryList.find(g => g._id === id)
      if (item && item.imageUrl) {
        wx.previewImage({
          current: item.imageUrl,
          urls: [item.imageUrl],
        })
      }
    },

    onFabTap() {
      wx.navigateTo({ url: '/pages/create/create' })
    },

    onScrollToLower() {
      this.onLoadMore()
    },
  },
})
