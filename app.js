// app.js
App({
  onLaunch: async function() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    
    try {
      wx.cloud.init({
        env: 'cloudbase-9gquqbuz52cc02cb',  // 正确的云开发环境 ID
        traceUser: true,
      });
    } catch (err) {
      console.error('云环境初始化失败：', err);
      wx.showToast({
        title: '云环境初始化失败',
        icon: 'none'
      });
    }

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo;
              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res);
              }
            }
          });
        }
      }
    });

    this.globalData = {
      userInfo: null,
      env: 'cloudbase-9gquqbuz52cc02cb'
    };
  },
  
  globalData: {
    userInfo: null,
    env: 'cloudbase-9gquqbuz52cc02cb'
  },

  // 全局分享到微信好友
  onShareAppMessage(res) {
    // 如果是从按钮分享，可以获取按钮信息
    if (res.from === 'button') {
      console.log('按钮分享：', res.target)
    }
    
    return {
      title: '喜刷刷 - 面试题库',
      path: '/pages/index/index',
      imageUrl: '' // 可选：分享图片
    }
  },

  // 全局分享到朋友圈（需要基础库2.11.3+）
  onShareTimeline(res) {
    return {
      title: '喜刷刷 - 面试题库，助你轻松通过面试！',
      imageUrl: '' // 可选：分享图片
    }
  }
}); 