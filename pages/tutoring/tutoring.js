Page({
  data: {
    loading: false,
    services: [],
    activeTab: 'package', // 'package' 套餐内容, 'process' 服务流程, 'about' 关于我
    packageImage: 'cloud://cloudbase-9gquqbuz52cc02cb.636c-cloudbase-9gquqbuz52cc02cb-1368180148/offer.jpg', // 套餐内容图片地址
    processImage: 'cloud://cloudbase-9gquqbuz52cc02cb.636c-cloudbase-9gquqbuz52cc02cb-1368180148/liucheng.jpeg', // 服务流程图片地址
    aboutMe: {
      title: '关于我',
      content: '9年+前端开发经验，曾就职阿里巴巴 腾讯 360 头部互联网公司，目前就职于外企，担任前端技术专家，擅长性能优化和项目架构以及前端面试辅导，辅导学员400+ 拿到心仪offer',
      highlights: [
        '9年+前端开发经验',
        '曾就职阿里巴巴、腾讯、360等头部互联网公司',
        '目前就职于外企，担任前端技术专家',
        '擅长性能优化和项目架构',
        '专业前端面试辅导',
        '辅导学员400+ 拿到心仪offer'
      ],
      companies: [
        {
          name: '阿里巴巴',
          logo: 'cloud://cloudbase-9gquqbuz52cc02cb.636c-cloudbase-9gquqbuz52cc02cb-1368180148/ali.png'
        },
        {
          name: '腾讯',
          logo: 'cloud://cloudbase-9gquqbuz52cc02cb.636c-cloudbase-9gquqbuz52cc02cb-1368180148/tx.png'
        },
        {
          name: '360',
          logo: 'cloud://cloudbase-9gquqbuz52cc02cb.636c-cloudbase-9gquqbuz52cc02cb-1368180148/360.png'
        }
      ],
      wechat: 'Snooker-147Club',
      qrCode: 'cloud://cloudbase-9gquqbuz52cc02cb.636c-cloudbase-9gquqbuz52cc02cb-1368180148/erweima.jpg'
    }
  },

  onLoad() {
   
  },



  // 切换tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    
    this.setData({
      activeTab: tab
    })
  },

  onShow() {
    // 页面显示时可以刷新数据
  },


  

  // 图片加载错误处理
  onImageError(e) {
    console.error('图片加载失败：', e)
    wx.showToast({
      title: '图片加载失败',
      icon: 'none',
      duration: 2000
    })
  },

  // 复制微信号
  copyWechat(e) {
    const wechat = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showToast({
          title: '微信号已复制',
          icon: 'success',
          duration: 2000
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 预览图片
  previewImage(e) {
    const src = e.currentTarget.dataset.src
    if (!src) return
    
    wx.previewImage({
      current: src,
      urls: [src],
      fail: (err) => {
        console.error('预览图片失败：', err)
        wx.showToast({
          title: '预览失败',
          icon: 'none'
        })
      }
    })
  },

  

  // 页面分享
  onShareAppMessage() {
    return {
      title: '喜刷刷 - 辅导服务',
      path: '/pages/tutoring/tutoring',
      imageUrl: ''
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '喜刷刷 - 专业辅导服务，助你成功',
      imageUrl: ''
    }
  }
})
