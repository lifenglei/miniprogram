Page({
  data: {
    reals: [],
    loading: false,
    pdfIcon: 'cloud://cloudbase-9gquqbuz52cc02cb.636c-cloudbase-9gquqbuz52cc02cb-1368180148/PDF.png',
    bannerImage: 'cloud://cloudbase-9gquqbuz52cc02cb.636c-cloudbase-9gquqbuz52cc02cb-1368180148/zbanner.jpeg'
  },

  onLoad() {
    this.resetAndLoad()
  },

  onShow() {
    // 页面显示时可以刷新数据
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.resetAndLoad().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载真题列表
  async loadReals() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('zhenti').get()
      console.log(JSON.stringify(res, null, 2))

      // 从返回的数据中提取 realList 数组
      if (res.data && res.data.length > 0 && res.data[0].realList) {
        const reals = res.data[0].realList.map(item => ({
          id: item.id,
          name: item.name,
          url: item.url
        }))
        
        this.setData({
          reals: reals
        })
      } else {
        this.setData({
          reals: []
        })
      }
    } catch (err) {
      console.error('加载真题失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({
        reals: []
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 点击真题项，打开PDF
  async openPDF(e) {
    const { url } = e.currentTarget.dataset
    if (!url) {
      wx.showToast({
        title: '文件不存在',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    try {
      // 判断是云存储文件ID还是HTTP链接
      console.log(url)
      if (url.startsWith('cloud://')) {
        // 云存储文件，先下载
        const filePath = await this.downloadFile(url)
        
        // 打开PDF文档
        wx.openDocument({
          filePath: filePath,
          fileType: 'pdf',
          success: () => {
            console.log('打开PDF成功')
          },
          fail: (err) => {
            console.error('打开PDF失败：', err)
            wx.showToast({
              title: '打开失败',
              icon: 'none'
            })
          }
        })
      } else {
        // HTTP链接，直接使用web-view或跳转
        wx.showToast({
          title: '请在浏览器中打开',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('下载或打开PDF失败：', err)
      wx.showToast({
        title: err.message || '打开失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 下载文件
  downloadFile(fileId) {
    return new Promise((resolve, reject) => {
      wx.cloud.downloadFile({
        fileID: fileId,
        success: res => {
          resolve(res.tempFilePath)
        },
        fail: err => {
          reject(new Error('文件下载失败'))
        }
      })
    })
  },

  // 重置并加载
  resetAndLoad() {
    this.setData({ reals: [] })
    return this.loadReals()
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '喜刷刷 - 大厂真题',
      path: '/pages/reals/reals',
      imageUrl: ''
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '喜刷刷 - 大厂真题，助你成功',
      imageUrl: ''
    }
  }
})
