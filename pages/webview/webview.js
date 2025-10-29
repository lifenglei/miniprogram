Page({
  data: {
    url: ''
  },

  onLoad(options) {
    const { url } = options
    if (url) {
      this.setData({
        url: decodeURIComponent(url)
      })
    } else {
      wx.showToast({
        title: '页面地址错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onShareAppMessage() {
    return {
      title: 'AI简历生成器',
      path: '/pages/webview/webview?url=' + encodeURIComponent(this.data.url)
    }
  }
})
