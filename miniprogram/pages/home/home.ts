const app = getApp<IAppOption>()

interface GalleryItem {
  _id: string
  imageUrl: string
  prompt: string
  avatarUrl: string
  nickName: string
  like_count: number
  collect_count: number
  isLiked: boolean
  isCollected: boolean
}

Component({
  data: {
    galleryList: [] as GalleryItem[],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 0,
    pageSize: 10,
    interactingId: '',
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
            galleryList: list.map((item: any) => this.mapItem(item)),
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
            galleryList: list.map((item: any) => this.mapItem(item)),
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
          const newItems = list.map((item: any) => this.mapItem(item))
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

    mapItem(item: any): GalleryItem {
      return {
        _id: item._id,
        imageUrl: item.imageUrl,
        prompt: item.prompt,
        avatarUrl: item.avatarUrl || '',
        nickName: item.nickName || '匿名用户',
        like_count: item.like_count || 0,
        collect_count: item.collect_count || 0,
        isLiked: !!item.isLiked,
        isCollected: !!item.isCollected,
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

    async onLikeTap(e: any) {
      const { id } = e.currentTarget.dataset
      if (this.data.interactingId) return

      const item = this.data.galleryList.find(g => g._id === id)
      if (!item) return

      this.setData({ interactingId: id })

      const newIsLiked = !item.isLiked
      const newLikeCount = newIsLiked ? item.like_count + 1 : Math.max(0, item.like_count - 1)

      const index = this.data.galleryList.findIndex(g => g._id === id)
      this.setData({
        [`galleryList[${index}].isLiked`]: newIsLiked,
        [`galleryList[${index}].like_count`]: newLikeCount,
      })

      try {
        const res = await wx.cloud.callFunction({
          name: 'toggleInteraction',
          data: { action: 'like', imageId: id },
        }) as any

        if (res.result.code !== 0) {
          this.setData({
            [`galleryList[${index}].isLiked`]: item.isLiked,
            [`galleryList[${index}].like_count`]: item.like_count,
          })
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      } catch (err) {
        console.error('onLikeTap error:', err)
        this.setData({
          [`galleryList[${index}].isLiked`]: item.isLiked,
          [`galleryList[${index}].like_count`]: item.like_count,
        })
        wx.showToast({ title: '网络错误', icon: 'none' })
      } finally {
        this.setData({ interactingId: '' })
      }
    },

    async onCollectTap(e: any) {
      const { id } = e.currentTarget.dataset
      if (this.data.interactingId) return

      const item = this.data.galleryList.find(g => g._id === id)
      if (!item) return

      this.setData({ interactingId: id })

      const newIsCollected = !item.isCollected
      const newCollectCount = newIsCollected ? item.collect_count + 1 : Math.max(0, item.collect_count - 1)

      const index = this.data.galleryList.findIndex(g => g._id === id)
      this.setData({
        [`galleryList[${index}].isCollected`]: newIsCollected,
        [`galleryList[${index}].collect_count`]: newCollectCount,
      })

      try {
        const res = await wx.cloud.callFunction({
          name: 'toggleInteraction',
          data: { action: 'collect', imageId: id },
        }) as any

        if (res.result.code !== 0) {
          this.setData({
            [`galleryList[${index}].isCollected`]: item.isCollected,
            [`galleryList[${index}].collect_count`]: item.collect_count,
          })
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      } catch (err) {
        console.error('onCollectTap error:', err)
        this.setData({
          [`galleryList[${index}].isCollected`]: item.isCollected,
          [`galleryList[${index}].collect_count`]: item.collect_count,
        })
        wx.showToast({ title: '网络错误', icon: 'none' })
      } finally {
        this.setData({ interactingId: '' })
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
